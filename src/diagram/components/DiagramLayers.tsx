import { memo } from 'preact/compat'
import { inflate, intersects, type Rect } from '../../layout/geometry'
import type { TextMeasure } from '../card-layout'
import type { Emphasis } from '../emphasis'
import type { NoteView, RelationView, Scene, TableView } from '../scene'
import type { DiagramTheme } from '../theme'
import { GroupFrame } from './GroupFrame'
import { NoteCard } from './NoteCard'
import { RelationLine, type RelationState } from './RelationLine'
import { TableCard, type CardDetail } from './TableCard'

export type DiagramLayersProps = {
  readonly scene: Scene
  readonly theme: DiagramTheme
  readonly measure: TextMeasure
  readonly emphasis?: Emphasis | null
  readonly selectedKey?: string | null
  /** Whether relations show their description on hover. */
  readonly interactive?: boolean
  /** The world area on screen; only what overlaps it is drawn. By default, everything is. */
  readonly visibleArea?: Rect | null
  readonly detail?: CardDetail
}

const CULLING_MARGIN = 200

/** The diagram in world coordinates, drawn back to front: groups, relations, then cards. */
function DiagramLayersView({ scene, visibleArea = null, ...options }: DiagramLayersProps) {
  const layers = withDefaults(options)
  const shows = isShown(visibleArea)
  return (
    <g class="dbml-layers">
      {scene.groups
        .filter((view) => shows(view.rect))
        .map((view) => (
          <GroupFrame key={view.group.id} view={view} theme={layers.theme} />
        ))}
      {scene.relations
        .filter((view) => shows(view.route.bounds))
        .map((view) => relationLine(view, layers))}
      {scene.tables.filter((view) => shows(view.rect)).map((view) => tableCard(view, layers))}
      {scene.notes.filter((view) => shows(view.rect)).map((view) => noteCard(view, layers))}
    </g>
  )
}

type Layers = Required<Omit<DiagramLayersProps, 'scene' | 'visibleArea'>>

function withDefaults(options: Omit<DiagramLayersProps, 'scene' | 'visibleArea'>): Layers {
  const { emphasis = null, selectedKey = null, interactive = false, detail = 'full' } = options
  return { ...options, emphasis, selectedKey, interactive, detail }
}

function relationLine(view: RelationView, layers: Layers) {
  return (
    <RelationLine
      key={view.relation.id}
      view={view}
      theme={layers.theme}
      state={relationState(view, layers.emphasis)}
      interactive={layers.interactive}
    />
  )
}

function tableCard(view: TableView, layers: Layers) {
  return (
    <TableCard
      key={view.table.key}
      view={view}
      theme={layers.theme}
      measure={layers.measure}
      dimmed={isDimmed(view.table.key, layers.emphasis)}
      selected={view.table.key === layers.selectedKey}
      detail={layers.detail}
    />
  )
}

function noteCard(view: NoteView, layers: Layers) {
  return (
    <NoteCard
      key={view.note.key}
      view={view}
      theme={layers.theme}
      dimmed={isDimmed(view.note.key, layers.emphasis)}
    />
  )
}

export const DiagramLayers = memo(DiagramLayersView)

function isShown(visibleArea: Rect | null): (rect: Rect) => boolean {
  if (visibleArea === null) return () => true
  const area = inflate(visibleArea, CULLING_MARGIN)
  return (rect) => intersects(area, rect)
}

function relationState(view: RelationView, emphasis: Emphasis | null): RelationState {
  if (emphasis === null) return 'normal'
  return emphasis.relations.has(view.relation.id) ? 'active' : 'dimmed'
}

function isDimmed(key: string, emphasis: Emphasis | null): boolean {
  return emphasis !== null && !emphasis.nodes.has(key)
}
