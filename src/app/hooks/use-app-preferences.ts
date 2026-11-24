import type { ColumnVisibility } from '../../diagram/card-layout'
import type { KeyValueStore } from '../../storage'
import { usePreference } from '../preferences'
import type { ViewMode } from '../state'

export type AppPreferences = {
  readonly view: ViewMode
  readonly visibility: ColumnVisibility
  readonly splitRatio: number
  setView(view: ViewMode): void
  setVisibility(visibility: ColumnVisibility): void
  setSplitRatio(ratio: number): void
}

export function useAppPreferences(store: KeyValueStore): AppPreferences {
  const [view, setView] = usePreference(store, 'view')
  const [visibility, setVisibility] = usePreference(store, 'columns')
  const [splitRatio, setSplitRatio] = usePreference(store, 'splitRatio')
  return { view, visibility, splitRatio, setView, setVisibility, setSplitRatio }
}
