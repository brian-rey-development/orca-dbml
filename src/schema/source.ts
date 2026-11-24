import type { Position, TokenPosition } from '@dbml/parse'
import type { TextLocation } from '../text/location'
import type { SourceRange } from './model'

// @dbml/parse counts lines and columns from 1 in the schema it interprets, but from 0 in compiler
// diagnostics. These two conversions keep that difference here.

export function elementRange(token: Pick<TokenPosition, 'start' | 'end'>): SourceRange {
  return {
    start: { line: token.start.line, column: token.start.column },
    end: { line: token.end.line, column: token.end.column }
  }
}

export function diagnosticLocation(position: Position): TextLocation {
  return { line: position.line + 1, column: position.column + 1 }
}
