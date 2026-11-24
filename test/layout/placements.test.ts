import { describe, expect, it } from 'vitest'
import type { LayoutInput } from '../../src/layout/auto-layout'
import { LayoutMemory } from '../../src/layout/memory'
import { Placements } from '../../src/layout/placements'
import type { KeyValueStore } from '../../src/storage'

const KEY = 'layouts'
const SIZE = { width: 200, height: 100 }

function graph(...ids: string[]): LayoutInput {
  return { nodes: ids.map((id) => ({ id, size: SIZE })), links: [], clusters: [] }
}

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>()
  return { read: (key) => data.get(key) ?? null, write: (key, value) => void data.set(key, value) }
}

describe('Placements', () => {
  it('keeps a moved node where the person put it as the schema changes', () => {
    const placements = new Placements(new LayoutMemory(memoryStore(), KEY))
    placements.resolve(graph('a', 'b'))
    placements.move('a', { x: 999, y: 999 })
    expect(placements.resolve(graph('a', 'b', 'c')).get('a')).toEqual({ x: 999, y: 999 })
  })

  it('gives a node back its place when an edit hides it for a moment', () => {
    const placements = new Placements(new LayoutMemory(memoryStore(), KEY))
    placements.resolve(graph('a', 'b', 'c'))
    placements.move('c', { x: 700, y: 300 })
    placements.resolve(graph('a', 'b'))
    placements.resolve(graph('a', 'b', 'x', 'y'))
    expect(placements.resolve(graph('a', 'b', 'c')).get('c')).toEqual({ x: 700, y: 300 })
  })

  it('keeps the place of a node renamed in place', () => {
    const placements = new Placements(new LayoutMemory(memoryStore(), KEY))
    placements.resolve(graph('users', 'posts'))
    placements.move('users', { x: 400, y: 50 })
    expect(placements.resolve(graph('members', 'posts')).get('members')).toEqual({ x: 400, y: 50 })
  })

  it('remembers only the person’s own choices across sessions', () => {
    const store = memoryStore()
    const placements = new Placements(new LayoutMemory(store, KEY))
    placements.resolve(graph('a', 'b'))
    placements.resolve(graph('a', 'b', 'c'))
    expect(store.read(KEY)).toBeNull()
    placements.move('a', { x: 10, y: 10 })
    placements.save()
    const nextSession = new Placements(new LayoutMemory(store, KEY))
    expect(nextSession.resolve(graph('a', 'b', 'c')).get('a')).toEqual({ x: 10, y: 10 })
  })

  it('tells subscribers about each move and rearrange', () => {
    const placements = new Placements(new LayoutMemory(memoryStore(), KEY))
    let notices = 0
    placements.subscribe(() => {
      notices += 1
    })
    placements.resolve(graph('a', 'b'))
    placements.move('a', { x: 5, y: 5 })
    placements.rearrange(graph('a', 'b'))
    expect(notices).toBe(2)
    expect(placements.revision()).toBe(2)
  })

  it('lays the diagram out afresh on rearrange and remembers it', () => {
    const store = memoryStore()
    const placements = new Placements(new LayoutMemory(store, KEY))
    placements.resolve(graph('a', 'b'))
    placements.move('a', { x: 5000, y: 5000 })
    placements.rearrange(graph('a', 'b'))
    const arranged = placements.resolve(graph('a', 'b')).get('a')
    expect(arranged).not.toEqual({ x: 5000, y: 5000 })
    const nextSession = new Placements(new LayoutMemory(store, KEY))
    expect(nextSession.resolve(graph('a', 'b')).get('a')).toEqual(arranged)
  })

  it('recalls a saved layout once nodes appear, even after an empty start', () => {
    const store = memoryStore()
    const placements = new Placements(new LayoutMemory(store, KEY))
    placements.resolve(graph('a', 'b'))
    placements.move('a', { x: 10, y: 10 })
    placements.save()
    const nextSession = new Placements(new LayoutMemory(store, KEY))
    nextSession.resolve(graph())
    expect(nextSession.resolve(graph('a', 'b')).get('a')).toEqual({ x: 10, y: 10 })
  })

  it('saves only the nodes on show, not those an edit has hidden', () => {
    const store = memoryStore()
    const placements = new Placements(new LayoutMemory(store, KEY))
    placements.resolve(graph('a', 'b', 'c'))
    placements.move('c', { x: 700, y: 300 })
    placements.resolve(graph('a', 'b'))
    placements.save()
    const nextSession = new Placements(new LayoutMemory(store, KEY))
    expect(nextSession.resolve(graph('a', 'b', 'c')).get('c')).not.toEqual({ x: 700, y: 300 })
  })
})
