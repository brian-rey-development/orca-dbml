import type { LayoutInput } from '../layout/auto-layout'
import type { Schema } from '../schema/model'
import type { CardContents } from './card-layout'

/** The schema as a graph to lay out: referenced tables rank before the tables that reference them. */
export function layoutGraph(schema: Schema, contents: CardContents): LayoutInput {
  return {
    nodes: [...contents.tables, ...contents.notes].map(([id, { size }]) => ({ id, size })),
    links: schema.relations.map(({ from, to }) => ({ from: to.tableKey, to: from.tableKey })),
    clusters: schema.groups.map((group) => group.tableKeys)
  }
}
