import { useSyncExternalStore } from 'preact/compat'
import { useCallback, useMemo, useRef } from 'preact/hooks'
import {
  cardContents,
  type CardContents,
  type ColumnVisibility,
  type TextMeasure
} from '../../diagram/card-layout'
import { layoutGraph } from '../../diagram/layout-graph'
import { buildScene, EMPTY_SCENE, type Scene } from '../../diagram/scene'
import type { LayoutInput } from '../../layout/auto-layout'
import type { Point } from '../../layout/geometry'
import type { LayoutMemory } from '../../layout/memory'
import { Placements } from '../../layout/placements'
import type { Schema } from '../../schema/model'

export type DiagramLayout = {
  readonly scene: Scene
  moveNode(key: string, position: Point): void
  saveLayout(): void
  rearrange(): void
}

const NO_CONTENTS: CardContents = { tables: new Map(), notes: new Map() }
const NO_GRAPH: LayoutInput = { nodes: [], links: [], clusters: [] }

export function useDiagramLayout(
  schema: Schema | null,
  visibility: ColumnVisibility,
  measure: TextMeasure,
  memory: LayoutMemory
): DiagramLayout {
  const placements = useMemo(() => new Placements(memory), [memory])
  const revision = useSyncExternalStore(placements.subscribe, placements.revision)
  const contents = useMemo(
    () => (schema ? cardContents(schema, visibility, measure) : NO_CONTENTS),
    [schema, visibility, measure]
  )
  const graph = useMemo(
    () => (schema ? layoutGraph(schema, contents) : NO_GRAPH),
    [schema, contents]
  )
  // `revision` is not read here, but each move or rearrange changes it, so positions resolve again.
  const positions = useMemo(() => placements.resolve(graph), [placements, graph, revision])
  // The last scene is kept so unchanged cards stay the same objects and their memo skips them.
  const previousScene = useRef(EMPTY_SCENE)
  const scene = useMemo(() => {
    previousScene.current = schema
      ? buildScene(schema, contents, positions, previousScene.current)
      : EMPTY_SCENE
    return previousScene.current
  }, [schema, contents, positions])

  const rearrange = useCallback(() => placements.rearrange(graph), [placements, graph])

  return { scene, moveNode: placements.move, saveLayout: placements.save, rearrange }
}
