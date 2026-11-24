import { describe, expect, it } from 'vitest'
import { arrange } from '../../src/layout/arrange'
import { autoLayout, type LayoutInput } from '../../src/layout/auto-layout'
import { intersects, rectAt, type Point } from '../../src/layout/geometry'
import { shelfPack } from '../../src/layout/shelf-pack'

const SIZE = { width: 200, height: 120 }

function input(ids: readonly string[], links: [string, string][] = []): LayoutInput {
  return {
    nodes: ids.map((id) => ({ id, size: SIZE })),
    links: links.map(([from, to]) => ({ from, to })),
    clusters: []
  }
}

function assertNoOverlap(positions: ReadonlyMap<string, Point>): void {
  const rects = [...positions.values()].map((point) => rectAt(point, SIZE))
  rects.forEach((a, i) => rects.slice(i + 1).forEach((b) => expect(intersects(a, b)).toBe(false)))
}

function distance(positions: ReadonlyMap<string, Point>, a: string, b: string): number {
  const p = positions.get(a) ?? { x: 0, y: 0 }
  const q = positions.get(b) ?? { x: 0, y: 0 }
  return Math.hypot(p.x - q.x, p.y - q.y)
}

describe('autoLayout', () => {
  it('places every node without overlaps', () => {
    const positions = autoLayout(
      input(
        ['a', 'b', 'c', 'd', 'e'],
        [
          ['a', 'b'],
          ['a', 'c'],
          ['c', 'd']
        ]
      )
    )
    expect([...positions.keys()].sort()).toEqual(['a', 'b', 'c', 'd', 'e'])
    assertNoOverlap(positions)
  })

  it('ranks the start of a link left of its end', () => {
    const positions = autoLayout(input(['users', 'posts'], [['users', 'posts']]))
    expect(positions.get('users')?.x ?? 0).toBeLessThan(positions.get('posts')?.x ?? 0)
  })

  it('spreads unrelated nodes into rows instead of one column', () => {
    const ids = Array.from({ length: 16 }, (_, index) => `t${index}`)
    const positions = autoLayout(input(ids))
    expect(new Set([...positions.values()].map((point) => point.x)).size).toBeGreaterThan(2)
    expect(new Set([...positions.values()].map((point) => point.y)).size).toBeGreaterThan(2)
    assertNoOverlap(positions)
  })

  it('keeps clustered nodes next to each other', () => {
    const ids = Array.from({ length: 9 }, (_, index) => `t${index}`)
    const positions = autoLayout({ ...input(ids), clusters: [['t0', 't8']] })
    const others = ids.filter((id) => id !== 't0' && id !== 't8')
    const nearestOther = Math.min(...others.map((id) => distance(positions, 't0', id)))
    expect(distance(positions, 't0', 't8')).toBeLessThanOrEqual(nearestOther)
  })

  it('lays out nodes whose names are object keys in JavaScript', () => {
    const names = ['constructor', '__proto__', 'toString', 'hasOwnProperty']
    const positions = autoLayout(
      input(names, [
        ['constructor', '__proto__'],
        ['toString', 'hasOwnProperty']
      ])
    )
    expect(positions.size).toBe(4)
    for (const point of positions.values()) expect(Number.isFinite(point.x + point.y)).toBe(true)
    expect(Object.keys(Object.prototype)).toEqual([])
  })
})

describe('arrange', () => {
  it('keeps known positions and places new nodes to their right', () => {
    const known = new Map([['a', { x: 500, y: 40 }]])
    const positions = arrange(input(['a', 'b'], [['a', 'b']]), known)
    expect(positions.get('a')).toEqual({ x: 500, y: 40 })
    expect(positions.get('b')?.x ?? 0).toBeGreaterThan(500 + SIZE.width)
  })

  it('keeps new tables of a group together when the group already has a placed table', () => {
    const ids = Array.from({ length: 9 }, (_, index) => `t${index}`)
    const known = new Map([['t0', { x: 0, y: 0 }]])
    const positions = arrange({ ...input(ids), clusters: [['t0', 't7', 't8']] }, known)
    const others = ids.filter((id) => !['t0', 't7', 't8'].includes(id))
    const nearestOther = Math.min(...others.map((id) => distance(positions, 't7', id)))
    expect(distance(positions, 't7', 't8')).toBeLessThanOrEqual(nearestOther)
  })

  it('lays everything out when nothing is known', () => {
    const positions = arrange(input(['a', 'b']), new Map())
    expect(positions.size).toBe(2)
    assertNoOverlap(positions)
  })
})

describe('shelfPack', () => {
  it('wraps rows to stay near a wide aspect ratio', () => {
    const items = Array.from({ length: 9 }, (_, index) => ({ id: `i${index}`, size: SIZE }))
    const rows = new Set(shelfPack(items, 10).map(({ at }) => at.y))
    expect(rows.size).toBe(3)
  })
})
