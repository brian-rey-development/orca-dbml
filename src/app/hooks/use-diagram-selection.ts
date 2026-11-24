import { useCallback, useState } from 'preact/hooks'
import { adjacentTable, type Step } from '../../diagram/navigation'
import type { Scene } from '../../diagram/scene'
import type { Rect } from '../../layout/geometry'
import { definitionRange, findTable } from '../../schema/lookup'
import type { TextLocation } from '../../text/location'
import type { CompiledSchema } from '../compile-state'

type SelectionContext = {
  readonly scene: Scene
  readonly compiled: CompiledSchema
  readonly goTo: (location: TextLocation) => void
  readonly reveal: (target: Rect) => void
  readonly notify: (message: string) => void
}

export type DiagramSelection = {
  /** The selected node, or null; a node that leaves the diagram is no longer selected. */
  readonly selectedKey: string | null
  select(key: string | null): void
  step(step: Step): void
  find(query: string): void
  openDefinition(key: string): void
}

export function useDiagramSelection(context: SelectionContext): DiagramSelection {
  const { scene, compiled, goTo, reveal, notify } = context
  const { selectedKey, select, focus } = useNodeFocus(scene, reveal)
  const step = useTableStepper(scene, selectedKey, focus)

  const find = useCallback(
    (query: string) => {
      const table = findTable(compiled.schema?.tables ?? [], query)
      if (table && scene.nodeRects.has(table.key)) focus(table.key)
      else notify(`No table matches "${query}".`)
    },
    [compiled.schema, scene, focus, notify]
  )

  const openDefinition = useDefinitionOpener(compiled, goTo)
  return { selectedKey, select, step, find, openDefinition }
}

function useNodeFocus(scene: Scene, reveal: (target: Rect) => void) {
  const [chosenKey, setChosenKey] = useState<string | null>(null)
  const selectedKey = chosenKey !== null && scene.nodeRects.has(chosenKey) ? chosenKey : null

  const focus = useCallback(
    (key: string) => {
      setChosenKey(key)
      const rect = scene.nodeRects.get(key)
      if (rect) reveal(rect)
    },
    [scene, reveal]
  )
  return { selectedKey, select: setChosenKey, focus }
}

function useTableStepper(scene: Scene, selectedKey: string | null, focus: (key: string) => void) {
  return useCallback(
    (direction: Step) => {
      const next = adjacentTable(scene, selectedKey, direction)
      if (next !== null) focus(next)
    },
    [scene, selectedKey, focus]
  )
}

function useDefinitionOpener(compiled: CompiledSchema, goTo: (location: TextLocation) => void) {
  return useCallback(
    (key: string) => {
      const range = compiled.schema ? definitionRange(compiled.schema, key) : null
      if (range) goTo(compiled.locateInText(range.start))
    },
    [compiled, goTo]
  )
}
