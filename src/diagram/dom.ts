const NODE_KEY_ATTRIBUTE = 'data-node-key'
const RELATION_ID_ATTRIBUTE = 'data-relation-id'

export function nodeKeyProps(key: string): Record<typeof NODE_KEY_ATTRIBUTE, string> {
  return { [NODE_KEY_ATTRIBUTE]: key }
}

export function relationIdProps(id: string): Record<typeof RELATION_ID_ATTRIBUTE, string> {
  return { [RELATION_ID_ATTRIBUTE]: id }
}

export type HitTarget = { readonly kind: 'node' | 'relation'; readonly id: string }

export function nodeKeyAt(target: EventTarget | null): string | null {
  return attributeAt(target, NODE_KEY_ATTRIBUTE)
}

export function hitTargetAt(target: EventTarget | null): HitTarget | null {
  const nodeKey = attributeAt(target, NODE_KEY_ATTRIBUTE)
  if (nodeKey !== null) return { kind: 'node', id: nodeKey }
  const relationId = attributeAt(target, RELATION_ID_ATTRIBUTE)
  return relationId === null ? null : { kind: 'relation', id: relationId }
}

function attributeAt(target: EventTarget | null, attribute: string): string | null {
  if (!(target instanceof Element)) return null
  return target.closest(`[${attribute}]`)?.getAttribute(attribute) ?? null
}
