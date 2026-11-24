/**
 * The words of DBML that the code editor knows. The highlighter, the completions and the TextMate
 * grammar's coverage test all read them from here, so a keyword added to DBML is added once.
 */

export type Block =
  'table' | 'enum' | 'indexes' | 'project' | 'group' | 'note' | 'ref' | 'records' | 'other'

/** Where a keyword may open its block: at the top level, inside a table, or both. */
export type Placement = 'top' | 'table' | 'both'

export type BlockKeyword = {
  readonly spelling: string
  readonly block: Block
  readonly placement: Placement
}

export const BLOCK_KEYWORDS: readonly BlockKeyword[] = [
  { spelling: 'Table', block: 'table', placement: 'top' },
  { spelling: 'TablePartial', block: 'table', placement: 'top' },
  { spelling: 'Enum', block: 'enum', placement: 'top' },
  { spelling: 'Ref', block: 'ref', placement: 'top' },
  { spelling: 'TableGroup', block: 'group', placement: 'top' },
  { spelling: 'Project', block: 'project', placement: 'top' },
  { spelling: 'Note', block: 'note', placement: 'both' },
  { spelling: 'Records', block: 'records', placement: 'both' },
  { spelling: 'indexes', block: 'indexes', placement: 'table' },
  { spelling: 'checks', block: 'other', placement: 'table' }
]

/** Blocks whose keyword is followed by the name of what they define. */
export const NAMED_BLOCKS: ReadonlySet<Block> = new Set([
  'table',
  'enum',
  'project',
  'group',
  'note',
  'ref'
])

export const IMPORT_KEYWORDS = ['use', 'reuse', 'from'] as const

/** Introduces a table's short name, as in `Table users as U`. */
export const ALIAS_KEYWORD = 'as'

export const LITERALS = ['true', 'false', 'null'] as const

export const COLUMN_TYPES = [
  'int',
  'integer',
  'bigint',
  'smallint',
  'serial',
  'bigserial',
  'varchar',
  'char',
  'text',
  'boolean',
  'decimal',
  'numeric',
  'float',
  'double',
  'date',
  'time',
  'timestamp',
  'timestamptz',
  'uuid',
  'json',
  'jsonb',
  'blob'
] as const

export const SETTINGS = [
  'pk',
  'primary key',
  'increment',
  'not null',
  'null',
  'unique',
  'default: ',
  'note: ',
  'ref: > ',
  'ref: < ',
  'ref: - ',
  'ref: <> ',
  'delete: cascade',
  'update: cascade',
  'headercolor: ',
  'color: ',
  'name: ',
  'type: btree',
  'type: hash'
] as const

export function keywordsFor(placement: Exclude<Placement, 'both'>): readonly BlockKeyword[] {
  return BLOCK_KEYWORDS.filter(
    (keyword) => keyword.placement === placement || keyword.placement === 'both'
  )
}
