import { KeyRound, Link2 } from 'lucide-preact'
import { memo } from 'preact/compat'
import type { Rect } from '../../layout/geometry'
import type { Column, Table } from '../../schema/model'
import {
  TABLE_CARD,
  columnNameStyle,
  columnText,
  rowCenter,
  rowTop,
  tableTitle,
  type TextMeasure
} from '../card-layout'
import { nodeKeyProps } from '../dom'
import { DIMMED_OPACITY } from '../emphasis'
import { describeColumn } from '../labels'
import type { TableView } from '../scene'
import { fontAttributes } from '../text-measure'
import { textOnFill } from '../contrast'
import type { DiagramTheme } from '../theme'

export type CardDetail = 'full' | 'outline'

type TableCardProps = {
  readonly view: TableView
  readonly theme: DiagramTheme
  readonly measure: TextMeasure
  readonly dimmed: boolean
  readonly selected: boolean
  readonly detail: CardDetail
}

const DEFAULT_STROKE_WIDTH = 1
const SELECTED_STROKE_WIDTH = 2

function TableCardView({ view, theme, measure, dimmed, selected, detail }: TableCardProps) {
  const { table, rect, columns } = view
  return (
    <g
      class="dbml-table"
      {...nodeKeyProps(table.key)}
      transform={`translate(${rect.x} ${rect.y})`}
      opacity={dimmed ? DIMMED_OPACITY : 1}
    >
      {table.note ? <title>{table.note}</title> : null}
      <CardBackground rect={rect} theme={theme} selected={selected} />
      <TableHeader table={table} width={rect.width} theme={theme} measure={measure} />
      {detail === 'full' ? (
        <ColumnRows columns={columns} width={rect.width} theme={theme} measure={measure} />
      ) : null}
    </g>
  )
}

type CardBackgroundProps = {
  readonly rect: Rect
  readonly theme: DiagramTheme
  readonly selected: boolean
}

function CardBackground({ rect, theme, selected }: CardBackgroundProps) {
  return (
    <rect
      width={rect.width}
      height={rect.height}
      rx={TABLE_CARD.cornerRadius}
      fill={theme.cardFill}
      stroke={selected ? theme.selection : theme.cardStroke}
      stroke-width={selected ? SELECTED_STROKE_WIDTH : DEFAULT_STROKE_WIDTH}
    />
  )
}

type ColumnRowsProps = {
  readonly columns: readonly Column[]
  readonly width: number
  readonly theme: DiagramTheme
  readonly measure: TextMeasure
}

function ColumnRows({ columns, width, theme, measure }: ColumnRowsProps) {
  return (
    <>
      {columns.map((column, index) => (
        <ColumnRow
          key={column.name}
          column={column}
          index={index}
          width={width}
          theme={theme}
          measure={measure}
        />
      ))}
    </>
  )
}

export const TableCard = memo(TableCardView)

type TableHeaderProps = {
  readonly table: Table
  readonly width: number
  readonly theme: DiagramTheme
  readonly measure: TextMeasure
}

function TableHeader({ table, width, theme, measure }: TableHeaderProps) {
  const { headerHeight, paddingX } = TABLE_CARD
  const fill = table.color ?? theme.headerFill
  const textColor = textOnFill(table.color, theme.headerText)
  return (
    <g class="dbml-table-header">
      <path d={headerPath(width, headerHeight)} fill={fill} />
      <text
        x={paddingX}
        y={headerHeight / 2}
        dominant-baseline="central"
        fill={textColor}
        {...fontAttributes('title', theme)}
      >
        {tableTitle(table, width, measure)}
      </text>
    </g>
  )
}

type ColumnRowProps = {
  readonly column: Column
  readonly index: number
  readonly width: number
  readonly theme: DiagramTheme
  readonly measure: TextMeasure
}

function ColumnRow({ column, index, width, theme, measure }: ColumnRowProps) {
  const { paddingX, iconSize } = TABLE_CARD
  const top = rowTop(index)
  const middle = rowCenter(index)
  const text = columnText(column, width, measure)
  return (
    <g class="dbml-column">
      <title>{describeColumn(column)}</title>
      {index > 0 ? <line x1={0} x2={width} y1={top} y2={top} stroke={theme.rowDivider} /> : null}
      <ColumnIcon column={column} x={paddingX} y={middle - iconSize / 2} theme={theme} />
      <ColumnName column={column} name={text.name} y={middle} theme={theme} />
      <ColumnType type={text.type} width={width} y={middle} theme={theme} />
    </g>
  )
}

type ColumnNameProps = {
  readonly column: Column
  readonly name: string
  readonly y: number
  readonly theme: DiagramTheme
}

function ColumnName({ column, name, y, theme }: ColumnNameProps) {
  const { paddingX, iconSlot } = TABLE_CARD
  return (
    <text
      x={paddingX + iconSlot}
      y={y}
      dominant-baseline="central"
      fill={theme.text}
      {...fontAttributes(columnNameStyle(column), theme)}
    >
      {name}
    </text>
  )
}

type ColumnTypeProps = {
  readonly type: string
  readonly width: number
  readonly y: number
  readonly theme: DiagramTheme
}

function ColumnType({ type, width, y, theme }: ColumnTypeProps) {
  return (
    <text
      x={width - TABLE_CARD.paddingX}
      y={y}
      text-anchor="end"
      dominant-baseline="central"
      fill={theme.mutedText}
      {...fontAttributes('type', theme)}
    >
      {type}
    </text>
  )
}

type ColumnIconProps = {
  readonly column: Column
  readonly x: number
  readonly y: number
  readonly theme: DiagramTheme
}

function ColumnIcon({ column, x, y, theme }: ColumnIconProps) {
  const size = TABLE_CARD.iconSize
  if (column.primaryKey) return <KeyRound x={x} y={y} size={size} color={theme.primaryKey} />
  if (column.foreignKey) return <Link2 x={x} y={y} size={size} color={theme.foreignKey} />
  return null
}

function headerPath(width: number, height: number): string {
  const r = TABLE_CARD.cornerRadius
  return [
    `M 0 ${height}`,
    `V ${r}`,
    `A ${r} ${r} 0 0 1 ${r} 0`,
    `H ${width - r}`,
    `A ${r} ${r} 0 0 1 ${width} ${r}`,
    `V ${height}`,
    'Z'
  ].join(' ')
}
