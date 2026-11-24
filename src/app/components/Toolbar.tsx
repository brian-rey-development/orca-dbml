import {
  CircleX,
  Columns2,
  KeyRound,
  Maximize,
  Network,
  Rows3,
  Table2,
  TriangleExclamationPoint,
  Workflow,
  ZoomIn,
  ZoomOut
} from 'lucide-preact'
import { COLUMN_VISIBILITIES, type ColumnVisibility } from '../../diagram/card-layout'
import { FIT_KEY } from '../../diagram/components/use-canvas-gestures'
import { ZOOM_STEP } from '../../diagram/viewport'
import type { ExportFormat } from '../../export/diagram-export'
import type { Diagnostic } from '../../schema/model'
import { VIEW_MODES, type ViewMode } from '../state'
import { IconButton, SegmentedControl, type SegmentOption } from './controls'
import { ExportMenu } from './ExportMenu'
import { PROBLEMS_LIST_ID, problemsSummary } from './ProblemsList'
import { SearchBox } from './SearchBox'

const VIEW_OPTIONS: Readonly<Record<ViewMode, SegmentOption>> = {
  split: { label: 'Code and diagram', icon: Columns2 },
  diagram: { label: 'Diagram only', icon: Network }
}

const COLUMN_OPTIONS: Readonly<Record<ColumnVisibility, SegmentOption>> = {
  all: { label: 'Show all columns', icon: Rows3 },
  keys: { label: 'Show key columns only', icon: KeyRound },
  none: { label: 'Show table names only', icon: Table2 }
}

const PERCENT = 100

export type ToolbarProps = {
  readonly view: ViewMode
  readonly visibility: ColumnVisibility
  readonly zoom: number
  readonly diagnostics: readonly Diagnostic[]
  readonly problemsOpen: boolean
  readonly hasDiagram: boolean
  readonly canExport: boolean
  readonly onViewChange: (view: ViewMode) => void
  readonly onVisibilityChange: (visibility: ColumnVisibility) => void
  readonly onZoom: (factor: number) => void
  readonly onFit: () => void
  readonly onRearrange: () => void
  readonly onFind: (query: string) => void
  readonly onToggleProblems: () => void
  readonly onExport: (format: ExportFormat) => void
}

export function Toolbar(props: ToolbarProps) {
  return (
    <div class="toolbar" role="toolbar" aria-label="DBML diagram">
      <LayoutControl view={props.view} onChange={props.onViewChange} />
      <ColumnsControl visibility={props.visibility} onChange={props.onVisibilityChange} />
      <SearchBox onFind={props.onFind} />
      <ProblemsButton
        diagnostics={props.diagnostics}
        open={props.problemsOpen}
        onToggle={props.onToggleProblems}
      />
      <div class="toolbar__spacer" />
      <ViewControls {...props} />
      <ExportSection {...props} />
    </div>
  )
}

type LayoutControlProps = {
  readonly view: ViewMode
  readonly onChange: (view: ViewMode) => void
}

function LayoutControl({ view, onChange }: LayoutControlProps) {
  return (
    <SegmentedControl
      label="Layout"
      value={view}
      values={VIEW_MODES}
      options={VIEW_OPTIONS}
      onChange={onChange}
    />
  )
}

type ColumnsControlProps = {
  readonly visibility: ColumnVisibility
  readonly onChange: (visibility: ColumnVisibility) => void
}

function ColumnsControl({ visibility, onChange }: ColumnsControlProps) {
  return (
    <SegmentedControl
      label="Columns"
      value={visibility}
      values={COLUMN_VISIBILITIES}
      options={COLUMN_OPTIONS}
      onChange={onChange}
    />
  )
}

function ViewControls({ zoom, hasDiagram, onZoom, onFit, onRearrange }: ToolbarProps) {
  return (
    <div class="toolbar__group">
      <ZoomControls zoom={zoom} disabled={!hasDiagram} onZoom={onZoom} />
      <IconButton
        label={`Fit diagram to view (${FIT_KEY})`}
        icon={Maximize}
        disabled={!hasDiagram}
        onClick={onFit}
      />
      <IconButton
        label="Auto-arrange tables"
        icon={Workflow}
        disabled={!hasDiagram}
        onClick={onRearrange}
      />
    </div>
  )
}

type ZoomControlsProps = {
  readonly zoom: number
  readonly disabled: boolean
  readonly onZoom: (factor: number) => void
}

function ZoomControls({ zoom, disabled, onZoom }: ZoomControlsProps) {
  return (
    <>
      <IconButton
        label="Zoom out"
        icon={ZoomOut}
        disabled={disabled}
        onClick={() => onZoom(1 / ZOOM_STEP)}
      />
      <span class="toolbar__zoom">{Math.round(zoom * PERCENT)}%</span>
      <IconButton
        label="Zoom in"
        icon={ZoomIn}
        disabled={disabled}
        onClick={() => onZoom(ZOOM_STEP)}
      />
    </>
  )
}

function ExportSection({ canExport, hasDiagram, onExport }: ToolbarProps) {
  if (!canExport) return null
  return (
    <>
      <div class="toolbar__divider" />
      <ExportMenu disabled={!hasDiagram} onExport={onExport} />
    </>
  )
}

type ProblemsButtonProps = {
  readonly diagnostics: readonly Diagnostic[]
  readonly open: boolean
  readonly onToggle: () => void
}

/** Its visible text, such as "2 errors", is also its accessible name. */
function ProblemsButton({ diagnostics, open, onToggle }: ProblemsButtonProps) {
  if (diagnostics.length === 0) return null
  const hasErrors = diagnostics.some((diagnostic) => diagnostic.severity === 'error')
  return (
    <IconButton
      label={open ? 'Hide problems' : 'Show problems'}
      icon={hasErrors ? CircleX : TriangleExclamationPoint}
      className={hasErrors ? 'problems-chip' : 'problems-chip problems-chip--warning'}
      expanded={open}
      controls={PROBLEMS_LIST_ID}
      onClick={onToggle}
    >
      {problemsSummary(diagnostics)}
    </IconButton>
  )
}
