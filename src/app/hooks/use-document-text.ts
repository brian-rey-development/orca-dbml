import { useCallback, useEffect, useState } from 'preact/hooks'
import type { DocumentSession } from '../../host/editor-host'

export type DocumentText = {
  readonly text: string
  edit(next: string): void
}

export function useDocumentText(
  session: DocumentSession,
  onFlushError: (error: unknown) => void
): DocumentText {
  const [text, setText] = useState(session.value)

  useEffect(() => {
    const subscription = session.onReplace(setText)
    // Catches an outside write that landed between the first render and this subscription.
    setText(session.value)
    return () => subscription.dispose()
  }, [session])

  useFlushWhenHidden(session, onFlushError)

  const edit = useCallback(
    (next: string) => {
      session.change(next)
      setText(next)
    },
    [session]
  )

  return { text, edit }
}

// Orca sends edits after a short pause; when the frame is hidden or unloaded, send them now so a
// switched tab or closed window keeps the last keystrokes.
function useFlushWhenHidden(session: DocumentSession, onError: (error: unknown) => void): void {
  useEffect(() => {
    const flush = (): void => void session.flush().catch(onError)
    const flushWhenHidden = (): void => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', flushWhenHidden)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', flushWhenHidden)
      window.removeEventListener('pagehide', flush)
    }
  }, [session, onError])
}
