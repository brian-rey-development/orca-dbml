import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EDITOR_CLASS } from '../../src/code/code-editor'
import { dbmlHighlightStyle } from '../../src/code/dbml-language'
import { readDiagramTheme } from '../../src/diagram/theme'

function stylesheet(path: string): string {
  return readFileSync(new URL(`../../src/${path}`, import.meta.url), 'utf8')
}

function definedVariables(css: string): Set<string> {
  return new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1] ?? ''))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the stylesheets define what the code reads', () => {
  it('defines every diagram theme variable', () => {
    const requested: string[] = []
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: (name: string) => {
        requested.push(name)
        return ''
      }
    }))
    readDiagramTheme({} as Element)
    const defined = definedVariables(stylesheet('diagram/diagram.css') + stylesheet('tokens.css'))
    expect(requested.filter((name) => !defined.has(name))).toEqual([])
    expect(requested.length).toBeGreaterThan(0)
  })

  it('defines every syntax color the highlighter uses', () => {
    const rules = dbmlHighlightStyle.module?.getRules() ?? ''
    const used = [...rules.matchAll(/var\((--dbml-syntax-[\w-]+)\)/g)].map((match) => match[1])
    const defined = definedVariables(stylesheet('code/code.css'))
    expect(used.filter((name) => name === undefined || !defined.has(name))).toEqual([])
    expect(used.length).toBeGreaterThan(0)
  })

  it('styles the code editor by the class it carries', () => {
    expect(stylesheet('code/code.css')).toMatch(new RegExp(`\\.${EDITOR_CLASS}\\b`))
  })
})
