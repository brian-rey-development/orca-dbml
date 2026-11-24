import { compileDbml } from './compile'
import type { CompileRequest, CompileResponse } from './compiler'

/** The worker global this file runs in; the project's DOM typings describe a window instead. */
type CompileWorkerScope = {
  addEventListener(type: 'message', listener: (event: MessageEvent<CompileRequest>) => void): void
  postMessage(message: CompileResponse): void
}

const scope = globalThis as unknown as CompileWorkerScope

scope.addEventListener('message', ({ data }) => {
  scope.postMessage({ id: data.id, result: compileDbml(data.text) })
})
