import type { Column, Relation, RelationEnd, RelationKind } from '../schema/model'

const OPERATORS: Readonly<Record<RelationKind, string>> = {
  'many-to-one': '>',
  'one-to-one': '-',
  'many-to-many': '<>'
}

export function describeRelation(
  relation: Relation,
  tableNames: { readonly from: string; readonly to: string }
): string {
  const end = (tableName: string, side: RelationEnd): string => {
    const columns = side.columns.length === 1 ? side.columns[0] : `(${side.columns.join(', ')})`
    return `${tableName}.${columns}`
  }
  const from = end(tableNames.from, relation.from)
  const lines = [`${from} ${OPERATORS[relation.kind]} ${end(tableNames.to, relation.to)}`]
  if (relation.name) lines.unshift(relation.name)
  if (relation.onDelete) lines.push(`on delete ${relation.onDelete}`)
  if (relation.onUpdate) lines.push(`on update ${relation.onUpdate}`)
  return lines.join('\n')
}

export function describeColumn(column: Column): string {
  const traits = [
    column.primaryKey ? 'primary key' : null,
    column.foreignKey ? 'foreign key' : null,
    column.notNull ? 'not null' : null,
    column.unique ? 'unique' : null,
    column.increment ? 'increment' : null,
    column.defaultValue ? `default ${column.defaultValue}` : null
  ].filter((trait) => trait !== null)
  const lines = [`${column.name}: ${column.type}`]
  if (traits.length > 0) lines.push(traits.join(', '))
  if (column.enumValues) lines.push(`one of ${column.enumValues.join(', ')}`)
  if (column.note) lines.push(column.note)
  return lines.join('\n')
}
