import type { KeyValueStore } from '../storage'

/**
 * Reads and writes localStorage directly, so two open editors see each other's saves. Plugin frames
 * get their own persistent localStorage in the desktop app, but in browser clients it can be
 * missing, full or blocked; a value it refuses is kept in memory and serves this session.
 */
export function browserStore(): KeyValueStore {
  const refused = new Map<string, string>()
  return {
    read: (key) => refused.get(key) ?? readStored(key),
    write(key, value) {
      if (writeStored(key, value)) refused.delete(key)
      else refused.set(key, value)
    }
  }
}

function readStored(key: string): string | null {
  try {
    return globalThis.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStored(key: string, value: string): boolean {
  try {
    globalThis.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}
