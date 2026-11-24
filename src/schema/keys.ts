const DEFAULT_SCHEMA = 'public'

/** Saved layouts are filed under this version, so change it whenever the key format changes. */
export const NODE_KEY_FORMAT = 2

/**
 * Keys identify diagram nodes unambiguously. They are not names: a quoted table called "a.b"
 * and table b in schema a both display as `a.b`, yet they are different tables.
 */
export function tableKey(schemaName: string | null | undefined, name: string): string {
  return `table:${JSON.stringify([schemaName ?? DEFAULT_SCHEMA, name])}`
}

export function enumKey(schemaName: string | null | undefined, name: string): string {
  return `enum:${JSON.stringify([schemaName ?? DEFAULT_SCHEMA, name])}`
}

export function noteKey(name: string): string {
  return `note:${JSON.stringify(name)}`
}

export function displayName(schemaName: string | null | undefined, name: string): string {
  return schemaName && schemaName !== DEFAULT_SCHEMA ? `${schemaName}.${name}` : name
}
