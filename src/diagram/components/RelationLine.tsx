import { memo } from 'preact/compat'
import { relationIdProps } from '../dom'
import { DIMMED_RELATION_OPACITY } from '../emphasis'
import type { MarkerShape } from '../markers'
import type { RelationView } from '../scene'
import type { DiagramTheme } from '../theme'

export type RelationState = 'normal' | 'active' | 'dimmed'

type RelationLineProps = {
  readonly view: RelationView
  readonly theme: DiagramTheme
  readonly state: RelationState
  readonly interactive: boolean
}

const STROKE_WIDTH: Readonly<Record<RelationState, number>> = {
  normal: 1.5,
  active: 2.5,
  dimmed: 1.5
}
const OPACITY: Readonly<Record<RelationState, number>> = {
  normal: 1,
  active: 1,
  dimmed: DIMMED_RELATION_OPACITY
}
const HIT_AREA_WIDTH = 12

function RelationLineView({ view, theme, state, interactive }: RelationLineProps) {
  const { relation, route } = view
  const color = relation.color ?? (state === 'active' ? theme.relationActive : theme.relation)
  const strokeWidth = STROKE_WIDTH[state]
  return (
    <g class="dbml-relation" {...relationIdProps(relation.id)} opacity={OPACITY[state]}>
      <path d={route.path} fill="none" stroke={color} stroke-width={strokeWidth} />
      <Marker shape={view.fromMarker} color={color} strokeWidth={strokeWidth} theme={theme} />
      <Marker shape={view.toMarker} color={color} strokeWidth={strokeWidth} theme={theme} />
      {interactive ? <RelationHitArea path={route.path} label={view.label} /> : null}
    </g>
  )
}

export const RelationLine = memo(RelationLineView)

function RelationHitArea({ path, label }: { readonly path: string; readonly label: string }) {
  return (
    <path
      d={path}
      fill="none"
      stroke="transparent"
      stroke-width={HIT_AREA_WIDTH}
      pointer-events="stroke"
    >
      <title>{label}</title>
    </path>
  )
}

type MarkerProps = {
  readonly shape: MarkerShape
  readonly color: string
  readonly strokeWidth: number
  readonly theme: DiagramTheme
}

function Marker({ shape, color, strokeWidth, theme }: MarkerProps) {
  return (
    <g class="dbml-relation-marker">
      <path
        d={shape.lines}
        fill="none"
        stroke={color}
        stroke-width={strokeWidth}
        stroke-linecap="round"
      />
      {shape.circle ? (
        <MarkerCircle circle={shape.circle} color={color} strokeWidth={strokeWidth} theme={theme} />
      ) : null}
    </g>
  )
}

type MarkerCircleProps = {
  readonly circle: NonNullable<MarkerShape['circle']>
  readonly color: string
  readonly strokeWidth: number
  readonly theme: DiagramTheme
}

function MarkerCircle({ circle, color, strokeWidth, theme }: MarkerCircleProps) {
  return (
    <circle
      cx={circle.cx}
      cy={circle.cy}
      r={circle.r}
      fill={theme.canvas}
      stroke={color}
      stroke-width={strokeWidth}
    />
  )
}
