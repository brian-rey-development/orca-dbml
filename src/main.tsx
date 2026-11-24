import './tokens.css'
import { render } from 'preact'
import { App } from './app/App'
import { browserStore } from './host/browser-store'
import { connectToOrca, OrcaUnavailableError } from './host/orca-host'
import { BUNDLED_WORKER_SOURCE } from './schema/bundled-worker'
import { createSchemaCompiler } from './schema/compiler'

async function start(root: HTMLElement): Promise<void> {
  try {
    const host = await connectToOrca()
    const compiler = createSchemaCompiler(BUNDLED_WORKER_SOURCE)
    render(<App host={host} store={browserStore()} compiler={compiler} />, root)
  } catch (error) {
    console.error('The DBML editor could not start', error)
    render(<StartupError error={error} />, root)
  }
}

function StartupError({ error }: { readonly error: unknown }) {
  const message =
    error instanceof OrcaUnavailableError
      ? error.message
      : 'The DBML editor could not start. Use Source to edit the file, and see the plugin log for details.'
  return <div class="fatal">{message}</div>
}

const root = document.getElementById('root')
if (root) void start(root)
