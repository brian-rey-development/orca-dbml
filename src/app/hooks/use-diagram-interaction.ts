import type { RefObject } from 'preact'
import { useRef } from 'preact/hooks'
import type { CompiledSchema } from '../compile-state'
import type { ViewMode } from '../state'
import { useCodeNavigation, type CodeNavigation } from './use-code-navigation'
import type { DiagramLayout } from './use-diagram-layout'
import { useDiagramSelection, type DiagramSelection } from './use-diagram-selection'
import { useViewport, type ViewportControls } from './use-viewport'

type InteractionInputs = {
  readonly layout: DiagramLayout
  readonly compiled: CompiledSchema
  readonly setView: (view: ViewMode) => void
  readonly notify: (message: string) => void
}

export type DiagramInteraction = {
  readonly canvasRef: RefObject<SVGSVGElement | null>
  readonly viewportControls: ViewportControls
  readonly navigation: CodeNavigation
  readonly selection: DiagramSelection
  rearrange(): void
}

/** How the person moves around the diagram and between it and the code. */
export function useDiagramInteraction(inputs: InteractionInputs): DiagramInteraction {
  const { layout, compiled, setView, notify } = inputs
  const canvasRef = useRef<SVGSVGElement>(null)
  const viewportControls = useViewport(canvasRef, layout.scene.bounds)
  const navigation = useCodeNavigation(setView)
  const selection = useDiagramSelection({
    scene: layout.scene,
    compiled,
    goTo: navigation.goTo,
    reveal: viewportControls.reveal,
    notify
  })
  const rearrange = (): void => {
    layout.rearrange()
    viewportControls.requestFit()
  }
  return { canvasRef, viewportControls, navigation, selection, rearrange }
}
