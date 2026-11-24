import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import { tags, type Tag } from '@lezer/highlight'
import { dbmlTokenizer, type DbmlToken } from './dbml-tokenizer'

const TOKEN_TAGS: Record<DbmlToken, Tag> = {
  keyword: tags.keyword,
  definition: tags.definition(tags.typeName),
  property: tags.propertyName,
  type: tags.typeName,
  setting: tags.attributeName,
  string: tags.string,
  expression: tags.special(tags.string),
  number: tags.number,
  color: tags.color,
  literal: tags.bool,
  operator: tags.operator,
  bracket: tags.bracket,
  comment: tags.comment,
  name: tags.variableName
}

const dbmlLanguage = StreamLanguage.define({ ...dbmlTokenizer, tokenTable: TOKEN_TAGS })

const syntaxColor = (token: string): string => `var(--dbml-syntax-${token})`

export const dbmlHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: syntaxColor('keyword'), fontWeight: '600' },
  { tag: tags.definition(tags.typeName), color: syntaxColor('definition'), fontWeight: '600' },
  { tag: tags.propertyName, color: syntaxColor('property') },
  { tag: tags.typeName, color: syntaxColor('type') },
  { tag: tags.attributeName, color: syntaxColor('setting') },
  { tag: [tags.string, tags.special(tags.string)], color: syntaxColor('string') },
  { tag: [tags.number, tags.bool, tags.color], color: syntaxColor('literal') },
  { tag: tags.operator, color: syntaxColor('operator') },
  { tag: tags.comment, color: syntaxColor('comment'), fontStyle: 'italic' }
])

export function dbmlSyntax(): Extension {
  return [dbmlLanguage, syntaxHighlighting(dbmlHighlightStyle)]
}
