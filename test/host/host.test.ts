import { afterEach, describe, expect, it, vi } from 'vitest'
import { browserStore } from '../../src/host/browser-store'
import type { DocumentSession } from '../../src/host/editor-host'
import { connectToOrca, OrcaUnavailableError } from '../../src/host/orca-host'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('browserStore', () => {
  it('keeps working when localStorage is blocked', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      }
    })
    const store = browserStore()
    store.write('key', 'value')
    expect(store.read('key')).toBe('value')
  })

  it('keeps values for the next session in localStorage', () => {
    const saved = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => void saved.set(key, value)
    })
    browserStore().write('key', 'value')
    expect(browserStore().read('key')).toBe('value')
  })

  it('sees what another open editor saved after this one first read the key', () => {
    const saved = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => void saved.set(key, value)
    })
    const mine = browserStore()
    const other = browserStore()
    mine.write('key', 'first')
    expect(mine.read('key')).toBe('first')
    other.write('key', 'second')
    expect(mine.read('key')).toBe('second')
  })

  it('returns what it last wrote even when localStorage kept an older value', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => 'old',
      setItem: () => {
        throw new Error('quota exceeded')
      }
    })
    const store = browserStore()
    store.write('key', 'new')
    expect(store.read('key')).toBe('new')
  })
})

describe('connectToOrca', () => {
  it('refuses to start outside an Orca that has the document session API', async () => {
    vi.stubGlobal('orca', undefined)
    await expect(connectToOrca()).rejects.toBeInstanceOf(OrcaUnavailableError)
  })

  it('opens a session that merges edits, without a save dialog where Orca has none', async () => {
    const session = stubSession()
    const sessionOptions = vi.fn(async (_options: { merge: Merge }) => session)
    vi.stubGlobal('orca', {
      on: () => ({ dispose: () => undefined }),
      document: { session: sessionOptions }
    })
    const host = await connectToOrca()
    expect(host.document).toBe(session)
    expect(host.saveFile).toBeNull()
    const merge = sessionOptions.mock.calls[0]?.[0].merge
    expect(merge?.('a\nb\n', 'A\nb\n', 'a\nB\n')).toBe('A\nB\n')
  })

  it("saves exports through Orca's save dialog and reports what the person chose", async () => {
    const saveAs = vi.fn(async () => ({ status: 'cancelled' as const }))
    vi.stubGlobal('orca', {
      on: () => ({ dispose: () => undefined }),
      files: { saveAs },
      document: { session: async () => stubSession() }
    })
    const request = { data: 'svg', mimeType: 'image/svg+xml', suggestedName: 'schema-diagram.svg' }
    const host = await connectToOrca()
    expect(await host.saveFile?.(request)).toBe('cancelled')
    expect(saveAs).toHaveBeenCalledWith(request)
  })

  it('reports a save Orca refused because the click that asked for it is too old', async () => {
    const refusal = Object.assign(new Error('files.saveAs needs a click'), {
      code: 'not_permitted'
    })
    vi.stubGlobal('orca', {
      on: () => ({ dispose: () => undefined }),
      files: { saveAs: async () => Promise.reject(refusal) },
      document: { session: async () => stubSession() }
    })
    const host = await connectToOrca()
    const request = { data: 'png', mimeType: 'image/png', suggestedName: 'schema-diagram.png' }
    expect(await host.saveFile?.(request)).toBe('needs-gesture')
  })

  it('passes on any other save failure', async () => {
    vi.stubGlobal('orca', {
      on: () => ({ dispose: () => undefined }),
      files: { saveAs: async () => Promise.reject(new Error('disk full')) },
      document: { session: async () => stubSession() }
    })
    const host = await connectToOrca()
    const request = { data: 'svg', mimeType: 'image/svg+xml', suggestedName: 'schema-diagram.svg' }
    await expect(host.saveFile?.(request)).rejects.toThrow('disk full')
  })
})

type Merge = (base: string, outside: string, mine: string) => string

function stubSession(): DocumentSession {
  return {
    value: '',
    readOnly: false,
    change: () => undefined,
    flush: async () => undefined,
    onReplace: () => ({ dispose: () => undefined })
  }
}
