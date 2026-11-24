import { describe, expect, it } from 'vitest'
import {
  cardContents,
  headerCenter,
  rowCenter,
  type TextMeasure
} from '../../src/diagram/card-layout'
import { emphasisFor } from '../../src/diagram/emphasis'
import { layoutGraph } from '../../src/diagram/layout-graph'
import { adjacentTable } from '../../src/diagram/navigation'
import { buildScene } from '../../src/diagram/scene'
import { compileDbml } from '../../src/schema/compile'
import { tableKey } from '../../src/schema/keys'
import type { Schema } from '../../src/schema/model'

const fixedWidth: TextMeasure = (text) => text.length * 7

function compileSchema(source: string): Schema {
  const { schema } = compileDbml(source)
  if (!schema) throw new Error('expected a schema')
  return schema
}

const SCHEMA = compileSchema(`
  Table users { id int [pk]
    name varchar }
  Table posts { id int [pk]
    title varchar
    author_id int [ref: > users.id] }
  Table tags { id int [pk] }
  TableGroup content { posts
    tags }`)

const USERS = tableKey(null, 'users')
const POSTS = tableKey(null, 'posts')
const TAGS = tableKey(null, 'tags')

const POSITIONS = new Map([
  [USERS, { x: 0, y: 0 }],
  [POSTS, { x: 400, y: 0 }],
  [TAGS, { x: 400, y: 300 }]
])

describe('layoutGraph', () => {
  it('links referenced tables to the tables that reference them', () => {
    const contents = cardContents(SCHEMA, 'all', fixedWidth)
    expect(layoutGraph(SCHEMA, contents).links).toEqual([{ from: USERS, to: POSTS }])
  })

  it('keeps the tables of a group together', () => {
    const contents = cardContents(SCHEMA, 'all', fixedWidth)
    expect(layoutGraph(SCHEMA, contents).clusters).toEqual([[POSTS, TAGS]])
  })
})

describe('buildScene', () => {
  it('attaches a relation to the row of its column', () => {
    const scene = buildScene(SCHEMA, cardContents(SCHEMA, 'all', fixedWidth), POSITIONS)
    const authorIdRow = 2
    expect(scene.relations[0]?.route.start.point.y).toBe(rowCenter(authorIdRow))
    expect(scene.relations[0]?.label).toBe('posts.author_id > users.id')
  })

  it('attaches a relation to the header when its column is hidden', () => {
    const scene = buildScene(SCHEMA, cardContents(SCHEMA, 'none', fixedWidth), POSITIONS)
    expect(scene.relations[0]?.route.start.point.y).toBe(headerCenter())
  })

  it('frames a group around its tables', () => {
    const scene = buildScene(SCHEMA, cardContents(SCHEMA, 'all', fixedWidth), POSITIONS)
    const frame = scene.groups[0]?.rect
    const members = scene.tables.filter((view) => view.table.key !== USERS).map((view) => view.rect)
    for (const rect of members) {
      expect(frame && rect.x >= frame.x && rect.y >= frame.y).toBe(true)
      expect(frame && rect.x + rect.width <= frame.x + frame.width).toBe(true)
    }
  })

  it('leaves out nodes that have no position yet', () => {
    const scene = buildScene(
      SCHEMA,
      cardContents(SCHEMA, 'all', fixedWidth),
      new Map([[USERS, { x: 0, y: 0 }]])
    )
    expect([...scene.nodeRects.keys()]).toEqual([USERS])
    expect(scene.relations).toEqual([])
  })

  it('keeps every view a move leaves unchanged, so only the moved card redraws', () => {
    const contents = cardContents(SCHEMA, 'all', fixedWidth)
    const before = buildScene(SCHEMA, contents, POSITIONS)
    const moved = new Map(POSITIONS).set(TAGS, { x: 900, y: 900 })
    const after = buildScene(SCHEMA, contents, moved, before)
    const tagsView = (scene: typeof before) => scene.tables.find((view) => view.table.key === TAGS)
    expect(after.tables.filter((view) => before.tables.includes(view))).toHaveLength(2)
    expect(tagsView(after)).not.toBe(tagsView(before))
    expect(after.relations[0]).toBe(before.relations[0])
    expect(after.groups[0]).not.toBe(before.groups[0])
  })
})

describe('emphasisFor', () => {
  const scene = buildScene(SCHEMA, cardContents(SCHEMA, 'all', fixedWidth), POSITIONS)

  it('highlights a table, its relations and the tables at their other ends', () => {
    const emphasis = emphasisFor(scene, null, USERS)
    expect([...(emphasis?.nodes ?? [])].sort()).toEqual([POSTS, USERS].sort())
    expect(emphasis?.relations.size).toBe(1)
  })

  it('highlights a hovered relation and the two tables it joins', () => {
    const relation = scene.relations[0]?.relation.id ?? ''
    const emphasis = emphasisFor(scene, { kind: 'relation', id: relation }, TAGS)
    expect([...(emphasis?.nodes ?? [])].sort()).toEqual([POSTS, USERS].sort())
    expect([...(emphasis?.relations ?? [])]).toEqual([relation])
  })

  it('prefers what is hovered over what is selected', () => {
    const emphasis = emphasisFor(scene, { kind: 'node', id: TAGS }, USERS)
    expect([...(emphasis?.nodes ?? [])]).toEqual([TAGS])
  })

  it('highlights nothing for a node that is no longer in the diagram', () => {
    expect(emphasisFor(scene, null, tableKey(null, 'deleted'))).toBeNull()
  })
})

describe('adjacentTable', () => {
  const scene = buildScene(SCHEMA, cardContents(SCHEMA, 'all', fixedWidth), POSITIONS)

  it('walks tables top to bottom, then left to right, and wraps around', () => {
    expect(adjacentTable(scene, null, 1)).toBe(USERS)
    expect(adjacentTable(scene, USERS, 1)).toBe(POSTS)
    expect(adjacentTable(scene, POSTS, 1)).toBe(TAGS)
    expect(adjacentTable(scene, TAGS, 1)).toBe(USERS)
    expect(adjacentTable(scene, USERS, -1)).toBe(TAGS)
    expect(adjacentTable(scene, null, -1)).toBe(TAGS)
  })
})
