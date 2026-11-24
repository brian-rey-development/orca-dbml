import type {
  Column as RawColumn,
  Database as RawDatabase,
  Enum as RawEnum,
  Index as RawIndex,
  Note as RawNote,
  Project as RawProject,
  Table as RawTable,
  TableGroup as RawTableGroup
} from '@dbml/parse'
import { displayName, enumKey, noteKey, tableKey } from './keys'
import type {
  Column,
  EnumType,
  Relation,
  RelationEnd,
  Schema,
  StickyNote,
  Table,
  TableGroup
} from './model'
import { mergePartials, type MergedTable } from './partials'
import { fromInjectedFields, fromRawRef, toRelation } from './relations'
import { elementRange } from './source'

export function buildSchema(raw: RawDatabase): Schema {
  const partials = new Map(raw.tablePartials.map((partial) => [partial.name, partial]))
  const merged = raw.tables.map((table) => ({ table, merged: mergePartials(table, partials) }))
  const enums = raw.enums.map(toEnum)
  const enumValues = new Map(enums.map((e) => [e.key, e.values.map((value) => value.name)]))
  const tables = merged.map(({ table, merged }) => toTable(table, merged, enumValues))
  const isPrimaryKey = primaryKeyCheck(tables)
  const relations = [
    ...raw.refs.map(fromRawRef),
    ...merged.flatMap(({ table, merged }) => fromInjectedFields(table, merged.fields))
  ].map((input, index) => toRelation(input, index, isPrimaryKey))
  return {
    projectName: projectName(raw.project),
    tables: markForeignKeys(tables, relations),
    relations,
    enums,
    groups: raw.tableGroups.map(toGroup),
    notes: raw.notes.map(toNote)
  }
}

type EnumValues = ReadonlyMap<string, readonly string[]>

function toTable(raw: RawTable, merged: MergedTable, enumValues: EnumValues): Table {
  const compositeKey = primaryKeyIndexColumns(merged.indexes)
  return {
    key: tableKey(raw.schemaName, raw.name),
    name: raw.name,
    displayName: displayName(raw.schemaName, raw.name),
    alias: raw.alias,
    color: merged.headerColor,
    note: merged.note,
    columns: merged.fields.map(({ column }) =>
      toColumn(column, enumValues, compositeKey.has(column.name))
    ),
    range: elementRange(raw.token)
  }
}

function primaryKeyIndexColumns(indexes: readonly RawIndex[]): ReadonlySet<string> {
  return new Set(
    indexes
      .filter((index) => index.pk === true)
      .flatMap((index) => index.columns.filter((part) => part.type === 'column'))
      .map((part) => part.value)
  )
}

function toColumn(raw: RawColumn, enumValues: EnumValues, inCompositeKey: boolean): Column {
  return {
    name: raw.name,
    type: displayName(raw.type.schemaName, raw.type.type_name),
    primaryKey: raw.pk === true || inCompositeKey,
    unique: raw.unique === true,
    notNull: raw.not_null === true,
    increment: raw.increment === true,
    foreignKey: false,
    defaultValue: formatDefault(raw.dbdefault),
    note: raw.note?.value ?? null,
    enumValues: enumValues.get(enumKey(raw.type.schemaName, raw.type.type_name)) ?? null
  }
}

function formatDefault(value: RawColumn['dbdefault']): string | null {
  if (!value) return null
  if (value.type === 'expression') return `\`${value.value}\``
  if (value.type === 'string') return `'${value.value}'`
  return String(value.value)
}

function primaryKeyCheck(tables: readonly Table[]): (end: RelationEnd) => boolean {
  const byKey = new Map(tables.map((table) => [table.key, table]))
  return (end) => {
    const keyColumns = (byKey.get(end.tableKey)?.columns ?? []).filter((c) => c.primaryKey)
    return (
      keyColumns.length === end.columns.length &&
      keyColumns.every((column) => end.columns.includes(column.name))
    )
  }
}

function markForeignKeys(tables: readonly Table[], relations: readonly Relation[]): Table[] {
  const foreignKeys = new Set(
    relations
      .filter((relation) => relation.hasForeignKey)
      .flatMap(({ from }) => from.columns.map((column) => columnId(from.tableKey, column)))
  )
  return tables.map((table) => ({
    ...table,
    columns: table.columns.map((column) => ({
      ...column,
      foreignKey: foreignKeys.has(columnId(table.key, column.name))
    }))
  }))
}

function columnId(key: string, column: string): string {
  return JSON.stringify([key, column])
}

function toEnum(raw: RawEnum): EnumType {
  return {
    key: enumKey(raw.schemaName, raw.name),
    displayName: displayName(raw.schemaName, raw.name),
    values: raw.values.map((value) => ({ name: value.name, note: value.note?.value ?? null }))
  }
}

function toGroup(raw: RawTableGroup, index: number): TableGroup {
  return {
    id: `group-${index}`,
    name: raw.name ?? '',
    color: raw.color ?? null,
    note: raw.note?.value ?? null,
    tableKeys: raw.tables.map((table) => tableKey(table.schemaName, table.name))
  }
}

function toNote(raw: RawNote): StickyNote {
  return {
    key: noteKey(raw.name),
    name: raw.name,
    content: raw.content,
    color: raw.color ?? null,
    range: elementRange(raw.token)
  }
}

function projectName(raw: RawProject | undefined): string | null {
  return raw && 'name' in raw ? raw.name : null
}
