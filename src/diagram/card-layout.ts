import type { Size } from '../layout/geometry'
import type { Column, Schema, StickyNote, Table } from '../schema/model'

export type TextStyle = 'title' | 'name' | 'key' | 'type' | 'note'

export type TextMeasure = (text: string, style: TextStyle) => number

export const COLUMN_VISIBILITIES = ['all', 'keys', 'none'] as const

export type ColumnVisibility = (typeof COLUMN_VISIBILITIES)[number]

export const TEXT_STYLES: Readonly<
  Record<TextStyle, { readonly size: number; readonly weight: number; readonly mono: boolean }>
> = {
  title: { size: 13, weight: 600, mono: false },
  name: { size: 12, weight: 400, mono: false },
  key: { size: 12, weight: 600, mono: false },
  type: { size: 12, weight: 400, mono: true },
  note: { size: 12, weight: 400, mono: false }
}

export const TABLE_CARD = {
  headerHeight: 36,
  rowHeight: 28,
  paddingX: 12,
  iconSlot: 20,
  iconSize: 13,
  columnGap: 24,
  minWidth: 180,
  maxWidth: 420,
  cornerRadius: 8,
  minTypeShare: 0.35
} as const

export const NOTE_CARD = {
  width: 220,
  titleHeight: 30,
  lineHeight: 18,
  padding: 12,
  maxLines: 12,
  cornerRadius: 6
} as const

export const GROUP_FRAME = {
  padding: 24,
  labelHeight: 28,
  labelInsetX: 14,
  labelBaseline: 19,
  cornerRadius: 12
} as const

const ELLIPSIS = '…'
// Cuts fall between characters as people see them, never inside an emoji or an accented letter.
const CHARACTERS = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
/** The part of a column row that is not text: both paddings, the key icon and the name-type gap. */
export const ROW_CHROME = TABLE_CARD.paddingX * 2 + TABLE_CARD.iconSlot + TABLE_CARD.columnGap

export function visibleColumns(table: Table, visibility: ColumnVisibility): readonly Column[] {
  if (visibility === 'all') return table.columns
  if (visibility === 'none') return []
  return table.columns.filter((column) => column.primaryKey || column.foreignKey)
}

/** Primary key names are drawn bold, so they are measured bold too. */
export function columnNameStyle(column: Column): TextStyle {
  return column.primaryKey ? 'key' : 'name'
}

export function measureTable(table: Table, columns: readonly Column[], measure: TextMeasure): Size {
  const { headerHeight, rowHeight, minWidth, maxWidth } = TABLE_CARD
  const titleWidth = measure(table.displayName, 'title') + headerChrome(table)
  const rowWidths = columns.map(
    (column) =>
      ROW_CHROME + measure(column.name, columnNameStyle(column)) + measure(column.type, 'type')
  )
  const width = rowWidths.reduce(
    (widest, row) => Math.max(widest, row),
    Math.max(minWidth, titleWidth)
  )
  return {
    width: Math.min(maxWidth, Math.ceil(width)),
    height: headerHeight + columns.length * rowHeight
  }
}

export function rowTop(index: number): number {
  return TABLE_CARD.headerHeight + index * TABLE_CARD.rowHeight
}

export function rowCenter(index: number): number {
  return rowTop(index) + TABLE_CARD.rowHeight / 2
}

export function headerCenter(): number {
  return TABLE_CARD.headerHeight / 2
}

export type ColumnText = {
  readonly name: string
  readonly type: string
}

/** A column's name and type, shortened to share a row of `width`; the type keeps room first. */
export function columnText(column: Column, width: number, measure: TextMeasure): ColumnText {
  const contentWidth = width - ROW_CHROME
  const nameStyle = columnNameStyle(column)
  const typeRoom = Math.max(
    width * TABLE_CARD.minTypeShare,
    contentWidth - measure(column.name, nameStyle)
  )
  const type = fitText(column.type, typeRoom, 'type', measure)
  const name = fitText(column.name, contentWidth - measure(type, 'type'), nameStyle, measure)
  return { name, type }
}

