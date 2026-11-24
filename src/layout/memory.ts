import { readStoredJson, writeStoredJson, type KeyValueStore } from '../storage'
import { isFinitePoint, type Point } from './geometry'

type SavedLayout = {
  readonly ids: readonly string[]
  readonly positions: Readonly<Record<string, Point>>
  readonly savedAt: number
}

const MAX_LAYOUTS = 40
const RECALL_SIMILARITY = 0.5
const SAME_DIAGRAM_SIMILARITY = 0.9

/**
 * Remembers where the person placed each diagram's nodes. A custom editor never learns the file's
 * path, so a layout is found again by how much its set of node ids overlaps the current one. A
 * diagram recalls any layout at least half like it, but only replaces a near-identical one, so
 * saving a trimmed copy of a schema never overwrites the original's layout.
 */
export class LayoutMemory {
  constructor(
    private readonly store: KeyValueStore,
    private readonly storeKey: string
  ) {}

  recall(ids: readonly string[]): Map<string, Point> {
    const match = bestMatch(this.load(), ids, RECALL_SIMILARITY)
    if (!match) return new Map()
    const wanted = new Set(ids)
    return new Map(
      Object.entries(match.positions).filter(
        (entry): entry is [string, Point] => wanted.has(entry[0]) && isFinitePoint(entry[1])
      )
    )
  }

  remember(positions: ReadonlyMap<string, Point>): void {
    const ids = [...positions.keys()]
    if (ids.length === 0) return
    const layouts = this.load()
    const replaced = bestMatch(layouts, ids, SAME_DIAGRAM_SIMILARITY)
    const saved: SavedLayout = {
      ids,
      positions: Object.fromEntries(positions),
      savedAt: Date.now()
    }
    const kept = layouts.filter((layout) => layout !== replaced)
    writeStoredJson(this.store, this.storeKey, [saved, ...kept].slice(0, MAX_LAYOUTS))
  }

  private load(): SavedLayout[] {
    const saved = readStoredJson(this.store, this.storeKey)
    return Array.isArray(saved) ? saved.filter(isSavedLayout) : []
  }
}

function bestMatch(
  layouts: readonly SavedLayout[],
  ids: readonly string[],
  minimum: number
): SavedLayout | null {
  const scored = layouts
    .map((layout) => ({ layout, score: jaccard(layout.ids, ids) }))
    .filter(({ score }) => score >= minimum)
    .sort((a, b) => b.score - a.score || b.layout.savedAt - a.layout.savedAt)
  return scored[0]?.layout ?? null
}

export function jaccard(a: readonly string[], b: readonly string[]): number {
  const left = new Set(a)
  const right = new Set(b)
  const shared = [...left].filter((id) => right.has(id)).length
  const total = new Set([...left, ...right]).size
  return total === 0 ? 0 : shared / total
}

function isSavedLayout(value: unknown): value is SavedLayout {
  if (typeof value !== 'object' || value === null) return false
  const { ids, positions, savedAt } = value as Partial<Record<keyof SavedLayout, unknown>>
  return (
    Array.isArray(ids) &&
    ids.every((id) => typeof id === 'string') &&
    typeof savedAt === 'number' &&
    typeof positions === 'object' &&
    positions !== null
  )
}
