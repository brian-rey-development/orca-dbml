import { mergeEdits } from '../text/merge'
import type {
  Disposable,
  DocumentSession,
  EditorHost,
  SaveOutcome,
  SaveRequest
} from './editor-host'

type SessionOptions = {
  readonly debounceMs: number
  readonly merge: (base: string, outside: string, mine: string) => string
}

type OrcaFiles = {
  saveAs(options: SaveRequest): Promise<{ status: 'saved' | 'cancelled' }>
}

/** The part of Orca's frame API (`window.orca`, see `orca plugin types`) this editor uses. */
type OrcaFrame = {
  on(event: 'theme', handler: () => void): Disposable
  readonly files?: OrcaFiles
  readonly document?: {
    session(options: SessionOptions): Promise<DocumentSession>
  }
}

declare global {
  var orca: OrcaFrame | undefined
}

const EDIT_DEBOUNCE_MS = 300
// The code Orca rejects a gesture-only call with once the click or key press is too old.
const NO_GESTURE_CODE = 'not_permitted'

export class OrcaUnavailableError extends Error {
  constructor() {
    super('This view needs Orca 1.4.247 or newer.')
    this.name = 'OrcaUnavailableError'
  }
}

export async function connectToOrca(): Promise<EditorHost> {
  const frame = globalThis.orca
  if (typeof frame?.document?.session !== 'function') throw new OrcaUnavailableError()
  const document = await frame.document.session({ debounceMs: EDIT_DEBOUNCE_MS, merge: mergeEdits })
  const files = frame.files
  return {
    document,
    saveFile: files ? (request) => saveThrough(files, request) : null,
    onThemeChange: (handler) => frame.on('theme', handler)
  }
}

async function saveThrough(files: OrcaFiles, request: SaveRequest): Promise<SaveOutcome> {
  try {
    return (await files.saveAs(request)).status
  } catch (error) {
    if (codeOf(error) === NO_GESTURE_CODE) return 'needs-gesture'
    throw error
  }
}

function codeOf(error: unknown): unknown {
  return typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined
}
