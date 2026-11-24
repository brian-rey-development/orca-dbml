import { describe, expect, it } from 'vitest'
import { compileDbml } from '../../src/schema/compile'
import { tableKey } from '../../src/schema/keys'
import type { Schema } from '../../src/schema/model'

function compileSchema(source: string): Schema {
  const { schema, diagnostics } = compileDbml(source)
  expect(diagnostics).toEqual([])
  if (!schema) throw new Error('expected a schema')
  return schema
}

const PARTIALS = `
  TablePartial ids [headercolor: #111111, note: 'From ids'] {
    id int [pk]
  }
  TablePartial stamps {
    created_at timestamp
    updated_at timestamp
  }
  TablePartial override {
    created_at date
  }`

describe('table partials', () => {
  it('injects partial columns at the position of the injection', () => {
    const schema = compileSchema(`${PARTIALS}
      Table posts {
        ~ids
        title varchar
        ~stamps
      }`)
    expect(schema.tables[0]?.columns.map((c) => c.name)).toEqual([
      'id',
      'title',
      'created_at',
      'updated_at'
    ])
  })

  it('keeps consecutive injections between columns in the order they are written', () => {
    const schema = compileSchema(`${PARTIALS}
      Table posts {
        slug varchar
        ~ids
        ~stamps
        title varchar
      }`)
    expect(schema.tables[0]?.columns.map((c) => c.name)).toEqual([
      'slug',
      'id',
      'created_at',
      'updated_at',
      'title'
    ])
  })

  it('lets own columns and later injections win name conflicts', () => {
    const schema = compileSchema(`${PARTIALS}
      Table posts {
        ~stamps
        ~override
        updated_at datetime
      }`)
    expect(schema.tables[0]?.columns.map((c) => `${c.name}:${c.type}`)).toEqual([
      'created_at:date',
      'updated_at:datetime'
    ])
  })

  it('inherits header color and note unless the table sets its own', () => {
    const schema = compileSchema(`${PARTIALS}
      Table plain { ~ids }
      Table styled [headercolor: #222222] { ~ids }`)
    expect(schema.tables.map((t) => [t.color, t.note])).toEqual([
      ['#111111', 'From ids'],
      ['#222222', 'From ids']
    ])
  })

  it('turns inline refs on injected columns into relations', () => {
    const schema = compileSchema(`
      Table users { id int [pk] }
      TablePartial owned { owner_id int [ref: > users.id] }
      Table documents { id int [pk]
        ~owned }`)
    expect(schema.relations).toHaveLength(1)
    expect(schema.relations[0]?.from).toEqual({
      tableKey: tableKey(null, 'documents'),
      columns: ['owner_id'],
      many: true,
      optional: false
    })
    const documents = schema.tables.find((table) => table.displayName === 'documents')
    expect(documents?.columns.find((c) => c.name === 'owner_id')?.foreignKey).toBe(true)
  })
})
