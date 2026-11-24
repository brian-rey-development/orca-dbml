import { boundsOf, inflate, rectAt, sameRect, type Point, type Rect } from '../layout/geometry'
import type {
  Column,
  Relation,
  RelationEnd,
  Schema,
  StickyNote,
  Table,
  TableGroup
} from '../schema/model'
import { GROUP_FRAME, headerCenter, rowCenter, type CardContents } from './card-layout'
import { describeRelation } from './labels'
import { markerShape, type MarkerShape } from './markers'
import { route, type Anchor, type Route } from './routing'

export type TableView = {
  readonly table: Table
  readonly rect: Rect
  readonly columns: readonly Column[]
}

export type NoteView = {
  readonly note: StickyNote
  readonly rect: Rect
  readonly lines: readonly string[]
}

export type RelationView = {
  readonly relation: Relation
  readonly label: string
  readonly route: Route
  readonly fromMarker: MarkerShape
  readonly toMarker: MarkerShape
}

export type GroupView = {
  readonly group: TableGroup
  readonly rect: Rect
}

/** Everything the diagram draws, in world coordinates. */
export type Scene = {
  readonly tables: readonly TableView[]
  readonly notes: readonly NoteView[]
  readonly relations: readonly RelationView[]
  readonly groups: readonly GroupView[]
  /** Where each table and note sits, by its node key. */
  readonly nodeRects: ReadonlyMap<string, Rect>
  readonly bounds: Rect | null
}

export const EMPTY_SCENE: Scene = {
  tables: [],
  notes: [],
  relations: [],
  groups: [],
  nodeRects: new Map(),
  bounds: null
}

/**
 * Every view that would draw exactly as it does in `previous` is that same object, so components
 * memoized on their props redraw only what changed, such as the cards a drag moves.
 */
export function buildScene(
  schema: Schema,
  contents: CardContents,
  positions: ReadonlyMap<string, Point>,
  previous: Scene = EMPTY_SCENE
): Scene {
  const fresh = freshViews(schema, contents, positions)
  const tables = reuse(previous.tables, fresh.tables, sameTableView)
  const notes = reuse(previous.notes, fresh.notes, sameNoteView)
  const groups = reuse(previous.groups, fresh.groups, sameGroupView)
  return {
    tables,
    notes,
    groups,
    relations: reuse(previous.relations, fresh.relations, sameRelationView),
    nodeRects: new Map([
      ...tables.map((view): [string, Rect] => [view.table.key, view.rect]),
      ...notes.map((view): [string, Rect] => [view.note.key, view.rect])
    ]),
    bounds: boundsOf([...groups, ...tables, ...notes].map((view) => view.rect))
  }
}

type Views = Pick<Scene, 'tables' | 'notes' | 'groups' | 'relations'>

function freshViews(
  schema: Schema,
  contents: CardContents,
  positions: ReadonlyMap<string, Point>
): Views {
  const tables = schema.tables.flatMap((table) => tableView(table, contents, positions))
  const tablesByKey = new Map(tables.map((view) => [view.table.key, view]))
  return {
    tables,
    notes: schema.notes.flatMap((note) => noteView(note, contents, positions)),
    groups: schema.groups.flatMap((group) => groupView(group, tablesByKey)),
    relations: schema.relations.flatMap((relation) => relationView(relation, tablesByKey))
  }
}

function reuse<View>(
  previous: readonly View[],
  next: readonly View[],
  same: (a: View, b: View) => boolean
): View[] {
  return next.map((view, index) => {
    const old = previous[index]
    return old !== undefined && same(old, view) ? old : view
  })
}

function sameTableView(a: TableView, b: TableView): boolean {
  return a.table === b.table && a.columns === b.columns && sameRect(a.rect, b.rect)
}

function sameNoteView(a: NoteView, b: NoteView): boolean {
  return a.note === b.note && a.lines === b.lines && sameRect(a.rect, b.rect)
}

function sameGroupView(a: GroupView, b: GroupView): boolean {
  return a.group === b.group && sameRect(a.rect, b.rect)
}

function sameRelationView(a: RelationView, b: RelationView): boolean {
  return a.relation === b.relation && a.label === b.label && a.route.path === b.route.path
}

function tableView(
  table: Table,
  contents: CardContents,
  positions: ReadonlyMap<string, Point>
): TableView[] {
  const content = contents.tables.get(table.key)
  const point = positions.get(table.key)
  if (!content || !point) return []
  return [{ table, rect: rectAt(point, content.size), columns: content.columns }]
}

function noteView(
  note: StickyNote,
  contents: CardContents,
  positions: ReadonlyMap<string, Point>
): NoteView[] {
  const content = contents.notes.get(note.key)
  const point = positions.get(note.key)
  if (!content || !point) return []
  return [{ note, rect: rectAt(point, content.size), lines: content.lines }]
}

function groupView(group: TableGroup, tables: ReadonlyMap<string, TableView>): GroupView[] {
  const bounds = boundsOf(group.tableKeys.flatMap((key) => tables.get(key)?.rect ?? []))
  if (!bounds) return []
  const padded = inflate(bounds, GROUP_FRAME.padding)
  const { labelHeight } = GROUP_FRAME
  return [
    {
      group,
      rect: { ...padded, y: padded.y - labelHeight, height: padded.height + labelHeight }
    }
  ]
}

function relationView(relation: Relation, tables: ReadonlyMap<string, TableView>): RelationView[] {
  const fromView = tables.get(relation.from.tableKey)
  const toView = tables.get(relation.to.tableKey)
  if (!fromView || !toView) return []
  const path = route(anchorFor(relation.from, fromView), anchorFor(relation.to, toView))
  const tableNames = { from: fromView.table.displayName, to: toView.table.displayName }
  return [
    {
      relation,
      label: describeRelation(relation, tableNames),
      route: path,
      fromMarker: markerShape(path.start, relation.from),
      toMarker: markerShape(path.end, relation.to)
    }
  ]
}

function anchorFor(end: RelationEnd, view: TableView): Anchor {
  const row = view.columns.findIndex((column) => column.name === end.columns[0])
  const offset = row === -1 ? headerCenter() : rowCenter(row)
  return { nodeId: view.table.key, rect: view.rect, y: view.rect.y + offset }
}
