import { useCallback, useEffect, useState } from 'preact/hooks'

const NOTICE_DURATION_MS = 4000

/** Each notice is new, so repeating the same message shows it for the full time again. */
type Notice = { readonly message: string }

/** A short status message that clears itself. */
export function useNotice(): readonly [string | null, (message: string) => void] {
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    if (notice === null) return
    const timer = setTimeout(() => setNotice(null), NOTICE_DURATION_MS)
    return () => clearTimeout(timer)
  }, [notice])

  const notify = useCallback((message: string) => setNotice({ message }), [])
  return [notice?.message ?? null, notify]
}
