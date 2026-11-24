import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { SchemaCompiler } from '../../schema/compiler'
import {
  afterCompile,
  inCurrentText,
  NOTHING_COMPILED,
  type CompiledSchema
} from '../compile-state'

const COMPILE_DELAY_MS = 150
const FIRST_REQUEST = 1

export function useCompiledSchema(text: string, compiler: SchemaCompiler): CompiledSchema {
  const [state, setState] = useState(NOTHING_COMPILED)
  const latestRequest = useRef(0)

  useEffect(() => {
    const request = latestRequest.current + 1
    latestRequest.current = request
    const delay = request === FIRST_REQUEST ? 0 : COMPILE_DELAY_MS
    const timer = setTimeout(async () => {
      const result = await compiler.compile(text)
      if (result === null || latestRequest.current !== request) return
      setState((previous) => afterCompile(previous, text, result))
    }, delay)
    return () => clearTimeout(timer)
  }, [text, compiler])

  return useMemo(() => inCurrentText(state, text), [state, text])
}
