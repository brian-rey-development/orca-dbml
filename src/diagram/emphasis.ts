import type { HitTarget } from './dom'
import type { Scene } from './scene'

/** What stays fully visible while something is hovered or selected; everything else dims. */
export type Emphasis = {
  readonly nodes: ReadonlySet<string>
  readonly relations: ReadonlySet<string>
}

export const DIMMED_OPACITY = 0.3
export const DIMMED_RELATION_OPACITY = 0.2

export function emphasisFor(
  scene: Scene,
  hover: HitTarget | null,
  selectedKey: string | null
): Emphasis | null {
  if (hover?.kind === 'relation') return relationEmphasis(scene, hover.id)
  return nodeEmphasis(scene, hover?.id ?? selectedKey)
}

function nodeEmphasis(scene: Scene, key: string | null): Emphasis | null {
  if (key === null || !scene.nodeRects.has(key)) return null
  const touching = scene.relations.filter(
    ({ relation }) => relation.from.tableKey === key || relation.to.tableKey === key
  )
  return {
    relations: new Set(touching.map(({ relation }) => relation.id)),
    nodes: new Set([
      key,
      ...touching.flatMap(({ relation }) => [relation.from.tableKey, relation.to.tableKey])
    ])
  }
}

function relationEmphasis(scene: Scene, id: string): Emphasis | null {
  const view = scene.relations.find(({ relation }) => relation.id === id)
  if (!view) return null
  return {
    relations: new Set([id]),
    nodes: new Set([view.relation.from.tableKey, view.relation.to.tableKey])
  }
}
