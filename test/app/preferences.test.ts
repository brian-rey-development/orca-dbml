import { describe, expect, it } from 'vitest'
import { readPreference, writePreference } from '../../src/app/preferences'
import type { KeyValueStore } from '../../src/storage'

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>()
  return { read: (key) => data.get(key) ?? null, write: (key, value) => void data.set(key, value) }
}

/** A store that holds the same saved text under every key. */
function storeHolding(saved: string): KeyValueStore {
  return { read: () => saved, write: () => undefined }
}

describe('preferences', () => {
  it('starts from the defaults and keeps what the person chose', () => {
    const store = memoryStore()
    expect(readPreference(store, 'view')).toBe('split')
    expect(readPreference(store, 'columns')).toBe('all')
    expect(readPreference(store, 'splitRatio')).toBe(0.4)
    writePreference(store, 'view', 'diagram')
    writePreference(store, 'columns', 'keys')
    writePreference(store, 'splitRatio', 0.65)
    expect(readPreference(store, 'view')).toBe('diagram')
    expect(readPreference(store, 'columns')).toBe('keys')
    expect(readPreference(store, 'splitRatio')).toBe(0.65)
  })

  it.each([JSON.stringify('everything'), '0.1', '0.95', '{broken'])(
    'falls back to the defaults when the store holds %s',
    (saved) => {
      const store = storeHolding(saved)
      expect(readPreference(store, 'view')).toBe('split')
      expect(readPreference(store, 'columns')).toBe('all')
      expect(readPreference(store, 'splitRatio')).toBe(0.4)
    }
  )
})
