import { useState } from 'preact/hooks'
import type { EditorHost } from '../../host/editor-host'
import type { SchemaCompiler } from '../../schema/compiler'
import type { KeyValueStore } from '../../storage'
import { useAppPreferences, type AppPreferences } from './use-app-preferences'
import { useDiagramModel, type DiagramModel } from './use-diagram-model'
import { useDocumentModel, type DocumentModel } from './use-document-model'
import { useNotice } from './use-notice'

export type AppServices = {
  readonly host: EditorHost
  readonly store: KeyValueStore
  readonly compiler: SchemaCompiler
}

export type AppModel = DocumentModel & {
  readonly host: EditorHost
  readonly notice: string | null
  readonly preferences: AppPreferences
  readonly diagram: DiagramModel
  readonly problemsOpen: boolean
  setProblemsOpen(open: boolean): void
}

/** Everything the editor shows and every way the person can change it. */
export function useAppModel({ host, store, compiler }: AppServices): AppModel {
  const [notice, notify] = useNotice()
  const { documentText, compiled } = useDocumentModel(host, compiler, notify)
  const preferences = useAppPreferences(store)
  const diagram = useDiagramModel({ host, store, compiled, preferences, notify })
  const [problemsOpen, setProblemsOpen] = useState(false)
  return {
    host,
    notice,
    documentText,
    compiled,
    preferences,
    diagram,
    problemsOpen,
    setProblemsOpen
  }
}
