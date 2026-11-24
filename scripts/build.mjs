import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { bundlePage, ROOT } from './bundle.mjs'
import { thirdPartyNotices } from './notices.mjs'

const OUTPUTS = {
  editor: path.join(ROOT, 'editor/index.html'),
  notices: path.join(ROOT, 'THIRD_PARTY_NOTICES.md')
}

async function main() {
  const { html, inputs } = await bundlePage('src/main.tsx', { minify: true })
  const notices = await thirdPartyNotices(ROOT, inputs)
  if (process.argv.includes('--verify')) {
    await verify({ editor: html, notices })
    return
  }
  await mkdir(path.dirname(OUTPUTS.editor), { recursive: true })
  await writeFile(OUTPUTS.editor, html)
  await writeFile(OUTPUTS.notices, notices)
  console.log(`Built ${path.relative(ROOT, OUTPUTS.editor)} (${kilobytes(html)} KB)`)
}

async function verify(fresh) {
  const stale = []
  for (const [name, file] of Object.entries(OUTPUTS)) {
    const committed = await readFile(file, 'utf8').catch(missingAsNull)
    if (committed !== fresh[name]) stale.push(path.relative(ROOT, file))
  }
  if (stale.length > 0) {
    console.error(`Out of date: ${stale.join(', ')}. Run "pnpm build" and commit the result.`)
    process.exitCode = 1
    return
  }
  console.log('The committed build matches the source.')
}

function kilobytes(text) {
  return Math.round(Buffer.byteLength(text) / 1024)
}

await main()

function missingAsNull(error) {
  if (error.code === 'ENOENT') return null
  throw error
}
