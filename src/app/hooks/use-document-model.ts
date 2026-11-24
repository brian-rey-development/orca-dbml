import { useCallback } from 'preact/hooks'
import type { EditorHost } from '../../host/editor-host'
import type { SchemaCompiler } from '../../schema/compiler'
import type { CompiledSchema } from '../compile-state'
import { useCompiledSchema } from './use-compiled-schema'
import { useDocumentText, type DocumentText } from './use-document-text'

const FLUSH_FAILED =
  'Orca did not accept the latest edits. Keep this tab open and check the file in Source.'

export type DocumentModel = {
  readonly documentText: DocumentText
  readonly compiled: CompiledSchema
}

/** The document's text as the person edits it, and what compiling that text produced. */
export function useDocumentModel(
  host: EditorHost,
  compiler: SchemaCompiler,
  notify: (message: string) => void
): DocumentModel {
  const reportFlushError = useCallback(
    (error: unknown) => {
      console.error('Sending edits to Orca failed', error)
      notify(FLUSH_FAILED)
    },
    [notify]
  )
  const documentText = useDocumentText(host.document, reportFlushError)
  const compiled = useCompiledSchema(documentText.text, compiler)
  return { documentText, compiled }
}
