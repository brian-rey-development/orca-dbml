import { useCallback, useRef } from 'preact/hooks'
import type { TextMeasure } from '../../diagram/card-layout'
import type { Scene } from '../../diagram/scene'
import type { DiagramTheme } from '../../diagram/theme'
import { exportDiagram, type ExportedImage, type ExportFormat } from '../../export/diagram-export'
import { exportFileName } from '../../export/file-name'
import type { EditorHost, SaveOutcome } from '../../host/editor-host'
import type { Schema } from '../../schema/model'

type ExportContext = {
  readonly host: EditorHost
  readonly schema: Schema | null
  readonly scene: Scene
  readonly theme: DiagramTheme
  readonly measure: TextMeasure
  readonly notify: (message: string) => void
}

/** The last image drawn, reused while nothing it was drawn from has changed. */
type Drawn = {
  readonly format: ExportFormat
  readonly scene: Scene
  readonly theme: DiagramTheme
  readonly image: ExportedImage
}

type SaveFile = NonNullable<EditorHost['saveFile']>

/** Renders the diagram and hands it to Orca's save dialog; the plugin never sees the path. */
export function useDiagramExport({ host, schema, scene, theme, measure, notify }: ExportContext) {
  const lastDrawn = useRef<Drawn | null>(null)
  return useCallback(
    async (format: ExportFormat) => {
      const saveFile = host.saveFile
      if (!saveFile) return
      try {
        const request = { format, scene, theme, measure }
        const message = await drawAndSave({ lastDrawn, saveFile, schema, request })
        if (message) notify(message)
      } catch (error) {
        console.error('DBML diagram export failed', error)
        notify(error instanceof Error ? error.message : 'The diagram could not be exported.')
      }
    },
    [host, schema, scene, theme, measure, notify]
  )
}

type DrawAndSave = {
  readonly lastDrawn: { current: Drawn | null }
  readonly saveFile: SaveFile
  readonly schema: Schema | null
  readonly request: DrawRequest
}

async function drawAndSave({ lastDrawn, saveFile, schema, request }: DrawAndSave) {
  const image = await draw(lastDrawn, request)
  const outcome = await saveFile({
    suggestedName: exportFileName(schema, image.extension),
    mimeType: image.mimeType,
    data: image.data
  })
  return outcomeMessage(outcome, request.format)
}

type DrawRequest = Omit<Drawn, 'image'> & { readonly measure: TextMeasure }

async function draw(
  lastDrawn: { current: Drawn | null },
  { format, scene, theme, measure }: DrawRequest
): Promise<ExportedImage> {
  const last = lastDrawn.current
  if (last && last.format === format && last.scene === scene && last.theme === theme) {
    return last.image
  }
  const image = await exportDiagram(format, { scene, theme, measure })
  lastDrawn.current = { format, scene, theme, image }
  return image
}

// A large image can take longer to draw than Orca lets the click count; the second click finds it
// drawn and saves at once.
function outcomeMessage(outcome: SaveOutcome, format: ExportFormat): string | null {
  const name = format.toUpperCase()
  if (outcome === 'saved') return `Saved the diagram as ${name}.`
  if (outcome === 'needs-gesture') return `The ${name} is ready. Click Export again to save it.`
  return null
}
