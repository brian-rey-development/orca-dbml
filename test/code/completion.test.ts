import { CompletionContext } from '@codemirror/autocomplete'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { dbmlCompletion } from '../../src/code/completion'
import { compileDbml } from '../../src/schema/compile'

const { schema } = compileDbml(`
  Enum status { active }
  Table users as U { id int [pk]
    email varchar }
  Table "order items" { sku int }`)
const complete = dbmlCompletion(() => schema)

/** Completion labels offered with the cursor at the `|` in `source`. */
function labelsAt(source: string, explicit = false): string[] | null {
  const position = source.indexOf('|')
  const state = EditorState.create({ doc: source.replace('|', '') })
  const result = complete(new CompletionContext(state, position, explicit))
  return result ? result.options.map((option) => option.label) : null
}

describe('dbmlCompletion', () => {
  it('offers block keywords at the start of a top-level line', () => {
    expect(labelsAt('Ta|')).toContain('Table')
  })

  it('stays quiet while a column name is typed, so Enter never replaces it', () => {
    expect(labelsAt('Table t {\n  no|')).toBeNull()
    expect(labelsAt('Table t {\n  no|', true)).toContain('Note')
  })

  it('offers column types and enums after a column name', () => {
    const labels = labelsAt('Table t {\n  state st|')
    expect(labels).toContain('timestamp')
    expect(labels).toContain('status')
  })

  it('offers settings inside brackets', () => {
    expect(labelsAt('Table t {\n  id int [p|')).toContain('pk')
  })

  it('offers a table’s columns after its name or alias', () => {
    expect(labelsAt('Ref: posts.user_id > users.|', true)).toEqual(['id', 'email'])
    expect(labelsAt('Ref: posts.user_id > U.e|')).toEqual(['id', 'email'])
    expect(labelsAt('Ref: posts.user_id > public.users.|', true)).toEqual(['id', 'email'])
    expect(labelsAt('Ref: posts.user_id > "users".|', true)).toEqual(['id', 'email'])
    expect(labelsAt('Ref: posts.sku > "order items".|', true)).toEqual(['sku'])
  })
})
