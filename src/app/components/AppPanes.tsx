import type { DiagramCanvasProps } from '../../diagram/components/DiagramCanvas'
import type { AppModel } from '../hooks/use-app-model'
import { CodePane } from './CodePane'
import { DiagramPane } from './DiagramPane'
import { ErrorBoundary } from './ErrorBoundary'
import { SplitView } from './SplitView'

type ModelProps = { readonly model: AppModel }

export function AppPanes({ model }: ModelProps) {
  const { preferences } = model
  return (
    <SplitView
      ratio={preferences.splitRatio}
      onRatioChange={preferences.setSplitRatio}
      startVisible={preferences.view === 'split'}
      start={<CodePanel model={model} />}
      end={<DiagramPanel model={model} />}
    />
  )
}

function CodePanel({ model }: ModelProps) {
  const { host, documentText, compiled, diagram } = model
  return (
    <ErrorBoundary area="code editor" retryOn={documentText.text}>
      <CodePane
        session={host.document}
        diagnostics={compiled.diagnostics}
        schema={compiled.schema}
        reveal={diagram.navigation.reveal}
        onChange={documentText.edit}
      />
    </ErrorBoundary>
  )
}

function DiagramPanel({ model }: ModelProps) {
  const { compiled, notice, diagram } = model
  return (
    <ErrorBoundary area="diagram" retryOn={diagram.layout.scene}>
      <DiagramPane
        {...canvasProps(model)}
        pending={compiled.pending}
        stale={compiled.stale}
        diagnostics={compiled.diagnostics}
        notice={notice}
        onShowProblems={() => model.setProblemsOpen(true)}
      />
    </ErrorBoundary>
  )
}

function canvasProps({ diagram }: AppModel): DiagramCanvasProps {
  const { viewportControls, selection, layout } = diagram
  return {
    canvasRef: diagram.canvasRef,
    screen: viewportControls.screen,
    scene: layout.scene,
    theme: diagram.theme,
    measure: diagram.measure,
    viewport: viewportControls.viewport,
    selectedKey: selection.selectedKey,
    onViewportChange: viewportControls.setViewport,
    onZoomBy: viewportControls.zoomBy,
    onNodeMove: layout.moveNode,
    onNodeMoveEnd: layout.saveLayout,
    onSelect: selection.select,
    onOpen: selection.openDefinition,
    onStep: selection.step,
    onFit: viewportControls.requestFit
  }
}
