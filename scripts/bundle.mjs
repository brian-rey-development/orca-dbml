import { build } from 'esbuild'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

export const ROOT = fileURLToPath(new URL('..', import.meta.url))

const TEMPLATE = new URL('../src/editor.html', import.meta.url)
const WORKER_ENTRY = 'src/schema/compile-worker.ts'
const STYLES_MARKER = '<!-- inline:styles -->'
const SCRIPT_MARKER = '<!-- inline:script -->'

// Inside an inline <script>, these sequences end the element or switch the HTML parser into a
// state that swallows the rest of the page.
const UNSAFE_IN_SCRIPT = /<\/script|<!--/i
const UNSAFE_IN_STYLE = /<\/style/i

const SHARED_OPTIONS = {
  absWorkingDir: ROOT,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome120'],
  legalComments: 'none',
  charset: 'utf8',
  write: false,
  metafile: true,
  logLevel: 'warning'
}

/**
 * Bundles an entry into one self-contained HTML page. Orca's browser clients load an editor as a
 * single sandboxed document, so scripts, styles and the compile worker are all inlined.
 */
export async function bundlePage(entry, { minify }) {
  const worker = await bundleWorker(minify)
  const result = await build({
    ...SHARED_OPTIONS,
    entryPoints: [entry],
    jsx: 'automatic',
    jsxImportSource: 'preact',
    loader: { '.dbml': 'text' },
    define: { COMPILE_WORKER_SOURCE: JSON.stringify(worker.script) },
    minify,
    outdir: 'out'
  })
  const script = outputWithExtension(result.outputFiles, '.js')
  const styles = outputWithExtension(result.outputFiles, '.css')
  const html = inline(await readFile(TEMPLATE, 'utf8'), script, styles)
  return { html, inputs: [...Object.keys(result.metafile.inputs), ...worker.inputs] }
}

async function bundleWorker(minify) {
  const result = await build({
    ...SHARED_OPTIONS,
    entryPoints: [WORKER_ENTRY],
    minify,
    outdir: 'out'
  })
  return {
    script: outputWithExtension(result.outputFiles, '.js'),
    inputs: Object.keys(result.metafile.inputs)
  }
}

function outputWithExtension(files, extension) {
  const file = files.find((candidate) => candidate.path.endsWith(extension))
  if (!file) throw new Error(`esbuild produced no ${extension} output`)
  return file.text
}

function inline(template, script, styles) {
  if (UNSAFE_IN_SCRIPT.test(script)) {
    throw new Error('The bundle contains "</script" or "<!--" and cannot be inlined safely')
  }
  if (UNSAFE_IN_STYLE.test(styles)) {
    throw new Error('The styles contain "</style" and cannot be inlined safely')
  }
  // Replacer functions, because a replacement string would expand `$&` and `$'` inside the bundle.
  return template
    .replace(STYLES_MARKER, () => `<style>${styles}</style>`)
    .replace(SCRIPT_MARKER, () => `<script>${script}</script>`)
}
