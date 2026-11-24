import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import { tableByReference } from '../schema/lookup'
import type { Schema } from '../schema/model'
import { COLUMN_TYPES, SETTINGS, keywordsFor } from './dbml-vocabulary'

const TOP_LEVEL_KEYWORDS = keywordsFor('top').map((keyword) => keyword.spelling)
const TABLE_BODY_KEYWORDS = keywordsFor('table').map((keyword) => keyword.spelling)

// Qualifiers before the last dot may be quoted names with spaces, such as `"order items".`.
const WORD_BEFORE_CURSOR = /(?:(?:"[^"\n]*"|[\p{L}\p{N}_]+)\.)*[\p{L}\p{N}_"]*$/u
// Spaces keep the list open while typing settings such as `not null` and `primary key`.
const STILL_COMPLETING = /^[\p{L}\p{N}_." ]*$/u
const FIRST_WORD = /^\S*$/
const INDENTED_FIRST_WORD = /^\s+\S*$/
const COLUMN_TYPE_POSITION = /^\s+[\p{L}\p{N}_"]+\s+\S*$/u

/**
 * Completes keywords, column types, settings, and the tables and columns of the last valid
 * schema. The first word of an indented line is usually a new column name, so suggestions there
 * open only on request (Ctrl+Space); otherwise Enter would replace the name being typed.
 */
export function dbmlCompletion(schema: () => Schema | null) {
  return (context: CompletionContext): CompletionResult | null => {
    const word = context.matchBefore(WORD_BEFORE_CURSOR)
    if (!word || (word.from === word.to && !context.explicit)) return null
    const line = context.state.doc.lineAt(context.pos)
    const before = line.text.slice(0, context.pos - line.from)
    if (INDENTED_FIRST_WORD.test(before) && !context.explicit) return null
    const dot = word.text.lastIndexOf('.')
    const columns = dot === -1 ? [] : columnOptions(schema(), word.text.slice(0, dot))
    if (columns.length > 0) return { from: word.from + dot + 1, options: columns }
    return {
      from: word.from,
      options: contextualOptions(before, schema()),
      validFor: STILL_COMPLETING
    }
  }
}

function contextualOptions(lineBefore: string, schema: Schema | null): Completion[] {
  if (insideSettings(lineBefore)) return SETTINGS.map((label) => ({ label, type: 'property' }))
  if (COLUMN_TYPE_POSITION.test(lineBefore))
    return [...COLUMN_TYPES.map(typeOption), ...enumOptions(schema)]
  if (FIRST_WORD.test(lineBefore)) return TOP_LEVEL_KEYWORDS.map(keywordOption)
  if (INDENTED_FIRST_WORD.test(lineBefore)) {
    return [...TABLE_BODY_KEYWORDS.map(keywordOption), ...tableOptions(schema)]
  }
  return tableOptions(schema)
}

function insideSettings(lineBefore: string): boolean {
  return lineBefore.lastIndexOf('[') > lineBefore.lastIndexOf(']')
}

function keywordOption(label: string): Completion {
  return { label, type: 'keyword' }
}

function typeOption(label: string): Completion {
  return { label, type: 'type' }
}

function enumOptions(schema: Schema | null): Completion[] {
  return (schema?.enums ?? []).map((item) => ({ label: item.displayName, type: 'enum' }))
}

function tableOptions(schema: Schema | null): Completion[] {
  return (schema?.tables ?? []).map((table) => ({
    label: table.displayName,
    type: 'class',
    detail: 'table'
  }))
}

function columnOptions(schema: Schema | null, reference: string): Completion[] {
  const table = schema ? tableByReference(schema.tables, reference) : null
  return (table?.columns ?? []).map((column) => ({
    label: column.name,
    type: 'property',
    detail: column.type
  }))
}
