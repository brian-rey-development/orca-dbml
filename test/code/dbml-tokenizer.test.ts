import { StringStream } from '@codemirror/language'
import { describe, expect, it } from 'vitest'
import { dbmlTokenizer, type DbmlState } from '../../src/code/dbml-tokenizer'

type Token = { readonly text: string; readonly style: string | null }

const TAB_SIZE = 2

function tokenize(source: string): Token[] {
  const state: DbmlState = dbmlTokenizer.startState?.(TAB_SIZE) ?? fail()
  return source.split('\n').flatMap((line) => {
    const stream = new StringStream(line, TAB_SIZE, TAB_SIZE)
    const tokens: Token[] = []
    while (!stream.eol()) {
      const style = dbmlTokenizer.token(stream, state)
      const text = stream.current()
      if (text.trim() !== '') tokens.push({ text, style })
      stream.start = stream.pos
    }
    return tokens
  })
}

function styleOf(source: string, text: string): (string | null)[] {
  return tokenize(source)
    .filter((token) => token.text === text)
    .map((token) => token.style)
}

function fail(): never {
  throw new Error('the tokenizer has no start state')
}

describe('dbmlTokenizer', () => {
  it('marks declarations, column names and types', () => {
    const source = 'Table users as U {\n  id int [pk]\n  email varchar(255)\n}'
    expect(styleOf(source, 'Table')).toEqual(['keyword'])
    expect(styleOf(source, 'users')).toEqual(['definition'])
    expect(styleOf(source, 'id')).toEqual(['property'])
    expect(styleOf(source, 'int')).toEqual(['type'])
    expect(styleOf(source, 'pk')).toEqual(['setting'])
    expect(styleOf(source, 'varchar')).toEqual(['type'])
  })

  it('tells the Note keyword from a column called note', () => {
    const source = "Table t {\n  note text\n  Note: 'About'\n}"
    expect(styleOf(source, 'note')).toEqual(['property'])
    expect(styleOf(source, 'Note')).toEqual(['keyword'])
  })

  it('does not take the first endpoint of an unnamed Ref as its name', () => {
    expect(styleOf('Ref: posts.user_id > users.id', 'posts')).toEqual(['name'])
    expect(styleOf('Ref fk: posts.user_id > users.id', 'fk')).toEqual(['definition'])
  })

  it('reads literals, colors, expressions and comments', () => {
    const source = "Table t [headercolor: #abc] {\n  a int [default: `now()`, note: 'x'] // done\n}"
    expect(styleOf(source, '#abc')).toEqual(['color'])
    expect(styleOf(source, '`now()`')).toEqual(['expression'])
    expect(styleOf(source, "'x'")).toEqual(['string'])
    expect(styleOf(source, '// done')).toEqual(['comment'])
  })

  it('recovers from a settings list left unclosed while typing', () => {
    const source = 'Table a {\n  id int [pk\n}\nTable b {\n  id int\n}'
    expect(styleOf(source, 'Table')).toEqual(['keyword', 'keyword'])
    expect(styleOf(source, 'b')).toEqual(['definition'])
  })

  it('marks numbers, colors, literals, quoted names and enum members', () => {
    const source = [
      'Enum status {',
      '  active',
      '}',
      'Table "order items" [headercolor: #3498DB] {',
      '  qty int [default: 1.5, not null]',
      '  ok bool [default: true]',
      '}'
    ].join('\n')
    expect(styleOf(source, 'active')).toEqual(['property'])
    expect(styleOf(source, '"order items"')).toEqual(['definition'])
    expect(styleOf(source, '#3498DB')).toEqual(['color'])
    expect(styleOf(source, '1.5')).toEqual(['number'])
    expect(styleOf(source, 'true')).toEqual(['literal'])
    expect(styleOf(source, 'null')).toEqual(['literal'])
  })

  it('carries block comments and triple-quoted strings across lines', () => {
    const source = "/* one\ntwo */\nNote n { '''\nbody\n''' }"
    expect(styleOf(source, 'two */')).toEqual(['comment'])
    expect(styleOf(source, 'body')).toEqual(['string'])
  })
})
