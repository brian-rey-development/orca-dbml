import { describe, expect, it } from 'vitest'
import { minimalChange } from '../../src/text/diff'

function roundTrip(before: string, after: string): string {
  const change = minimalChange(before, after)
  if (!change) return before
  return before.slice(0, change.from) + change.insert + before.slice(change.to)
}

describe('minimalChange', () => {
  it('returns nothing for identical text', () => {
    expect(minimalChange('same', 'same')).toBeNull()
  })

  it('replaces only the part that differs', () => {
    expect(minimalChange('Table users {}', 'Table people {}')).toEqual({
      from: 6,
      to: 11,
      insert: 'people'
    })
  })

  it('turns any text into any other', () => {
    const cases: [string, string][] = [
      ['abc', 'abXc'],
      ['abXc', 'abc'],
      ['aaa', 'aaaa'],
      ['', 'new'],
      ['old', ''],
      ['a\r\nb', 'a\r\nb\r\nc']
    ]
    for (const [before, after] of cases) expect(roundTrip(before, after)).toBe(after)
  })
})
