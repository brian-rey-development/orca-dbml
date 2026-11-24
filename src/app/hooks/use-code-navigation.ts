import { useCallback, useState } from 'preact/hooks'
import type { TextLocation } from '../../text/location'
import type { RevealRequest, ViewMode } from '../state'

export type CodeNavigation = {
  readonly reveal: RevealRequest | null
  /** Shows the code pane and moves its cursor to `location`. */
  goTo(location: TextLocation): void
}

export function useCodeNavigation(setView: (view: ViewMode) => void): CodeNavigation {
  const [reveal, setReveal] = useState<RevealRequest | null>(null)

  const goTo = useCallback(
    (location: TextLocation) => {
      setView('split')
      setReveal((previous) => ({ location, sequence: (previous?.sequence ?? 0) + 1 }))
    },
    [setView]
  )

  return { reveal, goTo }
}
