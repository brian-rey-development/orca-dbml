import { memo } from 'preact/compat'
import type { Rect } from '../../layout/geometry'
import { tooltipProps } from '../../tooltip'
import { GROUP_FRAME } from '../card-layout'
import type { GroupView } from '../scene'
import { fontAttributes } from '../text-measure'
import type { DiagramTheme } from '../theme'

type GroupFrameProps = {
  readonly view: GroupView
  readonly theme: DiagramTheme
}

const FILL_OPACITY = 0.08
const STROKE_OPACITY = 0.45

function GroupFrameView({ view, theme }: GroupFrameProps) {
  const { group, rect } = view
  const tint = group.color ?? theme.groupTint
  return (
    <g class="dbml-group" {...tooltipProps(group.note)}>
      <GroupBox rect={rect} tint={tint} />
      <GroupLabel group={group} rect={rect} theme={theme} />
    </g>
  )
}

function GroupBox({ rect, tint }: { readonly rect: Rect; readonly tint: string }) {
  return (
    <rect
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      rx={GROUP_FRAME.cornerRadius}
      fill={tint}
      fill-opacity={FILL_OPACITY}
      stroke={tint}
      stroke-opacity={STROKE_OPACITY}
    />
  )
}

type GroupLabelProps = {
  readonly group: GroupView['group']
  readonly rect: Rect
  readonly theme: DiagramTheme
}

function GroupLabel({ group, rect, theme }: GroupLabelProps) {
  const { labelInsetX, labelBaseline } = GROUP_FRAME
  return (
    <text
      x={rect.x + labelInsetX}
      y={rect.y + labelBaseline}
      fill={group.color ?? theme.mutedText}
      {...fontAttributes('title', theme)}
    >
      {group.name}
    </text>
  )
}

export const GroupFrame = memo(GroupFrameView)
