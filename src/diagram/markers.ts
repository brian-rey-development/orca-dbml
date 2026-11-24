import type { RelationEnd } from '../schema/model'
import { direction, type RouteEnd } from './routing'

export type MarkerShape = {
  readonly lines: string
  readonly circle: { readonly cx: number; readonly cy: number; readonly r: number } | null
}

const SPREAD = 7
const CROW_LENGTH = 14
const BAR_OFFSET = 10
const CIRCLE_RADIUS = 4
const CIRCLE_GAP = 6

export function markerShape(
  end: RouteEnd,
  cardinality: Pick<RelationEnd, 'many' | 'optional'>
): MarkerShape {
  const lines = cardinality.many ? crowFoot(end) : bar(end)
  if (!cardinality.optional) return { lines, circle: null }
  const reach = (cardinality.many ? CROW_LENGTH : BAR_OFFSET) + CIRCLE_GAP + CIRCLE_RADIUS
  return {
    lines,
    circle: { cx: end.point.x + direction(end.side) * reach, cy: end.point.y, r: CIRCLE_RADIUS }
  }
}

function crowFoot({ point, side }: RouteEnd): string {
  const tip = point.x + direction(side) * CROW_LENGTH
  return [
    `M ${tip} ${point.y} L ${point.x} ${point.y - SPREAD}`,
    `M ${tip} ${point.y} L ${point.x} ${point.y}`,
    `M ${tip} ${point.y} L ${point.x} ${point.y + SPREAD}`
  ].join(' ')
}

function bar({ point, side }: RouteEnd): string {
  const x = point.x + direction(side) * BAR_OFFSET
  return `M ${x} ${point.y - SPREAD} L ${x} ${point.y + SPREAD}`
}
