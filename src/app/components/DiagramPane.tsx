import { DiagramCanvas, type DiagramCanvasProps } from '../../diagram/components/DiagramCanvas'
import type { Diagnostic } from '../../schema/model'
import { problemsSummary } from './ProblemsList'

type DiagramPaneProps = DiagramCanvasProps & {
  readonly pending: boolean
  readonly stale: boolean
  readonly diagnostics: readonly Diagnostic[]
  readonly notice: string | null
  readonly onShowProblems: () => void
}

export function DiagramPane(props: DiagramPaneProps) {
  const { pending, stale, diagnostics, notice, onShowProblems, ...canvas } = props
  const empty = canvas.scene.nodeRects.size === 0
  return (
    <div class="diagram">
      <DiagramCanvas {...canvas} />
      {empty && !pending ? (
        <EmptyState hasErrors={diagnostics.some((d) => d.severity === 'error')} />
      ) : null}
      <StatusBanner
        notice={notice}
        staleSummary={stale && !empty ? problemsSummary(diagnostics) : null}
        onShowProblems={onShowProblems}
      />
    </div>
  )
}

type StatusBannerProps = {
  readonly notice: string | null
  readonly staleSummary: string | null
  readonly onShowProblems: () => void
}

function StatusBanner({ notice, staleSummary, onShowProblems }: StatusBannerProps) {
  if (notice !== null) {
    return (
      <div class="banner" role="status">
        {notice}
      </div>
    )
  }
  if (staleSummary === null) return null
  return (
    <div class="banner" role="status">
      <span>Showing the last valid diagram ({staleSummary}).</span>
      <button type="button" class="icon-button" onClick={onShowProblems}>
        Show problems
      </button>
    </div>
  )
}

function EmptyState({ hasErrors }: { readonly hasErrors: boolean }) {
  if (hasErrors) {
    return (
      <div class="empty-state">
        <span class="empty-state__title">The schema has errors</span>
        <span>Fix them to see the diagram.</span>
      </div>
    )
  }
  return (
    <div class="empty-state">
      <span class="empty-state__title">No tables yet</span>
      <span>
        Add one, such as <code>{'Table users { id int [pk] }'}</code>, and it appears here.
      </span>
    </div>
  )
}
