import { Graph, layout, type EdgeLabel, type GraphLabel, type NodeLabel } from '@dagrejs/dagre'
import { DisjointSet } from './disjoint-set'
import type { Point, Size } from './geometry'
import { shelfPack } from './shelf-pack'

export type LayoutNode = {
  readonly id: string
  readonly size: Size
}

/** A directed link; the layout ranks `from` before `to`, left to right. */
export type LayoutLink = {
  readonly from: string
  readonly to: string
}

/** Node ids the layout keeps together, such as the tables of one DBML group. */
export type LayoutCluster = readonly string[]

export type LayoutInput = {
  readonly nodes: readonly LayoutNode[]
  readonly links: readonly LayoutLink[]
  readonly clusters: readonly LayoutCluster[]
}

type DagreGraph = Graph<GraphLabel, NodeLabel, EdgeLabel>

type Component = {
  readonly positions: ReadonlyMap<string, Point>
  /** The component's extent from the origin, which dagre lays it out from. */
  readonly size: Size
}

const DAGRE_OPTIONS: GraphLabel = {
  rankdir: 'LR',
  nodesep: 40,
  ranksep: 110,
  marginx: 0,
  marginy: 0
}

const COMPONENT_GAP = 96
const NO_SIZE: Size = { width: 0, height: 0 }

/**
 * Lays out each connected part of the graph with dagre, then packs the parts into rows, so
 * unrelated tables fill the canvas instead of stacking into one tall column.
 */
export function autoLayout(input: LayoutInput): Map<string, Point> {
  const components = connectedComponents(input).map((nodes) => layoutComponent(nodes, input))
  return new Map(
    shelfPack(components, COMPONENT_GAP).flatMap(({ item, at }) =>
      [...item.positions].map(([id, point]): [string, Point] => [
        id,
        { x: point.x + at.x, y: point.y + at.y }
      ])
    )
  )
}

function connectedComponents({ nodes, links, clusters }: LayoutInput): LayoutNode[][] {
  const sets = new DisjointSet(nodes.map((node) => node.id))
  links.forEach((link) => sets.union(link.from, link.to))
  clusters.forEach((cluster) => {
    const [first, ...rest] = cluster.filter((member) => sets.has(member))
    if (first !== undefined) rest.forEach((member) => sets.union(first, member))
  })
  const components = new Map<string, LayoutNode[]>()
  nodes.forEach((node) => {
    const root = sets.find(node.id)
    components.set(root, [...(components.get(root) ?? []), node])
  })
  return [...components.values()]
}

// Dagre stores nodes in plain objects, so a table named `constructor` or `__proto__` would break
// it. It only ever sees opaque ids (`n0`, `n1`, …), mapped back afterwards.
function layoutComponent(nodes: readonly LayoutNode[], input: LayoutInput): Component {
  const opaque = new Map(nodes.map((node, index) => [node.id, opaqueId(index)]))
  const graph: DagreGraph = new Graph({ compound: true })
  graph.setGraph({ ...DAGRE_OPTIONS })
  graph.setDefaultEdgeLabel(() => ({}))
  nodes.forEach((node, index) => graph.setNode(opaqueId(index), { ...node.size }))
  addLinks(graph, input.links, opaque)
  addClusters(graph, input.clusters, opaque)
  layout(graph)
  const { width = 0, height = 0 } = graph.graph()
  return {
    positions: new Map(nodes.map((node, index) => [node.id, topLeft(graph.node(opaqueId(index)))])),
    size: { width, height }
  }
}

function opaqueId(index: number): string {
  return `n${index}`
}

function addLinks(
  graph: DagreGraph,
  links: readonly LayoutLink[],
  opaque: ReadonlyMap<string, string>
): void {
  for (const link of links) {
    const from = opaque.get(link.from)
    const to = opaque.get(link.to)
    if (from !== undefined && to !== undefined && from !== to) graph.setEdge(from, to)
  }
}

function addClusters(
  graph: DagreGraph,
  clusters: readonly LayoutCluster[],
  opaque: ReadonlyMap<string, string>
): void {
  const claimed = new Set<string>()
  clusters.forEach((cluster, index) => {
    const members = cluster.flatMap((member) => {
      const node = opaque.get(member)
      return node !== undefined && !claimed.has(node) ? [node] : []
    })
    if (members.length < 2) return
    const clusterNode = `c${index}`
    graph.setNode(clusterNode, { ...NO_SIZE })
    members.forEach((node) => {
      claimed.add(node)
      graph.setParent(node, clusterNode)
    })
  })
}

function topLeft({ x = 0, y = 0, width, height }: NodeLabel): Point {
  return { x: x - width / 2, y: y - height / 2 }
}
