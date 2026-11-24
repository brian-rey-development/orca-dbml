import type { AppModel } from '../hooks/use-app-model'
import { ProblemsList } from './ProblemsList'
import { Toolbar, type ToolbarProps } from './Toolbar'

export function AppHeader({ model }: { readonly model: AppModel }) {
  const { compiled, problemsOpen, diagram } = model
  const showProblems = problemsOpen && compiled.diagnostics.length > 0
  return (
    <>
      <Toolbar {...toolbarProps(model)} />
      {showProblems ? (
        <ProblemsList
          diagnostics={compiled.diagnostics}
          onOpen={(diagnostic) => diagram.navigation.goTo(diagnostic.range.start)}
        />
      ) : null}
    </>
  )
}

function toolbarProps(model: AppModel): ToolbarProps {
  const { host, preferences, compiled, diagram, problemsOpen } = model
  return {
    view: preferences.view,
    visibility: preferences.visibility,
    zoom: diagram.viewportControls.viewport.zoom,
    diagnostics: compiled.diagnostics,
    problemsOpen,
    hasDiagram: diagram.layout.scene.bounds !== null,
    canExport: host.saveFile !== null,
    onViewChange: preferences.setView,
    onVisibilityChange: preferences.setVisibility,
    onZoom: diagram.viewportControls.zoomBy,
    onFit: diagram.viewportControls.requestFit,
    onRearrange: diagram.rearrange,
    onFind: diagram.selection.find,
    onToggleProblems: () => model.setProblemsOpen(!problemsOpen),
    onExport: diagram.exportDiagram
  }
}
