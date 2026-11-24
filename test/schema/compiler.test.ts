import { afterEach, describe, expect, it, vi } from 'vitest'
import { compileDbml } from '../../src/schema/compile'
import type { CompileRequest } from '../../src/schema/compiler'
import { createSchemaCompiler } from '../../src/schema/compiler'
import type { CompileResult } from '../../src/schema/model'

function tableNames(result: CompileResult | null): string[] | undefined {
  return result?.schema?.tables.map((table) => table.displayName)
}

/** Stands in for the compile worker: holds requests until the test answers or fails them. */
class FakeWorker {
  static latest: FakeWorker | null = null
  readonly requests: CompileRequest[] = []
  private readonly listeners = new Map<string, ((event: { data: unknown }) => void)[]>()

  constructor() {
    FakeWorker.latest = this
  }

  addEventListener(type: string, listener: (event: { data: unknown }) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }

  postMessage(request: CompileRequest): void {
    this.requests.push(request)
  }

  terminate(): void {}

  answer(request: CompileRequest): void {
    const data = { id: request.id, result: compileDbml(request.text) }
    this.listeners.get('message')?.forEach((listener) => listener({ data }))
  }

  fail(): void {
    this.listeners.get('error')?.forEach((listener) => listener({ data: null }))
  }
}

function startFakeWorker(): {
  compile: (text: string) => Promise<CompileResult | null>
  worker: FakeWorker
} {
  vi.stubGlobal('Worker', FakeWorker)
  const compiler = createSchemaCompiler('self.onmessage = null')
  const worker = FakeWorker.latest
  if (!worker) throw new Error('no worker started')
  return { compile: (text) => compiler.compile(text), worker }
}

/** Answers the oldest request the worker has not answered yet. */
function answerNext(worker: FakeWorker): void {
  const request = worker.requests.shift()
  if (!request) throw new Error('the worker has no request to answer')
  worker.answer(request)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createSchemaCompiler', () => {
  it('compiles in this thread when the frame refuses workers', async () => {
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          throw new Error('workers are not allowed here')
        }
      }
    )
    const compiler = createSchemaCompiler('self.onmessage = null')
    expect(tableNames(await compiler.compile('Table users { id int }'))).toEqual(['users'])
  })

  it('compiles one text at a time and skips texts a newer one replaced while waiting', async () => {
    const { compile, worker } = startFakeWorker()
    const first = compile('Table first { id int }')
    const replaced = compile('Table replaced { id int }')
    const newest = compile('Table newest { id int }')
    expect(worker.requests.map((request) => request.text)).toEqual(['Table first { id int }'])
    answerNext(worker)
    expect(tableNames(await first)).toEqual(['first'])
    expect(await replaced).toBeNull()
    answerNext(worker)
    expect(tableNames(await newest)).toEqual(['newest'])
  })

  it('ignores a reply that does not belong to the running compile', async () => {
    const { compile, worker } = startFakeWorker()
    const running = compile('Table users { id int }')
    worker.answer({ id: -1, text: 'Table stray { id int }' })
    answerNext(worker)
    expect(tableNames(await running)).toEqual(['users'])
  })

  it('finishes waiting compiles in this thread when the worker fails to load', async () => {
    const { compile, worker } = startFakeWorker()
    const running = compile('Table users { id int }')
    const waiting = compile('Table orders { id int }')
    worker.fail()
    expect(tableNames(await running)).toEqual(['users'])
    expect(tableNames(await waiting)).toEqual(['orders'])
    expect(tableNames(await compile('Table posts { id int }'))).toEqual(['posts'])
  })
})
