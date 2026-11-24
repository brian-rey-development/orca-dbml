import { memo } from 'preact/compat'
import { NOTE_CARD } from '../card-layout'
import { nodeKeyProps } from '../dom'
import { DIMMED_OPACITY } from '../emphasis'
import type { NoteView } from '../scene'
import { fontAttributes } from '../text-measure'
import { textOnFill } from '../contrast'
import type { DiagramTheme } from '../theme'

type NoteCardProps = {
  readonly view: NoteView
  readonly theme: DiagramTheme
  readonly dimmed: boolean
}

function NoteCardView({ view, theme, dimmed }: NoteCardProps) {
  const { note, rect, lines } = view
  const fill = note.color ?? theme.noteFill
  const textColor = textOnFill(note.color, theme.noteText)
  return (
    <g
      class="dbml-note"
      {...nodeKeyProps(note.key)}
      transform={`translate(${rect.x} ${rect.y})`}
      opacity={dimmed ? DIMMED_OPACITY : 1}
    >
      <rect width={rect.width} height={rect.height} rx={NOTE_CARD.cornerRadius} fill={fill} />
      <NoteTitle name={note.name} color={textColor} theme={theme} />
      <NoteLines lines={lines} color={textColor} theme={theme} />
    </g>
  )
}

type NoteTextProps = {
  readonly color: string
  readonly theme: DiagramTheme
}

function NoteTitle({ name, color, theme }: NoteTextProps & { readonly name: string }) {
  const { titleHeight, padding } = NOTE_CARD
  return (
    <text
      x={padding}
      y={(padding + titleHeight) / 2}
      dominant-baseline="central"
      fill={color}
      {...fontAttributes('title', theme)}
    >
      {name}
    </text>
  )
}

function NoteLines({ lines, color, theme }: NoteTextProps & { readonly lines: readonly string[] }) {
  const { titleHeight, lineHeight, padding } = NOTE_CARD
  return (
    <>
      {lines.map((line, index) => (
        <text
          key={index}
          x={padding}
          y={titleHeight + index * lineHeight + lineHeight / 2}
          dominant-baseline="central"
          fill={color}
          {...fontAttributes('note', theme)}
        >
          {line}
        </text>
      ))}
    </>
  )
}

export const NoteCard = memo(NoteCardView)
