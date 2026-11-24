import { useEffect, useRef } from 'preact/hooks'
import { createCodeEditor, type CodeEditor } from '../../code/code-editor'
import type { DocumentSession } from '../../host/editor-host'
import type { Schema } from '../../schema/model'

type Latest = { readonly current: { schema: Schema | null; onChange: (text: string) => void } }

/** The CodeMirror editor for a session, mounted into `container`; `editor` is null until it is. */
export function useCodeEditor(
  session: DocumentSession,
  schema: Schema | null,
  onChange: (text: string) => void
) {
  const container = useRef<HTMLDivElement>(null)
  const editor = useRef<CodeEditor | null>(null)
  // The editor is created once per session, so its callbacks read the latest props from here.
  const latest = useRef({ schema, onChange })
  latest.current = { schema, onChange }

  useEffect(() => {
    if (!container.current) return
    const mounted = mountEditor(container.current, session, latest)
    editor.current = mounted.editor
    return () => {
      mounted.dispose()
      editor.current = null
    }
  }, [session])

  return { container, editor }
}

function mountEditor(parent: HTMLElement, session: DocumentSession, latest: Latest) {
  const editor = createCodeEditor({
    parent,
    text: session.value,
    readOnly: session.readOnly,
    schema: () => latest.current.schema,
    onChange: (text) => latest.current.onChange(text)
  })
  const subscription = session.onReplace((text) => editor.replaceText(text))
  return {
    editor,
    dispose: () => {
      subscription.dispose()
      editor.destroy()
    }
  }
}
