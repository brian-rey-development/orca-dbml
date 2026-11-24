import '../tokens.css'
import './orca-theme.css'
import { render } from 'preact'
import { App } from '../app/App'
import { writePreference } from '../app/preferences'
import { VIEW_MODES } from '../app/state'
import { browserStore } from '../host/browser-store'
import type { DocumentSession, EditorHost, SaveRequest } from '../host/editor-host'
import { BUNDLED_WORKER_SOURCE } from '../schema/bundled-worker'
import { createSchemaCompiler } from '../schema/compiler'
import sample from '../../templates/schema.dbml'

/**
 * A stand-in for Orca's frame API so the editor runs in a plain browser tab during development.
 * It is built only by `pnpm preview` and never ships in the plugin. URL options:
 *   theme=dark                    the dark theme
 *   view=diagram                  start in the diagram-only layout
 *   sample=errors|crlf|large      a broken schema, CRLF line endings, or 120 tables
 *   outside=1                     an outside write (as an agent would make) after one second
 */
const OUTSIDE_WRITE_DELAY_MS = 1000
const LARGE_SAMPLE_TABLES = 120

const params = new URLSearchParams(location.search)

function replaceListeners() {
  const handlers = new Set<(text: string) => void>()
  return {
    subscribe: (handler: (text: string) => void) => {
      handlers.add(handler)
      return { dispose: () => handlers.delete(handler) }
    },
    notify: (text: string) => handlers.forEach((handler) => handler(text))
  }
}

function previewSession(initial: string): DocumentSession & { replace(text: string): void } {
  let value = initial
  const replaced = replaceListeners()
  return {
    get value() {
      return value
    },
    readOnly: false,
    change: (text) => {
      value = text
    },
    flush: async () => undefined,
    onReplace: replaced.subscribe,
    replace: (text) => {
      value = text
      replaced.notify(text)
    }
  }
}

function sampleText(kind: string | null): string {
  if (kind === 'errors') return `${sample}\nTable broken {\n  id int [pk\n}\n`
  if (kind === 'crlf') return sample.replace(/\n/g, '\r\n')
  if (kind === 'large') return largeSample()
  return sample
}

function largeSample(): string {
  return Array.from({ length: LARGE_SAMPLE_TABLES }, (_, index) => {
    const parent = index > 0 ? `\n  parent_id int [ref: > table_${Math.floor(index / 3)}.id]` : ''
    return `Table table_${index} {\n  id int [pk]\n  name varchar${parent}\n}`
  }).join('\n\n')
}

async function download(request: SaveRequest): Promise<'saved'> {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([request.data], { type: request.mimeType }))
  link.download = request.suggestedName
  link.click()
  URL.revokeObjectURL(link.href)
  return 'saved'
}

document.documentElement.classList.add(params.get('theme') === 'dark' ? 'dark' : 'light')

const store = browserStore()
const view = VIEW_MODES.find((mode) => mode === params.get('view'))
if (view) writePreference(store, 'view', view)

const session = previewSession(sampleText(params.get('sample')))
const host: EditorHost = {
  document: session,
  saveFile: download,
  onThemeChange: () => ({ dispose: () => undefined })
}

if (params.get('outside') === '1') {
  setTimeout(() => {
    session.replace(
      `${session.value}\n\nTable audit_log {\n  id int [pk]\n  table_id int [ref: > products.id]\n}\n`
    )
  }, OUTSIDE_WRITE_DELAY_MS)
}

declare global {
  var dbmlPreviewSession: DocumentSession | undefined
}

// Lets browser automation read what the editor sent back, as Orca would receive it.
globalThis.dbmlPreviewSession = session

const root = document.getElementById('root')
if (root) {
  const compiler = createSchemaCompiler(BUNDLED_WORKER_SOURCE)
  render(<App host={host} store={store} compiler={compiler} />, root)
}
