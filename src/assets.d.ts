declare module '*.dbml' {
  const source: string
  export default source
}

declare module '*.css'

/** Defined by scripts/bundle.mjs; read it through schema/bundled-worker.ts. */
declare const COMPILE_WORKER_SOURCE: string
