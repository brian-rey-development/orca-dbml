import { describe, expect, it } from 'vitest'
import { enumKey, NODE_KEY_FORMAT, noteKey, tableKey } from '../../src/schema/keys'

// Saved diagram layouts are keyed by these strings. A change here orphans every saved layout
// unless NODE_KEY_FORMAT changes with it, so update both together.
describe('node keys', () => {
  it('keep the format saved layouts were filed under', () => {
    expect(NODE_KEY_FORMAT).toBe(2)
    expect(tableKey(null, 'users')).toBe('table:["public","users"]')
    expect(tableKey('shop', 'a.b')).toBe('table:["shop","a.b"]')
    expect(enumKey(null, 'status')).toBe('enum:["public","status"]')
    expect(noteKey('todo')).toBe('note:"todo"')
  })

  it('tell apart a quoted name with a dot from a schema-qualified name', () => {
    expect(tableKey(null, 'a.b')).not.toBe(tableKey('a', 'b'))
  })
})
