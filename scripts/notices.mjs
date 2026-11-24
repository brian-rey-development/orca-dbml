import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const PACKAGE_IN_PATH = /^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//
const LICENSE_FILE = /^(licen[cs]e|notice)(\.(md|txt))?$/i
const NODE_MODULES = `${path.sep}node_modules${path.sep}`

/**
 * THIRD_PARTY_NOTICES.md for every package in the bundle. Some packages ship their own
 * dependencies already bundled into their dist files (@dbml/parse inlines lodash-es, luxon and
 * pathe), so each package's runtime dependencies are included too, recursively.
 */
export async function thirdPartyNotices(root, bundleInputs) {
  const bundled = bundleInputs.flatMap((input) => {
    const match = PACKAGE_IN_PATH.exec(input)
    return match ? [path.join(root, match[1])] : []
  })
  const packages = await withDependencies(bundled)
  const names = [...packages.keys()].sort()
  const sections = await Promise.all(names.map((name) => section(packages.get(name))))
  return [
    '# Third-party notices',
    '',
    'The DBML editor bundles the following packages. Their licenses are reproduced below.',
    '',
    ...sections
  ].join('\n')
}

async function withDependencies(directories) {
  const found = new Map()
  const queue = [...new Set(directories)]
  while (queue.length > 0) {
    const directory = queue.shift()
    const manifest = await readManifest(directory)
    if (found.has(manifest.name)) continue
    found.set(manifest.name, directory)
    const dependencies = Object.keys(manifest.dependencies ?? {})
    const installed = await Promise.all(
      dependencies.map((name) => installedDependency(directory, name))
    )
    queue.push(...installed.filter((dependency) => dependency !== null))
  }
  return found
}

async function installedDependency(directory, name) {
  const nodeModules = directory.slice(0, directory.lastIndexOf(NODE_MODULES) + NODE_MODULES.length)
  const candidate = path.join(nodeModules, name)
  try {
    await access(path.join(candidate, 'package.json'))
    return candidate
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

async function section(directory) {
  const manifest = await readManifest(directory)
  const licenseTexts = await licenseFiles(directory)
  return [
    `## ${manifest.name} ${manifest.version}`,
    '',
    `License: ${manifest.license ?? 'see below'}`,
    '',
    ...licenseTexts.flatMap((text) => ['```text', text.trim(), '```', ''])
  ].join('\n')
}

async function readManifest(directory) {
  return JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'))
}

async function licenseFiles(directory) {
  const entries = (await readdir(directory)).filter((name) => LICENSE_FILE.test(name)).sort()
  return Promise.all(entries.map((name) => readFile(path.join(directory, name), 'utf8')))
}
