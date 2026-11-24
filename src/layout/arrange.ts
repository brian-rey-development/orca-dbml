import { autoLayout, type LayoutInput, type LayoutNode } from './auto-layout'
import { boundsOf, rectAt, type Point } from './geometry'

const PLACEMENT_GAP = 120

/**
 * Keeps every known position and lays out only the nodes that have none, to the right of the
 * placed ones, so adding a table never rearranges the person's diagram.
 */
export function arrange(input: LayoutInput, known: ReadonlyMap<string, Point>): Map<string, Point> {
  const placed = new Map(
    input.nodes.flatMap((node): [string, Point][] => {
      const point = known.get(node.id)
      return point ? [[node.id, point]] : []
    })
  )
  const fresh = input.nodes.filter((node) => !placed.has(node.id))
  layoutBeside(fresh, input, placed).forEach((point, id) => placed.set(id, point))
  return placed
}

function layoutBeside(
  fresh: readonly LayoutNode[],
  input: LayoutInput,
  placed: ReadonlyMap<string, Point>
): Map<string, Point> {
  const freshIds = new Set(fresh.map((node) => node.id))
  const laidOut = autoLayout({
    nodes: fresh,
    links: input.links.filter(({ from, to }) => freshIds.has(from) && freshIds.has(to)),
    clusters: input.clusters
  })
  const placedRects = input.nodes.flatMap((node) => {
    const point = placed.get(node.id)
    return point ? [rectAt(point, node.size)] : []
  })
  const existing = boundsOf(placedRects)
  const dx = existing ? existing.x + existing.width + PLACEMENT_GAP : 0
  const dy = existing ? existing.y : 0
  return new Map([...laidOut].map(([id, point]) => [id, { x: point.x + dx, y: point.y + dy }]))
}
