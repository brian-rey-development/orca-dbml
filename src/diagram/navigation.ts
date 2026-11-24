import type { Scene } from './scene'

export type Step = 1 | -1

export function adjacentTable(scene: Scene, currentKey: string | null, step: Step): string | null {
  const ordered = [...scene.tables]
    .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x)
    .map((view) => view.table.key)
  if (ordered.length === 0) return null
  const index = currentKey === null ? -1 : ordered.indexOf(currentKey)
  if (index === -1) return step === 1 ? (ordered[0] ?? null) : (ordered[ordered.length - 1] ?? null)
  return ordered[(index + step + ordered.length) % ordered.length] ?? null
}
