export type TextChange = {
  readonly from: number
  readonly to: number
  readonly insert: string
}

export function minimalChange(before: string, after: string): TextChange | null {
  if (before === after) return null
  const prefix = commonPrefixLength(before, after)
  const suffix = commonSuffixLength(before, after, prefix)
  return {
    from: prefix,
    to: before.length - suffix,
    insert: after.slice(prefix, after.length - suffix)
  }
}

function commonPrefixLength(a: string, b: string): number {
  const limit = Math.min(a.length, b.length)
  let length = 0
  while (length < limit && a[length] === b[length]) length += 1
  return length
}

function commonSuffixLength(a: string, b: string, prefix: number): number {
  const limit = Math.min(a.length, b.length) - prefix
  let length = 0
  while (length < limit && a[a.length - 1 - length] === b[b.length - 1 - length]) length += 1
  return length
}
