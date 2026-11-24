import { describe, expect, it } from 'vitest'
import { applyHunks, diffLines, splitLines } from '../../src/text/line-diff'

function roundTrip(before: string, after: string): string {
  const lines = splitLines(before)
  return applyHunks(lines, diffLines(lines, splitLines(after)))
}

describe('splitLines', () => {
  it('keeps every line break, so the lines join back into the text', () => {
    expect(splitLines('a\r\nb\nc')).toEqual(['a\r\n', 'b\n', 'c'])
    expect(splitLines('a\n')).toEqual(['a\n'])
    expect(splitLines('')).toEqual([])
  })
})

describe('diffLines', () => {
  it('finds separate hunks instead of one span from the first change to the last', () => {
    const before = splitLines('a\nb\nc\nd\ne\n')
    const after = splitLines('A\nb\nc\nd\nE\n')
    expect(diffLines(before, after)).toEqual([
      { from: 0, to: 1, lines: ['A\n'] },
      { from: 4, to: 5, lines: ['E\n'] }
    ])
  })

  it('reports pure insertions and deletions', () => {
    expect(diffLines(splitLines('a\nc\n'), splitLines('a\nb\nc\n'))).toEqual([
      { from: 1, to: 1, lines: ['b\n'] }
    ])
    expect(diffLines(splitLines('a\nb\nc\n'), splitLines('a\nc\n'))).toEqual([
      { from: 1, to: 2, lines: [] }
    ])
  })

  it('turns any text into any other', () => {
    const cases: [string, string][] = [
      ['', 'a\nb\n'],
      ['a\nb\n', ''],
      ['a\nb\nc\n', 'c\nb\na\n'],
      ['x\ny\n', 'x\ny'],
      ['a\r\nb\r\n', 'a\r\nB\r\nc\r\n'],
      ['same\n', 'same\n']
    ]
    for (const [before, after] of cases) expect(roundTrip(before, after)).toBe(after)
  })

  it('replaces the whole range in one hunk when the texts share almost nothing', () => {
    const before = Array.from({ length: 3000 }, (_, index) => `old ${index}\n`)
    const after = Array.from({ length: 3000 }, (_, index) => `new ${index}\n`)
    expect(diffLines(before, after)).toEqual([{ from: 0, to: 3000, lines: after }])
  })
})
