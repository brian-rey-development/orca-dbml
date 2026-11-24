import { describe, expect, it } from 'vitest'
import { compileDbml } from '../../src/schema/compile'
import { tableKey } from '../../src/schema/keys'
import type { Relation, Schema, Table } from '../../src/schema/model'

function compileSchema(source: string): Schema {
  const { schema, diagnostics } = compileDbml(source)
  expect(diagnostics).toEqual([])
  if (!schema) throw new Error('expected a schema')
  return schema
}

function tableNamed(schema: Schema, displayName: string): Table {
  const table = schema.tables.find((candidate) => candidate.displayName === displayName)
  if (!table) throw new Error(`no table ${displayName}`)
  return table
}

function relationBetween(schema: Schema, from: string, to: string): Relation | undefined {
  return schema.relations.find(
    (relation) =>
      relation.from.tableKey === tableKey(null, from) && relation.to.tableKey === tableKey(null, to)
  )
}

describe('compileDbml', () => {
  it('maps tables, columns and their settings', () => {
    const schema = compileSchema(`
      Table users as U [headercolor: #3498DB, note: 'People'] {
        id int [pk, increment]
        email varchar(255) [not null, unique, note: 'Login']
        created_at timestamp [default: \`now()\`]
        role varchar [default: 'member']
      }`)
    const users = tableNamed(schema, 'users')
    expect(users).toMatchObject({ alias: 'U', color: '#3498DB', note: 'People' })
    expect(users.columns.map((c) => [c.name, c.type])).toEqual([
      ['id', 'int'],
      ['email', 'varchar(255)'],
      ['created_at', 'timestamp'],
      ['role', 'varchar']
    ])
    expect(users.columns[0]).toMatchObject({ primaryKey: true, increment: true })
    expect(users.columns[1]).toMatchObject({ notNull: true, unique: true, note: 'Login' })
    expect(users.columns[2]?.defaultValue).toBe('`now()`')
    expect(users.columns[3]?.defaultValue).toBe("'member'")
  })

  it('writes numeric, boolean and null defaults as DBML does', () => {
    const schema = compileSchema(`
      Table counters { hits int [default: 0]
        enabled bool [default: true]
        parent int [default: null] }`)
    expect(tableNamed(schema, 'counters').columns.map((c) => c.defaultValue)).toEqual([
      '0',
      'true',
      'null'
    ])
  })

  it('treats the columns of a primary key index as primary keys', () => {
    const schema = compileSchema(`
      Table memberships {
        user_id int
        team_id int
        role varchar
        indexes { (user_id, team_id) [pk] }
      }`)
    const keys = tableNamed(schema, 'memberships').columns.filter((c) => c.primaryKey)
    expect(keys.map((c) => c.name)).toEqual(['user_id', 'team_id'])
  })

  it('names tables as DBML writes them and keeps look-alikes apart', () => {
    const schema = compileSchema(`
      Table public.a { id int }
      Table billing.invoices { id int }
      Table "billing.invoices" { id int }`)
    expect(schema.tables.map((table) => table.displayName)).toEqual([
      'a',
      'billing.invoices',
      'billing.invoices'
    ])
    expect(new Set(schema.tables.map((table) => table.key)).size).toBe(3)
  })

  it('orients many-to-one relations from the referencing table to the referenced one', () => {
    const schema = compileSchema(`
      Table users { id int [pk] }
      Table posts {
        id int [pk]
        author_id int [ref: > users.id]
      }
      Table comments { post_id int }
      Ref: posts.id < comments.post_id [delete: cascade]`)
    expect(relationBetween(schema, 'posts', 'users')).toMatchObject({
      kind: 'many-to-one',
      hasForeignKey: true,
      from: { columns: ['author_id'], many: true },
      to: { columns: ['id'], many: false }
    })
    expect(relationBetween(schema, 'comments', 'posts')).toMatchObject({
      kind: 'many-to-one',
      onDelete: 'cascade'
    })
  })

  it('orients one-to-one relations from the end that is not the primary key', () => {
    const schema = compileSchema(`
      Table users { id int [pk] }
      Table profiles {
        id int [pk]
        user_id int [ref: - users.id]
      }`)
    expect(relationBetween(schema, 'profiles', 'users')).toMatchObject({
      kind: 'one-to-one',
      hasForeignKey: true
    })
  })

  it('turns a one-to-one around when it is declared from the primary key side', () => {
    const schema = compileSchema(`
      Table users { id int [pk] }
      Table profiles { user_id int }
      Ref: users.id - profiles.user_id`)
    expect(relationBetween(schema, 'profiles', 'users')).toMatchObject({ hasForeignKey: true })
  })

  it('keeps the declared order of a one-to-one when DBML gives no hint', () => {
    const bothKeys = compileSchema(`
      Table a { id int [pk] }
      Table b { id int [pk] }
      Ref: a.id - b.id`)
    expect(relationBetween(bothKeys, 'a', 'b')).toMatchObject({ hasForeignKey: false })
    const neitherKey = compileSchema(`
      Table a { x int }
      Table b { y int }
      Ref: a.x - b.y`)
    expect(relationBetween(neitherKey, 'a', 'b')).toMatchObject({ hasForeignKey: true })
  })

  it('marks an end optional when its cardinality allows zero', () => {
    const schema = compileSchema(`
      Table a { x int }
      Table b { id int [pk] }
      Ref: a.x >? b.id`)
    const relation = relationBetween(schema, 'a', 'b')
    expect([relation?.from.optional, relation?.to.optional]).toEqual([false, true])
  })

  it('lists problems in the order they appear in the file', () => {
    const { diagnostics } = compileDbml('Table c { id int\n id int }\nTable d { q int')
    const lines = diagnostics.map((diagnostic) => diagnostic.range.start.line)
    expect(lines).toEqual([...lines].sort((a, b) => a - b))
    expect(new Set(lines).size).toBeGreaterThan(1)
  })

  it('gives many-to-many relations no foreign key', () => {
    const schema = compileSchema(`
      Table posts { id int [pk] }
      Table tags { id int [pk] }
      Ref post_tags: posts.id <> tags.id [color: #79AD51]`)
    expect(schema.relations[0]).toMatchObject({
      kind: 'many-to-many',
      hasForeignKey: false,
      name: 'post_tags',
      color: '#79AD51'
    })
  })

  it('marks referencing columns as foreign keys', () => {
    const schema = compileSchema(`
      Table users { id int [pk] }
      Table profiles {
        id int [pk]
        user_id int [ref: - users.id]
      }
      Table posts { author_id int [ref: > users.id] }`)
    const foreignKeys = schema.tables.flatMap((table) =>
      table.columns.filter((c) => c.foreignKey).map((c) => `${table.displayName}.${c.name}`)
    )
    expect(foreignKeys).toEqual(['profiles.user_id', 'posts.author_id'])
  })

  it("gives columns typed by an enum that enum's values", () => {
    const schema = compileSchema(`
      Enum shop.status { active [note: 'Live']
        archived }
      Table shop.orders { state shop.status }`)
    expect(schema.enums[0]).toMatchObject({
      displayName: 'shop.status',
      values: [
        { name: 'active', note: 'Live' },
        { name: 'archived', note: null }
      ]
    })
    expect(tableNamed(schema, 'shop.orders').columns[0]?.enumValues).toEqual(['active', 'archived'])
  })

  it('maps groups, sticky notes and the project', () => {
    const schema = compileSchema(`
      Project shop { database_type: 'PostgreSQL'
        Note: 'Storefront' }
      Table a { id int }
      Table b { id int }
      TableGroup core [color: #345] { a
        b }
      Note reminder [color: #f5c542] { 'Index the slugs' }`)
    expect(schema.projectName).toBe('shop')
    expect(schema.groups[0]).toMatchObject({
      name: 'core',
      color: '#345',
      tableKeys: [tableKey(null, 'a'), tableKey(null, 'b')]
    })
    expect(schema.notes[0]).toMatchObject({ name: 'reminder', content: 'Index the slugs' })
  })

  it('records where each table is defined', () => {
    const schema = compileSchema('Table a { id int }\n\nTable b {\n  id int\n}')
    expect(tableNamed(schema, 'b').range.start).toEqual({ line: 3, column: 1 })
  })

  it('reports errors at the line and column people see, and yields no schema', () => {
    const { schema, diagnostics } = compileDbml('Table users {\n  id int [pk\n}')
    expect(schema).toBeNull()
    expect(diagnostics[0]).toMatchObject({ severity: 'error', range: { start: { line: 3 } } })
  })

  it('reports references to missing tables', () => {
    const { diagnostics } = compileDbml('Table a { id int }\nRef: a.id > ghost.id')
    expect(diagnostics.map((d) => d.message)).toContain(
      "Table 'ghost' does not exist in Schema 'public'"
    )
  })

  it('reads a file that starts with a byte order mark', () => {
    const { schema, diagnostics } = compileDbml('﻿Table users { id int }')
    expect(diagnostics).toEqual([])
    expect(schema?.tables[0]?.range.start).toEqual({ line: 1, column: 2 })
  })
})
