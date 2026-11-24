export type KeyValueStore = {
  read(key: string): string | null
  write(key: string, value: string): void
}

/** The value saved under the key, or undefined when nothing readable is there. */
export function readStoredJson(store: KeyValueStore, key: string): unknown {
  const raw = store.read(key)
  if (raw === null) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

export function writeStoredJson(store: KeyValueStore, key: string, value: unknown): void {
  store.write(key, JSON.stringify(value))
}
