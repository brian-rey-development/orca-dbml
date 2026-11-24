import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { bundlePage, ROOT } from './bundle.mjs'

const OUTPUT = path.join(ROOT, '.preview/index.html')

const { html } = await bundlePage('src/preview/preview.tsx', { minify: false })
await mkdir(path.dirname(OUTPUT), { recursive: true })
await writeFile(OUTPUT, html)
console.log(`Preview: ${pathToFileURL(OUTPUT)} (URL options are listed in src/preview/preview.tsx)`)
