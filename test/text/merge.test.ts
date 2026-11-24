import { describe, expect, it } from 'vitest'
import { mergeEdits } from '../../src/text/merge'

const BASE = 'Table users {\n  id int\n}\n\nTable posts {\n  id int\n}\n'

describe('mergeEdits', () => {
  it('keeps both edits when they touch different tables', () => {
    const outside = BASE.replace('Table posts {\n  id int', 'Table posts {\n  id int\n  title text')
    const mine = BASE.replace('Table users {\n  id int', 'Table users {\n  id int\n  email text')
    expect(mergeEdits(BASE, outside, mine)).toBe(
      'Table users {\n  id int\n  email text\n}\n\nTable posts {\n  id int\n  title text\n}\n'
    )
  })

  it('keeps a local edit that sits between two outside edits', () => {
    const base = 'a\nb\nc\nd\ne\n'
    expect(mergeEdits(base, 'A\nb\nc\nd\nE\n', 'a\nb\nC\nd\ne\n')).toBe('A\nb\nC\nd\nE\n')
  })

  it('lets the outside version of shared lines win and keeps the other local edits', () => {
    const base = 'a\nb\nc\nd\n'
    expect(mergeEdits(base, 'a\nB1\nc\nd\n', 'a\nB2\nc\nD\n')).toBe('a\nB1\nc\nD\n')
  })

  it('returns the side that changed when only one did', () => {
    const changed = `${BASE}Table tags { id int }\n`
    expect(mergeEdits(BASE, BASE, changed)).toBe(changed)
    expect(mergeEdits(BASE, changed, BASE)).toBe(changed)
  })

  it('keeps both edits on neighbouring lines', () => {
    expect(mergeEdits('a\nb\nc\nd\n', 'a\nX\nc\nd\n', 'a\nb\nY\nd\n')).toBe('a\nX\nY\nd\n')
  })

  it('treats an insertion inside lines the other side replaced as a conflict', () => {
    expect(mergeEdits('a\nb\nc\nd\n', 'a\nX\nd\n', 'a\nb\nnew\nc\nd\n')).toBe('a\nX\nd\n')
  })

  it('treats two insertions at the same line as a conflict', () => {
    expect(mergeEdits('a\nb\n', 'a\nX\nb\n', 'a\nY\nb\n')).toBe('a\nX\nb\n')
  })

  it('merges CRLF text without touching its line breaks', () => {
    expect(mergeEdits('a\r\nb\r\nc\r\n', 'A\r\nb\r\nc\r\n', 'a\r\nb\r\nC\r\n')).toBe(
      'A\r\nb\r\nC\r\n'
    )
  })
})
