import {
  getMultiplicities,
  parseCardinality,
  type Column as RawColumn,
  type InlineRef as RawInlineRef,
  type Ref as RawRef,
  type RefEndpoint as RawRefEndpoint
} from '@dbml/parse'
import { tableKey } from './keys'
import type { Relation, RelationEnd } from './model'
import type { InjectedField } from './partials'

export type RelationInput = {
  readonly name: string | null
  readonly endpoints: readonly [RawRefEndpoint, RawRefEndpoint]
  readonly color: string | null
  readonly onDelete: string | null
  readonly onUpdate: string | null
}

export type TableName = {
  readonly name: string
  readonly schemaName: string | null
}

/** Whether an end's columns are exactly its table's primary key. */
export type IsPrimaryKey = (end: RelationEnd) => boolean

type Orientation = Pick<Relation, 'kind' | 'from' | 'to' | 'hasForeignKey'>

export function fromRawRef(ref: RawRef): RelationInput {
  return {
    name: ref.name,
    endpoints: ref.endpoints,
    color: ref.color ?? null,
    onDelete: ref.onDelete ?? null,
    onUpdate: ref.onUpdate ?? null
  }
}

// @dbml/parse reports inline refs of a table's own columns in `refs`, but not those of columns a
// `~partial` injected, so those are rebuilt here the way @dbml/core does.
export function fromInjectedFields(
  table: TableName,
  fields: readonly InjectedField[]
): RelationInput[] {
  return fields
    .filter((field) => field.fromPartial)
    .flatMap(({ column }) =>
      column.inline_refs.flatMap((ref) => injectedRelation(table, column, ref))
    )
}

function injectedRelation(table: TableName, column: RawColumn, ref: RawInlineRef): RelationInput[] {
  const multiplicities = getMultiplicities(ref.relation)
  if (!multiplicities) return []
  const [own, other] = multiplicities
  const self = ownEndpoint(table, column, own)
  return [
    {
      name: null,
      endpoints: [self, { ...ref, relation: other }],
      color: null,
      onDelete: null,
      onUpdate: null
    }
  ]
}

function ownEndpoint(
  table: TableName,
  column: RawColumn,
  relation: RawRefEndpoint['relation']
): RawRefEndpoint {
  return {
    schemaName: table.schemaName,
    tableName: table.name,
    fieldNames: [column.name],
    relation,
    token: column.token
  }
}

export function toRelation(
  input: RelationInput,
  index: number,
  isPrimaryKey: IsPrimaryKey
): Relation {
  const [first, second] = input.endpoints
  return {
    id: `relation-${index}`,
    name: input.name,
    ...orient(toEnd(first), toEnd(second), isPrimaryKey),
    color: input.color,
    onDelete: input.onDelete,
    onUpdate: input.onUpdate
  }
}

/**
 * The many end of a relationship references the one end. In a one-to-one, the end that is not a
 * primary key references the other; when neither or both are, DBML gives no hint, so the declared
 * order stands.
 */
function orient(a: RelationEnd, b: RelationEnd, isPrimaryKey: IsPrimaryKey): Orientation {
  if (a.many && b.many) return { kind: 'many-to-many', from: a, to: b, hasForeignKey: false }
  if (a.many) return { kind: 'many-to-one', from: a, to: b, hasForeignKey: true }
  if (b.many) return { kind: 'many-to-one', from: b, to: a, hasForeignKey: true }
  if (isPrimaryKey(a) && !isPrimaryKey(b)) {
    return { kind: 'one-to-one', from: b, to: a, hasForeignKey: true }
  }
  return { kind: 'one-to-one', from: a, to: b, hasForeignKey: !isPrimaryKey(a) }
}

function toEnd(endpoint: RawRefEndpoint): RelationEnd {
  const { min, max } = parseCardinality(endpoint.relation)
  return {
    tableKey: tableKey(endpoint.schemaName, endpoint.tableName),
    columns: endpoint.fieldNames,
    many: max === '*' || max > 1,
    optional: min === 0
  }
}
