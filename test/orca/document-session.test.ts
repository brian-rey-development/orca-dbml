import { mockEditorHost, type MockEditorHost } from 'orca/testing'
import { afterEach, describe, expect, it } from 'vitest'
import { connectToOrca } from '../../src/host/orca-host'

const BASE = 'Table users {\n  id int\n}\n\nTable posts {\n  id int\n}\n'

let mock: MockEditorHost | null = null

function openFile(text: string, readOnly = false): MockEditorHost {
  mock = mockEditorHost({ text }, { readOnly })
  return mock
}

afterEach(() => {
  mock?.dispose()
  mock = null
})

describe("the editor against Orca's own document session", () => {
  it('writes an edit typed a moment before saving', async () => {
    const file = openFile(BASE)
    const { document } = await connectToOrca()
    document.change(`${BASE}Table tags { id int }\n`)
    await file.flush()
    expect(file.text).toBe(`${BASE}Table tags { id int }\n`)
  })

  it('hears a write made outside the editor', async () => {
    const file = openFile(BASE)
    const { document } = await connectToOrca()
    const heard: string[] = []
    document.onReplace((text) => heard.push(text))
    file.replace(`${BASE}Table agent { id int }\n`)
    await file.flush()
    expect(heard).toEqual([`${BASE}Table agent { id int }\n`])
  })

  it('keeps both sides when an outside write lands while an edit is in flight', async () => {
    const file = openFile(BASE)
    const { document } = await connectToOrca()
    const outside = BASE.replace('Table posts {\n  id int', 'Table posts {\n  id int\n  title text')
    const mine = BASE.replace('Table users {\n  id int', 'Table users {\n  id int\n  email text')
    file.conflictNext(outside)
    document.change(mine)
    await file.flush()
    expect(file.text).toBe(
      'Table users {\n  id int\n  email text\n}\n\nTable posts {\n  id int\n  title text\n}\n'
    )
  })

  it('saves a CRLF file with its own line breaks', async () => {
    const crlf = BASE.replaceAll('\n', '\r\n')
    const file = openFile(crlf)
    const { document } = await connectToOrca()
    document.change(`${crlf}Table tags { id int }\r\n`)
    await file.flush()
    expect(file.text).toBe(`${crlf}Table tags { id int }\r\n`)
  })

  it('opens a read-only file as read-only', async () => {
    openFile(BASE, true)
    const { document } = await connectToOrca()
    expect(document.readOnly).toBe(true)
  })
})
