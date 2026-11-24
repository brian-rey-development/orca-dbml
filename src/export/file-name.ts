import type { Schema } from '../schema/model'

const FALLBACK_NAME = 'schema'

export function exportFileName(schema: Schema | null, extension: string): string {
  const base = schema?.projectName ?? FALLBACK_NAME
  const slug = base
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug || FALLBACK_NAME}-diagram.${extension}`
}
