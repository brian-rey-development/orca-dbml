import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { detectLineSeparator, lineIndex, locationMap } from '../../src/text/location'

describe('detectLineSeparator', () => {
  it('finds the line break a file uses', () => {
    expect(detectLineSeparator('a\r\nb')).toBe('\r\n')
    expect(detectLineSeparator('a\nb')).toBe('\n')
    expect(detectLineSeparator('one line')).toBe('\n')
  })

  it('lets CodeMirror hand a CRLF file back byte for byte', () => {
    const text = 'Table a {\r\n  id int\r\n}\r\n'
    const state = EditorState.create({
      doc: text,
      extensions: EditorState.lineSeparator.of(detectLineSeparator(text))
    })
    expect(state.sliceDoc()).toBe(text)
    const edited = state.update({ changes: { from: state.doc.length, insert: 'Table b {}' } }).state
    expect(edited.sliceDoc()).toBe(`${text}Table b {}`)
  })

  it('keeps a lone carriage return inside its line, as the compiler counts lines', () => {
    const text = 'Table a {\r  id int\r}'
    const state = EditorState.create({
      doc: text,
      extensions: EditorState.lineSeparator.of(detectLineSeparator(text))
    })
    expect(state.doc.lines).toBe(1)
    expect(state.sliceDoc()).toBe(text)
  })
})

describe('lineIndex', () => {
  const text = 'ab\ncde\r\nf'
  const index = lineIndex(text)

  it('converts between offsets and 1-based lines and columns', () => {
    expect(index.offsetOf({ line: 2, column: 2 })).toBe(4)
    expect(index.locationOf(4)).toEqual({ line: 2, column: 2 })
    expect(index.locationOf(0)).toEqual({ line: 1, column: 1 })
    expect(index.locationOf(text.length)).toEqual({ line: 3, column: 2 })
  })

  it('agrees with counting line breaks by hand at every offset', () => {
    for (let offset = 0; offset <= text.length; offset += 1) {
      const before = text.slice(0, offset)
      const line = before.split('\n').length
      const column = offset - (before.lastIndexOf('\n') + 1) + 1
      expect(index.locationOf(offset)).toEqual({ line, column })
      expect(index.offsetOf({ line, column })).toBe(offset)
    }
  })

  it('clamps locations past the end of a line or the text', () => {
    expect(index.offsetOf({ line: 1, column: 99 })).toBe(2)
    expect(index.offsetOf({ line: 9, column: 1 })).toBe(text.length)
    expect(index.offsetOf({ line: 0, column: 1 })).toBe(0)
  })
})

describe('locationMap', () => {
  const before = 'Table a {}\nTable b {}'

  it('moves a location down when lines are inserted above it', () => {
    const after = `Table new {}\n${before}`
    expect(locationMap(before, after)({ line: 2, column: 1 })).toEqual({ line: 3, column: 1 })
  })

  it('keeps a location above the edit where it was', () => {
    const after = before.replace('Table b', 'Table bee')
    expect(locationMap(before, after)({ line: 1, column: 1 })).toEqual({ line: 1, column: 1 })
  })

  it('moves a location inside replaced text to where the replacement starts', () => {
    const after = before.replace('Table b {}', 'Ref: x > y')
    expect(locationMap(before, after)({ line: 2, column: 5 })).toEqual({ line: 2, column: 1 })
  })
})
