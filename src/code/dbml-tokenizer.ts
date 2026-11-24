import type { StringStream, StreamParser } from '@codemirror/language'
import {
  ALIAS_KEYWORD,
  BLOCK_KEYWORDS,
  IMPORT_KEYWORDS,
  LITERALS,
  NAMED_BLOCKS,
  keywordsFor,
  type Block
} from './dbml-vocabulary'

export type DbmlState = {
  blocks: Block[]
  pending: Block | null
  expectName: boolean
  settingsDepth: number
  /** Keywords and names so far on this line: a column's name is slot 0, its type slot 1. */
  nameSlot: number
  inComment: boolean
  inMultiline: boolean
}

export type DbmlToken =
  | 'keyword'
  | 'definition'
  | 'property'
  | 'type'
  | 'setting'
  | 'string'
  | 'expression'
  | 'number'
  | 'color'
  | 'literal'
  | 'operator'
  | 'bracket'
  | 'comment'
  | 'name'

const BLOCK_BY_KEYWORD: ReadonlyMap<string, Block> = new Map(
  BLOCK_KEYWORDS.map((keyword) => [keyword.spelling.toLowerCase(), keyword.block])
)
const TABLE_BODY_KEYWORDS: ReadonlySet<string> = new Set(
  keywordsFor('table').map((keyword) => keyword.spelling.toLowerCase())
)
const OTHER_KEYWORDS: ReadonlySet<string> = new Set([ALIAS_KEYWORD, ...IMPORT_KEYWORDS])
const LITERAL_WORDS: ReadonlySet<string> = new Set(LITERALS)
const COLUMN_NAME_SLOT = 0
const COLUMN_TYPE_SLOT = 1

export const dbmlTokenizer: StreamParser<DbmlState> = {
  name: 'dbml',
  startState: () => ({
    blocks: [],
    pending: null,
    expectName: false,
    settingsDepth: 0,
    nameSlot: COLUMN_NAME_SLOT,
    inComment: false,
    inMultiline: false
  }),
  copyState: (state) => ({ ...state, blocks: [...state.blocks] }),
  token: (stream, state) => {
    if (stream.sol()) state.nameSlot = COLUMN_NAME_SLOT
    if (state.inComment) return blockComment(stream, state)
    if (state.inMultiline) return multilineString(stream, state)
    if (stream.eatSpace()) return null
    return punctuation(stream, state) ?? literal(stream, state) ?? word(stream, state)
  },
  languageData: {
    commentTokens: { line: '//', block: { open: '/*', close: '*/' } },
    closeBrackets: { brackets: ['(', '[', '{', "'", '"', '`'] }
  }
}

function blockComment(stream: StringStream, state: DbmlState): DbmlToken {
  state.inComment = !stream.skipTo('*/')
  if (state.inComment) stream.skipToEnd()
  else stream.match('*/')
  return 'comment'
}

function multilineString(stream: StringStream, state: DbmlState): DbmlToken {
  state.inMultiline = !stream.skipTo("'''")
  if (state.inMultiline) stream.skipToEnd()
  else stream.match("'''")
  return 'string'
}

function punctuation(stream: StringStream, state: DbmlState): DbmlToken | null {
  if (stream.match('//')) {
    stream.skipToEnd()
    return 'comment'
  }
  if (stream.match('/*')) return blockComment(stream, state)
  if (stream.match("'''")) return multilineString(stream, state)
  if (stream.match('{')) return openBlock(state)
  if (stream.match('}')) return closeBlock(state)
  if (stream.match('[')) return openSettings(state)
  if (stream.match(']')) return closeSettings(state)
  if (stream.match(':')) return endOfName(state)
  if (stream.match(/^(<>|[<>\-~.,()])/)) return 'operator'
  return null
}

// A brace always starts or ends a block, so it also ends any settings list left unclosed while
// typing; otherwise the rest of the file would read as settings.
function openBlock(state: DbmlState): DbmlToken {
  state.blocks.push(state.pending ?? 'other')
  state.pending = null
  state.expectName = false
  state.settingsDepth = 0
  return 'bracket'
}

function closeBlock(state: DbmlState): DbmlToken {
  state.blocks.pop()
  state.settingsDepth = 0
  return 'bracket'
}

function openSettings(state: DbmlState): DbmlToken {
  state.settingsDepth += 1
  return 'bracket'
}

function closeSettings(state: DbmlState): DbmlToken {
  state.settingsDepth = Math.max(0, state.settingsDepth - 1)
  return 'bracket'
}

function endOfName(state: DbmlState): DbmlToken {
  state.expectName = false
  return 'operator'
}

function literal(stream: StringStream, state: DbmlState): DbmlToken | null {
  if (stream.match(/^'(?:[^'\\]|\\.)*'?/)) return 'string'
  if (stream.match(/^`[^`]*`?/)) return 'expression'
  if (stream.match(/^#[0-9a-fA-F]{3,8}\b/)) return 'color'
  if (stream.match(/^\d+(\.\d+)?\b/)) return 'number'
  if (stream.match(/^"(?:[^"\\]|\\.)*"?/)) return nameToken(state)
  return null
}

function word(stream: StringStream, state: DbmlState): DbmlToken | null {
  if (!stream.match(/^[\p{L}_][\p{L}\p{N}_]*/u)) {
    stream.next()
    return null
  }
  const text = stream.current().toLowerCase()
  if (LITERAL_WORDS.has(text)) return 'literal'
  if (state.settingsDepth > 0) return 'setting'
  return keyword(text, stream, state) ?? nameToken(state)
}

function keyword(text: string, stream: StringStream, state: DbmlState): DbmlToken | null {
  const current = state.blocks[state.blocks.length - 1]
  const atBodyStart = state.nameSlot === COLUMN_NAME_SLOT
  if (current === 'table' && atBodyStart && !isBodyKeyword(text, stream)) return null
  const block = BLOCK_BY_KEYWORD.get(text)
  if (block && (current === undefined || atBodyStart)) {
    state.pending = block
    state.expectName = NAMED_BLOCKS.has(block)
    state.nameSlot += 1
    return 'keyword'
  }
  return OTHER_KEYWORDS.has(text) ? 'keyword' : null
}

function isBodyKeyword(text: string, stream: StringStream): boolean {
  return TABLE_BODY_KEYWORDS.has(text) && Boolean(stream.match(/^\s*[:{]/, false))
}

function nameToken(state: DbmlState): DbmlToken {
  const position = state.nameSlot
  state.nameSlot += 1
  if (state.expectName) {
    state.expectName = false
    return 'definition'
  }
  const block = state.blocks[state.blocks.length - 1]
  if (block === 'table' && position === COLUMN_NAME_SLOT) return 'property'
  if (block === 'table' && position === COLUMN_TYPE_SLOT) return 'type'
  if (block === 'enum' && position === COLUMN_NAME_SLOT) return 'property'
  return 'name'
}
