import { displayName } from './keys'
import type { Schema, SourceRange, Table } from './model'

const IDENTIFIER = /"([^"]*)"|[^."]+/g

/** Where a diagram node (a table or a sticky note) is defined in the DBML text. */
export function definitionRange(schema: Schema, nodeKey: string): SourceRange | null {
  const table = schema.tables.find((candidate) => candidate.key === nodeKey)
  if (table) return table.range
  return schema.notes.find((note) => note.key === nodeKey)?.range ?? null
}

/** The best table for a search: an exact name first, then a name that starts with it, then any. */
export function findTable(tables: readonly Table[], query: string): Table | null {
  const needle = query.trim().toLowerCase()
  if (needle === '') return null
  const names = (table: Table): string[] =>
    [table.displayName, table.name, table.alias ?? ''].map((name) => name.toLowerCase())
  return (
    tableByReference(tables, query.trim()) ??
    tables.find((table) => names(table).includes(needle)) ??
    tables.find((table) => names(table).some((name) => name.startsWith(needle))) ??
    tables.find((table) => names(table).some((name) => name.includes(needle))) ??
    null
  )
}

/** The table a DBML reference names, such as `users`, `"users"`, `public.users` or an alias. */
export function tableByReference(tables: readonly Table[], reference: string): Table | null {
  const [name = '', schemaName] = identifiers(reference).reverse()
  const written = displayName(schemaName, name)
  return tables.find((table) => table.displayName === written || table.alias === written) ?? null
}

function identifiers(reference: string): string[] {
  return [...reference.matchAll(IDENTIFIER)].map(([whole, quoted]) => quoted ?? whole)
}
