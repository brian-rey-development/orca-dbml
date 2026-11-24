import { minimalChange } from './diff'

/**
 * A place in a text as people and compilers count it: 1-based line and column, with lines ended by
 * `\n` (a preceding `\r` stays in the line). Locations, not offsets, cross between the compiler and
 * the code editor, because the editor's offsets count a CRLF line break as one character.
 */
export type TextLocation = {
  readonly line: number
  readonly column: number
}

export type LineSeparator = '\r\n' | '\n'

/** The line break a file uses, so an editor can write it back exactly as it was. */
export function detectLineSeparator(text: string): LineSeparator {
  if (text.includes('\r\n')) return '\r\n'
  return '\n'
}

/** Converts between offsets and locations in one text, without rescanning it for each one. */
export type LineIndex = {
  offsetOf(location: TextLocation): number
  locationOf(offset: number): TextLocation
}

export function lineIndex(text: string): LineIndex {
  const starts = lineStarts(text)
  return {
    offsetOf: (location) => offsetIn(text, starts, location),
    locationOf: (offset) => locationIn(text, starts, offset)
  }
}

function lineStarts(text: string): number[] {
  const starts = [0]
  for (let next = text.indexOf('\n'); next !== -1; next = text.indexOf('\n', next + 1)) {
    starts.push(next + 1)
  }
  return starts
}

/** A line past the end means the end of the text; a column past the line, the line's end. */
function offsetIn(text: string, starts: readonly number[], location: TextLocation): number {
  const start = starts[Math.max(location.line, 1) - 1]
  if (start === undefined) return text.length
  const nextStart = starts[Math.max(location.line, 1)]
  const end = nextStart === undefined ? text.length : nextStart - 1
  return start + Math.min(Math.max(location.column - 1, 0), end - start)
}

function locationIn(text: string, starts: readonly number[], offset: number): TextLocation {
  const clamped = Math.min(Math.max(offset, 0), text.length)
  const line = lastStartAtOrBefore(starts, clamped)
  return { line: line + 1, column: clamped - (starts[line] ?? 0) + 1 }
}

function lastStartAtOrBefore(starts: readonly number[], offset: number): number {
  let low = 0
  let high = starts.length - 1
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if ((starts[middle] ?? 0) <= offset) low = middle
    else high = middle - 1
  }
  return low
}

export type LocationMap = (location: TextLocation) => TextLocation

export function locationMap(before: string, after: string): LocationMap {
  const change = minimalChange(before, after)
  if (!change) return (location) => location
  const growth = change.insert.length - (change.to - change.from)
  const old = lineIndex(before)
  const current = lineIndex(after)
  return (location) => {
    const offset = old.offsetOf(location)
    if (offset < change.from) return current.locationOf(offset)
    if (offset >= change.to) return current.locationOf(offset + growth)
    return current.locationOf(change.from)
  }
}
