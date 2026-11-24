import { useMemo } from 'preact/hooks'
import type { TextMeasure } from '../../diagram/card-layout'
import type { DiagramTheme } from '../../diagram/theme'
import type { ExportFormat } from '../../export/diagram-export'
import type { EditorHost } from '../../host/editor-host'
import { LayoutMemory } from '../../layout/memory'
import { NODE_KEY_FORMAT } from '../../schema/keys'
import type { KeyValueStore } from '../../storage'
import type { CompiledSchema } from '../compile-state'
import type { AppPreferences } from './use-app-preferences'
import { useDiagramExport } from './use-diagram-export'
import { useDiagramInteraction, type DiagramInteraction } from './use-diagram-interaction'
import { useDiagramLayout, type DiagramLayout } from './use-diagram-layout'
import { useDiagramTheme } from './use-diagram-theme'

const LAYOUT_STORE_KEY = `dbml.layouts.v${NODE_KEY_FORMAT}`

type DiagramInputs = {
  readonly host: EditorHost
  readonly store: KeyValueStore
  readonly compiled: CompiledSchema
  readonly preferences: AppPreferences
  readonly notify: (message: string) => void
}

export type DiagramModel = DiagramInteraction & {
  readonly theme: DiagramTheme
  readonly measure: TextMeasure
  readonly layout: DiagramLayout
  exportDiagram(format: ExportFormat): Promise<void>
}

/** The diagram as drawn, saved in the store, moved around in and exported. */
export function useDiagramModel(inputs: DiagramInputs): DiagramModel {
  const { host, store, compiled, preferences, notify } = inputs
  const { visibility, setView } = preferences
  const { theme, measure } = useDiagramTheme(host)
  const memory = useMemo(() => new LayoutMemory(store, LAYOUT_STORE_KEY), [store])
  const layout = useDiagramLayout(compiled.schema, visibility, measure, memory)
  const interaction = useDiagramInteraction({ layout, compiled, setView, notify })
  const exportDiagram = useDiagramExport({
    host,
    schema: compiled.schema,
    scene: layout.scene,
    theme,
    measure,
    notify
  })
  return { ...interaction, theme, measure, layout, exportDiagram }
}
