import { useEffect } from 'preact/hooks'
import type { DocumentSession } from '../../host/editor-host'
import type { Diagnostic, Schema } from '../../schema/model'
import { useCodeEditor } from '../hooks/use-code-editor'
import type { RevealRequest } from '../state'

type CodePaneProps = {
  readonly session: DocumentSession
  readonly diagnostics: readonly Diagnostic[]
  readonly schema: Schema | null
  readonly reveal: RevealRequest | null
  readonly onChange: (text: string) => void
}

/**
 * The DBML source in CodeMirror. Outside writes reach the editor straight from the session, never
 * through a render, so a re-render can never put older text back over newer typing.
 */
export function CodePane({ session, diagnostics, schema, reveal, onChange }: CodePaneProps) {
  const { container, editor } = useCodeEditor(session, schema, onChange)

  useEffect(() => editor.current?.setDiagnostics(diagnostics), [diagnostics])
  useEffect(() => {
    if (reveal) editor.current?.reveal(reveal.location)
  }, [reveal])

  return <div class="code-pane" ref={container} />
}
