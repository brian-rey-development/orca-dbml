type Rgb = {
  readonly red: number
  readonly green: number
  readonly blue: number
}

// WCAG 2 relative luminance: linearize each sRGB channel, then weight it.
const LUMINANCE_WEIGHTS = { red: 0.2126, green: 0.7152, blue: 0.0722 } as const
const LINEAR_SEGMENT_LIMIT = 0.03928
const LINEAR_SEGMENT_SLOPE = 12.92
const GAMMA_OFFSET = 0.055
const GAMMA_EXPONENT = 2.4
const CONTRAST_FLARE = 0.05

const LIGHT_TEXT = '#ffffff'
const DARK_TEXT = '#1f2328'
const LIGHT_TEXT_RGB = hexConstant(LIGHT_TEXT)
const DARK_TEXT_RGB = hexConstant(DARK_TEXT)

/** White or near-black, whichever has more contrast on a DBML `headercolor`. Null when not hex. */
export function readableTextOn(color: string): string | null {
  const background = parseHexColor(color)
  if (!background) return null
  const surface = relativeLuminance(background)
  const light = contrastRatio(surface, relativeLuminance(LIGHT_TEXT_RGB))
  const dark = contrastRatio(surface, relativeLuminance(DARK_TEXT_RGB))
  return light >= dark ? LIGHT_TEXT : DARK_TEXT
}

/** The readable text color for a custom fill, or `fallback` when there is none or it is not hex. */
export function textOnFill(fill: string | null, fallback: string): string {
  return (fill ? readableTextOn(fill) : null) ?? fallback
}

function contrastRatio(a: number, b: number): number {
  const lighter = Math.max(a, b)
  const darker = Math.min(a, b)
  return (lighter + CONTRAST_FLARE) / (darker + CONTRAST_FLARE)
}

function relativeLuminance({ red, green, blue }: Rgb): number {
  return (
    LUMINANCE_WEIGHTS.red * linearize(red) +
    LUMINANCE_WEIGHTS.green * linearize(green) +
    LUMINANCE_WEIGHTS.blue * linearize(blue)
  )
}

function linearize(channel: number): number {
  if (channel <= LINEAR_SEGMENT_LIMIT) return channel / LINEAR_SEGMENT_SLOPE
  return ((channel + GAMMA_OFFSET) / (1 + GAMMA_OFFSET)) ** GAMMA_EXPONENT
}

function parseHexColor(color: string): Rgb | null {
  const digits = color.startsWith('#') ? color.slice(1) : color
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(digits)) return null
  const sixDigits =
    digits.length === 3 ? [...digits].map((digit) => digit + digit).join('') : digits
  return {
    red: channel(sixDigits, 0),
    green: channel(sixDigits, 2),
    blue: channel(sixDigits, 4)
  }
}

function hexConstant(hex: string): Rgb {
  const rgb = parseHexColor(hex)
  if (!rgb) throw new Error(`Not a hex color: ${hex}`)
  return rgb
}

function channel(hex: string, start: number): number {
  return parseInt(hex.slice(start, start + 2), 16) / 255
}
