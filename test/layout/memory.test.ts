import { afterEach, describe, expect, it, vi } from 'vitest'
import { LayoutMemory, jaccard } from '../../src/layout/memory'
import type { KeyValueStore } from '../../src/storage'

const KEY = 'layouts'

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>()
  return { read: (key) => data.get(key) ?? null, write: (key, value) => void data.set(key, value) }
}

function positions(...ids: string[]): Map<string, { x: number; y: number }> {
  return new Map(ids.map((id, index) => [id, { x: index, y: index }]))
}

afterEach(() => {
  vi.useRealTimers()
})

describe('LayoutMemory', () => {
  it('recalls positions for a similar set of nodes', () => {
    const memory = new LayoutMemory(memoryStore(), KEY)
    memory.remember(positions('users', 'posts', 'tags'))
    const recalled = memory.recall(['users', 'posts', 'tags', 'comments'])
    expect([...recalled.keys()].sort()).toEqual(['posts', 'tags', 'users'])
  })

  it('ignores layouts of unrelated diagrams', () => {
    const memory = new LayoutMemory(memoryStore(), KEY)
    memory.remember(positions('users'))
    expect(memory.recall(['invoices', 'payments']).size).toBe(0)
  })

  it('updates a diagram it already knows', () => {
    const memory = new LayoutMemory(memoryStore(), KEY)
    memory.remember(new Map([['a', { x: 0, y: 0 }]]))
    memory.remember(new Map([['a', { x: 9, y: 9 }]]))
    expect(memory.recall(['a']).get('a')).toEqual({ x: 9, y: 9 })
  })

  it('never lets a trimmed copy of a diagram overwrite the original', () => {
    const memory = new LayoutMemory(memoryStore(), KEY)
    memory.remember(positions('users', 'orders', 'items'))
    memory.remember(positions('users', 'orders'))
    expect(memory.recall(['users', 'orders', 'items']).has('items')).toBe(true)
  })

  it('forgets the oldest diagrams once it is full', () => {
    vi.useFakeTimers()
    const memory = new LayoutMemory(memoryStore(), KEY)
    const diagrams = 200
    for (let index = 0; index < diagrams; index += 1) {
      vi.advanceTimersByTime(1000)
      memory.remember(positions(`diagram-${index}`))
    }
    expect(memory.recall(['diagram-0']).size).toBe(0)
    expect(memory.recall([`diagram-${diagrams - 1}`]).size).toBe(1)
  })

  it('survives storage that does not hold a layout list', () => {
    const corrupt: KeyValueStore = { read: () => '{not json', write: () => undefined }
    expect(new LayoutMemory(corrupt, KEY).recall(['a']).size).toBe(0)
  })

  it('drops positions that are not numbers', () => {
    const memory = new LayoutMemory(memoryStore(), KEY)
    memory.remember(
      new Map([
        ['a', { x: 1, y: 2 }],
        ['b', { x: Number.NaN, y: 2 }]
      ])
    )
    expect([...memory.recall(['a', 'b']).keys()]).toEqual(['a'])
  })
})

describe('jaccard', () => {
  it('measures overlap between id sets', () => {
    expect(jaccard(['a', 'b'], ['b', 'c'])).toBeCloseTo(1 / 3)
    expect(jaccard([], [])).toBe(0)
  })
})
