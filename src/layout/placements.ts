import { arrange } from './arrange'
import { autoLayout, type LayoutInput } from './auto-layout'
import type { Point } from './geometry'
import type { LayoutMemory } from './memory'

/**
 * Where a diagram's nodes sit during one editor session. A node keeps its place, given by the
 * person or by the first layout, even while an edit hides it for a moment; a new node is placed
 * once, beside the others; a node renamed in place (one disappears as one appears) keeps its spot.
 * Only the person's own choices, a move or a rearrange, are remembered across sessions, and each
 * one bumps `revision` and tells subscribers, whose next `resolve` reflects it.
 */
export class Placements {
  private readonly positions = new Map<string, Point>()
  private readonly listeners = new Set<() => void>()
  private shownIds: readonly string[] = []
  private recalled = false
  private changes = 0

  constructor(private readonly memory: LayoutMemory) {}

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  readonly revision = (): number => this.changes

  resolve(input: LayoutInput): ReadonlyMap<string, Point> {
    const ids = input.nodes.map((node) => node.id)
    this.recallOnce(ids)
    this.carryOverRename(ids)
    const placed = arrange(input, this.positions)
    placed.forEach((point, id) => this.positions.set(id, point))
    this.shownIds = ids
    return placed
  }

  readonly move = (id: string, point: Point): void => {
    this.positions.set(id, point)
    this.changed()
  }

  rearrange(input: LayoutInput): void {
    autoLayout(input).forEach((point, id) => this.positions.set(id, point))
    this.save()
    this.changed()
  }

  readonly save = (): void => {
    this.memory.remember(
      new Map(
        this.shownIds.flatMap((id): [string, Point][] => {
          const point = this.positions.get(id)
          return point ? [[id, point]] : []
        })
      )
    )
  }

  private changed(): void {
    this.changes += 1
    this.listeners.forEach((listener) => listener())
  }

  private recallOnce(ids: readonly string[]): void {
    if (this.recalled || ids.length === 0) return
    this.memory.recall(ids).forEach((point, id) => this.positions.set(id, point))
    this.recalled = true
  }

  private carryOverRename(ids: readonly string[]): void {
    const current = new Set(ids)
    const appeared = ids.filter((id) => !this.positions.has(id))
    const disappeared = this.shownIds.filter((id) => !current.has(id))
    const [renamedTo] = appeared
    const [renamedFrom] = disappeared
    if (appeared.length !== 1 || disappeared.length !== 1) return
    if (renamedTo === undefined || renamedFrom === undefined) return
    const point = this.positions.get(renamedFrom)
    if (point) this.positions.set(renamedTo, point)
  }
}
