import { describe, expect, it } from 'vitest'
import {
  NOTE_CARD,
  ROW_CHROME,
  TABLE_CARD,
  columnText,
  fitText,
  measureTable,
  noteLines,
  tableTitle,
  visibleColumns,
  type TextMeasure
} from '../../src/diagram/card-layout'
import { compileDbml } from '../../src/schema/compile'
import type { StickyNote } from '../../src/schema/model'

const CHARACTER_WIDTH = 7
const fixedWidth: TextMeasure = (text) => text.length * CHARACTER_WIDTH

const { schema } = compileDbml(`
  Table users { id int [pk]
    name varchar
    a_very_long_column_name_that_goes_on_and_on character_varying_with_a_long_type_name }
  Table posts { id int [pk]
    author_id int [ref: > users.id]
    body text }`)
const [users, posts] = schema?.tables ?? []

function note(content: string): StickyNote {
  return {
    key: 'n',
    name: 'n',
    content,
    color: null,
    range: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }
  }
}

describe('visibleColumns', () => {
  it('shows every column, only keys, or none', () => {
    if (!posts) throw new Error('expected posts')
    expect(visibleColumns(posts, 'all').map((c) => c.name)).toEqual(['id', 'author_id', 'body'])
    expect(visibleColumns(posts, 'keys').map((c) => c.name)).toEqual(['id', 'author_id'])
    expect(visibleColumns(posts, 'none')).toEqual([])
  })
})

describe('measureTable', () => {
  it('grows with its content but never past the maximum width', () => {
    if (!users) throw new Error('expected users')
    const size = measureTable(users, users.columns, fixedWidth)
    expect(size.width).toBe(TABLE_CARD.maxWidth)
    expect(size.height).toBe(TABLE_CARD.headerHeight + users.columns.length * TABLE_CARD.rowHeight)
    expect(measureTable(users, [], fixedWidth).width).toBe(TABLE_CARD.minWidth)
  })

  it('measures primary key names in the bold style they are drawn in', () => {
    if (!posts) throw new Error('expected posts')
    const BOLD_KEY_WIDTH = 300
    const boldIsWider: TextMeasure = (text, style) =>
      style === 'key' ? BOLD_KEY_WIDTH : fixedWidth(text, style)
    const key = posts.columns.filter((column) => column.primaryKey)
    expect(measureTable(posts, key, boldIsWider).width).toBeGreaterThan(
      measureTable(posts, key, fixedWidth).width
    )
  })
})

describe('a table note', () => {
  const title = 'a_table_name_long_enough_to_set_the_card_width'
  const [plain, noted] =
    compileDbml(`Table ${title} { id int }
      Table ${title}_2 [note: 'Kept for audits'] { id int }`).schema?.tables ?? []

  it('widens the card by the note marker, so the title still fits beside it', () => {
    if (!plain || !noted) throw new Error('expected both tables')
    const extraTitle = CHARACTER_WIDTH * '_2'.length
    expect(measureTable(noted, [], fixedWidth).width).toBe(
      measureTable(plain, [], fixedWidth).width + extraTitle + TABLE_CARD.iconSlot
    )
    const width = measureTable(noted, [], fixedWidth).width
    expect(tableTitle(noted, width, fixedWidth)).toBe(noted.displayName)
  })
})

describe('columnText', () => {
  it('shortens a long name and type so both fit their row', () => {
    const column = users?.columns[2]
    if (!column) throw new Error('expected a column')
    const { name, type } = columnText(column, TABLE_CARD.maxWidth, fixedWidth)
    const textRoomInWidestCard = TABLE_CARD.maxWidth - ROW_CHROME
    expect(name.endsWith('…') && type.endsWith('…')).toBe(true)
    expect(fixedWidth(name, 'name') + fixedWidth(type, 'type')).toBeLessThanOrEqual(
      textRoomInWidestCard
    )
  })
})

describe('fitText', () => {
  it('keeps text that fits and cuts the rest to the longest prefix that does', () => {
    expect(fitText('short', 100, 'name', fixedWidth)).toBe('short')
    const cut = fitText('abcdefghij', 5 * CHARACTER_WIDTH, 'name', fixedWidth)
    expect(cut).toBe('abcd…')
  })

  it('never cuts inside an emoji or an accented letter', () => {
    const thumb = 'ab👍🏽cdefgh'
    expect(fitText(thumb, 6 * CHARACTER_WIDTH, 'name', fixedWidth)).toBe('ab…')
    expect(fitText(thumb, 7 * CHARACTER_WIDTH, 'name', fixedWidth)).toBe('ab👍🏽…')
    const accented = 'e\u0301'.repeat(4)
    expect(fitText(accented, 4 * CHARACTER_WIDTH, 'name', fixedWidth)).toBe('e\u0301…')
  })
})

describe('noteLines', () => {
  it('starts every paragraph on a new line', () => {
    expect(noteLines(note('First idea\nSecond idea'), fixedWidth)).toEqual([
      'First idea',
      'Second idea'
    ])
  })

  it('wraps long paragraphs and stops at the line limit', () => {
    const lines = noteLines(note('word '.repeat(400)), fixedWidth)
    const room = NOTE_CARD.width - NOTE_CARD.padding * 2
    expect(lines.length).toBe(NOTE_CARD.maxLines)
    expect(lines.every((line) => fixedWidth(line, 'note') <= room)).toBe(true)
    expect(fixedWidth(`${lines[0]} word`, 'note')).toBeGreaterThan(room)
    expect(lines.at(-1)?.endsWith('…')).toBe(true)
  })

  it('clips a word too long for any line, even in a note cut short', () => {
    const url = `https://example.com/${'a'.repeat(200)}`
    const room = NOTE_CARD.width - NOTE_CARD.padding * 2
    for (const content of [url, `${'word '.repeat(400)}${url}`, `${url} ${'word '.repeat(400)}`]) {
      const lines = noteLines(note(content), fixedWidth)
      expect(lines.every((line) => fixedWidth(line, 'note') <= room)).toBe(true)
    }
  })
})
