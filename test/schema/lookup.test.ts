import { describe, expect, it } from 'vitest'
import { compileDbml } from '../../src/schema/compile'
import { noteKey, tableKey } from '../../src/schema/keys'
import { definitionRange, findTable, tableByReference } from '../../src/schema/lookup'

const { schema } = compileDbml(`Table users as U { id int }
Table user_roles { id int }
Table audit.logs { id int }
Note todo { 'Index emails' }`)
const tables = schema?.tables ?? []

describe('findTable', () => {
  it('prefers an exact name, then a prefix, then any match', () => {
    expect(findTable(tables, 'users')?.displayName).toBe('users')
    expect(findTable(tables, 'user_')?.displayName).toBe('user_roles')
    expect(findTable(tables, 'log')?.displayName).toBe('audit.logs')
  })

  it('matches aliases and ignores case', () => {
    expect(findTable(tables, 'u')?.displayName).toBe('users')
    expect(findTable(tables, 'USERS')?.displayName).toBe('users')
  })

  it('finds a table written with its schema, as references write it', () => {
    expect(findTable(tables, 'public.users')?.displayName).toBe('users')
    expect(findTable(tables, 'audit.logs')?.displayName).toBe('audit.logs')
  })

  it('finds nothing for blank or unknown queries', () => {
    expect(findTable(tables, '  ')).toBeNull()
    expect(findTable(tables, 'invoices')).toBeNull()
  })
})

describe('tableByReference', () => {
  it('resolves the names and aliases DBML references use', () => {
    expect(tableByReference(tables, 'U')?.displayName).toBe('users')
    expect(tableByReference(tables, 'audit.logs')?.displayName).toBe('audit.logs')
    expect(tableByReference(tables, 'logs')).toBeNull()
  })

  it('reads quoted names and the default schema the way DBML writes them', () => {
    expect(tableByReference(tables, '"users"')?.displayName).toBe('users')
    expect(tableByReference(tables, 'public.users')?.displayName).toBe('users')
    expect(tableByReference(tables, '"audit"."logs"')?.displayName).toBe('audit.logs')
  })
})

describe('definitionRange', () => {
  it('locates tables and sticky notes', () => {
    if (!schema) throw new Error('expected a schema')
    expect(definitionRange(schema, tableKey(null, 'user_roles'))?.start.line).toBe(2)
    expect(definitionRange(schema, noteKey('todo'))?.start.line).toBe(4)
    expect(definitionRange(schema, 'missing')).toBeNull()
  })
})
