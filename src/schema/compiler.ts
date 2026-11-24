import { compileDbml } from './compile'
import type { CompileResult } from './model'

export type CompileRequest = { readonly id: number; readonly text: string }
export type CompileResponse = { readonly id: number; readonly result: CompileResult }

/**
 * Compiles DBML off the main thread, so typing in a large schema never freezes the editor. Only the
 * newest text matters: one compile runs at a time, and a text still waiting when a newer one
 * arrives resolves to null instead of being compiled.
 */
export type SchemaCompiler = {
  compile(text: string): Promise<CompileResult | null>
}

type Job = { readonly text: string; readonly resolve: (result: CompileResult | null) => void }

export function createSchemaCompiler(workerSource: string): SchemaCompiler {
  const worker = startWorker(workerSource)
  return worker ? new WorkerCompiler(worker) : inThreadCompiler()
}

function inThreadCompiler(): SchemaCompiler {
  return {
    compile: async (text) => compileDbml(text)
  }
}

// Some browser clients refuse workers in plugin frames; those compile on the main thread.
function startWorker(source: string): { readonly worker: Worker; readonly url: string } | null {
  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
  try {
    return { worker: new Worker(url), url }
  } catch {
    URL.revokeObjectURL(url)
    return null
  }
}

class WorkerCompiler implements SchemaCompiler {
  private running: (Job & { readonly id: number }) | null = null
  private waiting: Job | null = null
  private nextId = 0
  private failed = false

  constructor(private readonly started: { readonly worker: Worker; readonly url: string }) {
    started.worker.addEventListener('message', (event: MessageEvent<CompileResponse>) =>
      this.settle(event.data)
    )
    started.worker.addEventListener('error', () => this.fallBack())
  }

  compile(text: string): Promise<CompileResult | null> {
    if (this.failed) return Promise.resolve(compileDbml(text))
    return new Promise((resolve) => {
      this.waiting?.resolve(null)
      this.waiting = { text, resolve }
      if (!this.running) this.startNext()
    })
  }

  private startNext(): void {
    const job = this.waiting
    if (!job) return
    this.waiting = null
    this.running = { ...job, id: this.nextId }
    this.nextId += 1
    this.started.worker.postMessage({
      id: this.running.id,
      text: job.text
    } satisfies CompileRequest)
  }

  private settle({ id, result }: CompileResponse): void {
    if (this.running?.id !== id) return
    this.running.resolve(result)
    this.running = null
    this.startNext()
  }

  // A worker that fails to load reports it only as an error event, after construction succeeded.
  private fallBack(): void {
    this.failed = true
    this.started.worker.terminate()
    URL.revokeObjectURL(this.started.url)
    const unfinished = [this.running, this.waiting]
    this.running = null
    this.waiting = null
    unfinished.forEach((job) => job?.resolve(compileDbml(job.text)))
  }
}
