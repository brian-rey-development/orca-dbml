import { existsSync, readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { OrcaUnavailableError } from '../../src/host/orca-host'

/**
 * The rules Orca's validator and plugin directory enforce on the manifest and its assets, so a
 * broken manifest fails CI instead of an install. `pnpm validate` runs Orca's own validator.
 */

const ROOT = new URL('../../', import.meta.url)
// orca.document.session() first shipped in Orca 1.4.247.
const SESSION_API_RELEASE = [1, 4, 247]

type ImageRule = { readonly minWidth: number; readonly minHeight: number; readonly maxKb: number }

const ICON_RULE: ImageRule = { minWidth: 128, minHeight: 128, maxKb: 256 }
const COVER_RULE: ImageRule = { minWidth: 800, minHeight: 500, maxKb: 1024 }
const SCREENSHOT_RULE: ImageRule = { minWidth: 1280, minHeight: 800, maxKb: 1536 }

type Manifest = {
  readonly id: string
  readonly version: string
  readonly publisher?: string
  readonly icon: string
  readonly engines: { readonly orca: string }
  readonly cover: { readonly path: string }
  readonly screenshots: readonly { readonly path: string }[]
  readonly contributes: {
    readonly syntaxes: readonly { readonly path: string; readonly configuration: string }[]
    readonly customEditors: readonly { readonly entry: string; readonly icon: string }[]
    readonly newFiles: readonly { readonly template: string }[]
  }
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(new URL(path, ROOT), 'utf8')) as T
}

const manifest = readJson<Manifest>('orca-plugin.json')

function compareVersions(a: readonly number[], b: readonly number[]): number {
  const index = a.findIndex((part, position) => part !== b[position])
  return index === -1 ? 0 : (a[index] ?? 0) - (b[index] ?? 0)
}

function pngSize(path: string): { width: number; height: number } {
  const bytes = readFileSync(new URL(path, ROOT))
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

function expectImage(path: string, rule: ImageRule): void {
  const { width, height } = pngSize(path)
  expect(width, path).toBeGreaterThanOrEqual(rule.minWidth)
  expect(height, path).toBeGreaterThanOrEqual(rule.minHeight)
  expect(statSync(new URL(path, ROOT)).size / 1024, path).toBeLessThanOrEqual(rule.maxKb)
}

describe('orca-plugin.json', () => {
  it('names only files that exist in the plugin', () => {
    const { contributes } = manifest
    const paths = [
      manifest.icon,
      manifest.cover.path,
      ...manifest.screenshots.map((shot) => shot.path),
      ...contributes.syntaxes.flatMap((syntax) => [syntax.path, syntax.configuration]),
      ...contributes.customEditors.flatMap((editor) => [editor.entry, editor.icon]),
      ...contributes.newFiles.map((file) => file.template)
    ]
    for (const path of paths) expect(existsSync(new URL(path, ROOT)), path).toBe(true)
  })

  it('ships images the plugin directory accepts', () => {
    expectImage(manifest.icon, ICON_RULE)
    const icon = pngSize(manifest.icon)
    expect(icon.width).toBe(icon.height)
    expectImage(manifest.cover.path, COVER_RULE)
    manifest.screenshots.forEach((shot) => expectImage(shot.path, SCREENSHOT_RULE))
  })

  it('keeps its version in step with package.json', () => {
    expect(manifest.version).toBe(readJson<{ version: string }>('package.json').version)
  })

  it('requires an Orca with the document session API and leaves the publisher to Orca', () => {
    const required = manifest.engines.orca.replace('>=', '').split('.').map(Number)
    expect(compareVersions(required, SESSION_API_RELEASE)).toBeGreaterThanOrEqual(0)
    expect(manifest.publisher).toBeUndefined()
    expect(manifest.id.startsWith('orca-')).toBe(false)
  })

  it('names the Orca version it needs in the message shown on an older Orca', () => {
    const minimum = manifest.engines.orca.replace('>=', '')
    expect(new OrcaUnavailableError().message).toContain(minimum)
  })
})
