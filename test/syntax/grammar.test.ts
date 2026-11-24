import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { beforeAll, describe, expect, it } from 'vitest'
import { INITIAL, Registry, parseRawGrammar, type IGrammar } from 'vscode-textmate'
import { OnigScanner, OnigString, loadWASM } from 'vscode-oniguruma'
import {
  ALIAS_KEYWORD,
  IMPORT_KEYWORDS,
  LITERALS,
  SETTINGS,
  keywordsFor
} from '../../src/code/dbml-vocabulary'

const require = createRequire(import.meta.url)
const GRAMMAR_PATH = new URL('../../syntaxes/dbml.tmLanguage.json', import.meta.url)

let grammar: IGrammar

const UNKNOWN_WORD = 'variable.other.dbml'

beforeAll(async () => {
  await loadWASM(readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm')).buffer)
  const registry = new Registry({
    onigLib: Promise.resolve({
      createOnigScanner: (patterns) => new OnigScanner(patterns),
      createOnigString: (text) => new OnigString(text)
    }),
    loadGrammar: async () =>
      parseRawGrammar(readFileSync(GRAMMAR_PATH, 'utf8'), GRAMMAR_PATH.pathname)
  })
  const loaded = await registry.loadGrammar('source.dbml')
  if (!loaded) throw new Error('grammar did not load')
  grammar = loaded
})

/** The innermost scope of every token whose text is `text`, across the whole source. */
function scopesOf(source: string, text: string): string[] {
  let state = INITIAL
  const found: string[] = []
  for (const line of source.split('\n')) {
    const result = grammar.tokenizeLine(line, state)
    for (const token of result.tokens) {
      if (line.slice(token.startIndex, token.endIndex).trim() === text) {
        found.push(token.scopes[token.scopes.length - 1] ?? '')
      }
    }
    state = result.ruleStack
  }
  return found
}

describe('DBML grammar', () => {
  it('scopes every block keyword the code editor knows, where DBML allows it', () => {
    const topLevel = keywordsFor('top').map(({ spelling }) => [spelling, `${spelling} x {\n}`])
    const inTable = keywordsFor('table').map(({ spelling }) => [
      spelling,
      `Table t {\n  ${spelling} {\n  }\n}`
    ])
    for (const [spelling = '', source = ''] of [...topLevel, ...inTable]) {
      expect(scopesOf(source, spelling)[0], source).toMatch(/^keyword\./)
    }
  })

  it('scopes the import keywords the code editor knows', () => {
    for (const spelling of IMPORT_KEYWORDS) {
      const source = `${spelling} { users } from './base.dbml'`
      expect(scopesOf(source, spelling)[0], source).toMatch(/^keyword\./)
    }
  })

  it('recognizes every setting and literal the code editor completes', () => {
    const literals = LITERALS.map((literal) => `default: ${literal}`)
    for (const setting of [...SETTINGS, ...literals]) {
      const value = setting.endsWith(' ') ? "'value'" : ''
      const source = `Table t {\n  a int [${setting}${value}]\n}`
      const words = setting.match(/[a-z]+/g) ?? []
      for (const word of words) expect(scopesOf(source, word), source).not.toContain(UNKNOWN_WORD)
    }
  })

  it('scopes a table header with alias and settings', () => {
    const source = "Table public.users as U [headercolor: #3498DB, note: 'People'] {\n  id int\n}"
    expect(scopesOf(source, 'Table')).toEqual(['keyword.other.table.dbml'])
    expect(scopesOf(source, 'public.users')).toEqual(['entity.name.type.dbml'])
    expect(scopesOf(source, ALIAS_KEYWORD)[0]).toMatch(/^keyword\./)
    expect(scopesOf(source, 'U')).toEqual(['entity.name.type.alias.dbml'])
    expect(scopesOf(source, 'headercolor')).toEqual(['entity.other.attribute-name.dbml'])
    expect(scopesOf(source, '#3498DB')).toEqual(['constant.other.color.rgb-value.hex.dbml'])
  })

  it('scopes column names, types and settings', () => {
    const source = [
      'Table posts {',
      "  author_id varchar(255) [not null, ref: > users.id, default: 'x']",
      '  "created at" timestamp',
      '}'
    ].join('\n')
    expect(scopesOf(source, 'author_id')).toEqual(['variable.other.member.column.dbml'])
    expect(scopesOf(source, 'varchar(255)')).toEqual(['storage.type.dbml'])
    expect(scopesOf(source, 'not null')).toEqual(['storage.modifier.dbml'])
    expect(scopesOf(source, '>')).toEqual(['keyword.operator.relationship.dbml'])
    expect(scopesOf(source, '"created at"')).toEqual(['variable.other.member.column.dbml'])
    expect(scopesOf(source, 'timestamp')).toEqual(['storage.type.dbml'])
  })

  it('keeps a column named note apart from the Note setting', () => {
    const source = "Table t {\n  note text\n  Note: 'About t'\n}"
    expect(scopesOf(source, 'note')).toEqual(['variable.other.member.column.dbml'])
    expect(scopesOf(source, 'Note')).toEqual(['keyword.other.note.dbml'])
  })

  it('scopes indexes, enums, refs and groups', () => {
    const source = [
      'Table t {',
      '  id int',
      '  indexes {',
      '    (id, name) [unique]',
      '  }',
      '}',
      'Enum status {',
      '  active',
      '}',
      'Ref fk: posts.author_id <> users.id [delete: cascade]',
      'TableGroup core {',
      '  users',
      '}'
    ].join('\n')
    expect(scopesOf(source, 'indexes')).toEqual(['keyword.other.indexes.dbml'])
    expect(scopesOf(source, 'active')).toEqual(['variable.other.enummember.dbml'])
    expect(scopesOf(source, 'Ref')).toEqual(['keyword.other.ref.dbml'])
    expect(scopesOf(source, '<>')).toEqual(['keyword.operator.relationship.dbml'])
    expect(scopesOf(source, 'cascade')).toEqual(['constant.language.referential-action.dbml'])
    expect(scopesOf(source, 'TableGroup')).toEqual(['keyword.other.table-group.dbml'])
  })

  it('scopes comments, multi-line strings and expressions', () => {
    const source = [
      '// a comment',
      '/* a block',
      '   comment */',
      "Note sticky { '''",
      'line one',
      "''' }",
      'Table t { at timestamp [default: `now()`] }'
    ].join('\n')
    expect(scopesOf(source, 'a comment')).toEqual(['comment.line.double-slash.dbml'])
    expect(scopesOf(source, 'comment')).toEqual(['comment.block.dbml'])
    expect(scopesOf(source, 'line one')).toEqual(['string.quoted.triple.dbml'])
    expect(scopesOf(source, 'now()')).toEqual(['string.interpolated.expression.dbml'])
  })

  it('ends an unterminated quote at the end of its line', () => {
    const source = "Table t {\n  bio text [default: 'unterminated]\n}\nTable next {\n  id int\n}"
    expect(scopesOf(source, 'next')).toEqual(['entity.name.type.dbml'])
  })
})
