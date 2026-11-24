import { useCallback, useState } from 'preact/hooks'
import { COLUMN_VISIBILITIES, type ColumnVisibility } from '../diagram/card-layout'
import { readStoredJson, writeStoredJson, type KeyValueStore } from '../storage'
import { MAX_SPLIT, MIN_SPLIT, VIEW_MODES, type ViewMode } from './state'

export type Preferences = {
  readonly view: ViewMode
  readonly columns: ColumnVisibility
  readonly splitRatio: number
}

const DEFAULTS: Preferences = { view: 'split', columns: 'all', splitRatio: 0.4 }

const VALIDATORS: { readonly [Name in keyof Preferences]: (value: unknown) => boolean } = {
  view: (value) => VIEW_MODES.some((mode) => mode === value),
  columns: (value) => COLUMN_VISIBILITIES.some((visibility) => visibility === value),
  splitRatio: (value) => typeof value === 'number' && value >= MIN_SPLIT && value <= MAX_SPLIT
}

const KEY_PREFIX = 'dbml.preference.'

export function readPreference<Name extends keyof Preferences>(
  store: KeyValueStore,
  name: Name
): Preferences[Name] {
  const saved = readStoredJson(store, KEY_PREFIX + name)
  return VALIDATORS[name](saved) ? (saved as Preferences[Name]) : DEFAULTS[name]
}

export function writePreference<Name extends keyof Preferences>(
  store: KeyValueStore,
  name: Name,
  value: Preferences[Name]
): void {
  writeStoredJson(store, KEY_PREFIX + name, value)
}

export function usePreference<Name extends keyof Preferences>(
  store: KeyValueStore,
  name: Name
): readonly [Preferences[Name], (value: Preferences[Name]) => void] {
  const [value, setValue] = useState(() => readPreference(store, name))
  const update = useCallback(
    (next: Preferences[Name]) => {
      setValue(next)
      writePreference(store, name, next)
    },
    [store, name]
  )
  return [value, update]
}
