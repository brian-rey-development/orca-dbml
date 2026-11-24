import type { Point, Size } from './geometry'

export type PackItem = {
  readonly size: Size
}

export type Packed<Item> = {
  readonly item: Item
  readonly at: Point
}

const TARGET_ASPECT = 16 / 10

type Shelf = {
  readonly x: number
  readonly y: number
  readonly height: number
}

export function shelfPack<Item extends PackItem>(
  items: readonly Item[],
  gap: number
): Packed<Item>[] {
  const ordered = [...items].sort(
    (a, b) => b.size.height - a.size.height || b.size.width - a.size.width
  )
  const rowLimit = rowWidthLimit(ordered, gap)
  const placed: Packed<Item>[] = []
  let shelf: Shelf = { x: 0, y: 0, height: 0 }
  for (const item of ordered) {
    const { size } = item
    if (shelf.x > 0 && shelf.x + size.width > rowLimit) {
      shelf = { x: 0, y: shelf.y + shelf.height + gap, height: 0 }
    }
    placed.push({ item, at: { x: shelf.x, y: shelf.y } })
    shelf = {
      x: shelf.x + size.width + gap,
      y: shelf.y,
      height: Math.max(shelf.height, size.height)
    }
  }
  return placed
}

function rowWidthLimit(items: readonly PackItem[], gap: number): number {
  const area = items.reduce((sum, { size }) => sum + (size.width + gap) * (size.height + gap), 0)
  const widest = Math.max(0, ...items.map(({ size }) => size.width))
  return Math.max(widest, Math.sqrt(area * TARGET_ASPECT))
}