export function tableTitle(table: Table, width: number, measure: TextMeasure): string {
  return fitText(table.displayName, width - headerChrome(table), 'title', measure)
}

/** The header's room beside the title: its padding, and the note marker when there is a note. */
function headerChrome(table: Table): number {
  return TABLE_CARD.paddingX * 2 + (table.note ? TABLE_CARD.iconSlot : 0)
}

export function fitText(
  text: string,
  maxWidth: number,
  style: TextStyle,
  measure: TextMeasure
): string {
  if (measure(text, style) <= maxWidth) return text
  const characters = Array.from(CHARACTERS.segment(text), ({ segment }) => segment)
  const shortened = (count: number): string => characters.slice(0, count).join('') + ELLIPSIS
  let fits = 0
  let tooLong = characters.length
  while (tooLong - fits > 1) {
    const middle = Math.floor((fits + tooLong) / 2)
    if (measure(shortened(middle), style) <= maxWidth) fits = middle
    else tooLong = middle
  }
  return shortened(Math.max(fits, 1))
}

/** A note cut short ends its last line with an ellipsis; a word too long for a line is clipped. */
export function noteLines(note: StickyNote, measure: TextMeasure): readonly string[] {
  const room = NOTE_CARD.width - NOTE_CARD.padding * 2
  const wrapped = wrapWords(note.content, (line) => measure(line, 'note') <= room)
  const cut = wrapped.length > NOTE_CARD.maxLines
  const shown = wrapped.slice(0, NOTE_CARD.maxLines)
  return shown.map((line, index) => {
    const marked = cut && index === shown.length - 1 ? `${line}${ELLIPSIS}` : line
    return fitText(marked, room, 'note', measure)
  })
}

function wrapWords(content: string, fits: (line: string) => boolean): string[] {
  const lines: string[] = []
  for (const paragraph of content.split('\n')) {
    let startsParagraph = true
    for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
      appendWord(lines, word, startsParagraph, fits)
      startsParagraph = false
      if (lines.length > NOTE_CARD.maxLines) return lines
    }
  }
  return lines
}

function appendWord(
  lines: string[],
  word: string,
  startsParagraph: boolean,
  fits: (line: string) => boolean
): void {
  const last = lines[lines.length - 1]
  if (last !== undefined && !startsParagraph && fits(`${last} ${word}`)) {
    lines[lines.length - 1] = `${last} ${word}`
  } else {
    lines.push(word)
  }
}

function measureNote(lines: readonly string[]): Size {
  const { width, titleHeight, lineHeight, padding } = NOTE_CARD
  return { width, height: titleHeight + lines.length * lineHeight + padding }
}

export type TableCardContent = {
  readonly size: Size
  readonly columns: readonly Column[]
}

export type NoteCardContent = {
  readonly size: Size
  readonly lines: readonly string[]
}

/** What every card shows and how big it is, worked out once per schema and column choice. */
export type CardContents = {
  readonly tables: ReadonlyMap<string, TableCardContent>
  readonly notes: ReadonlyMap<string, NoteCardContent>
}

export function cardContents(
  schema: Schema,
  visibility: ColumnVisibility,
  measure: TextMeasure
): CardContents {
  return {
    tables: new Map(
      schema.tables.map((table) => [table.key, tableContent(table, visibility, measure)])
    ),
    notes: new Map(schema.notes.map((note) => [note.key, noteContent(note, measure)]))
  }
}

function tableContent(
  table: Table,
  visibility: ColumnVisibility,
  measure: TextMeasure
): TableCardContent {
  const columns = visibleColumns(table, visibility)
  return { columns, size: measureTable(table, columns, measure) }
}

function noteContent(note: StickyNote, measure: TextMeasure): NoteCardContent {
  const lines = noteLines(note, measure)
  return { lines, size: measureNote(lines) }
}
