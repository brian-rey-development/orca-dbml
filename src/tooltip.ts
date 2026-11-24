const TOOLTIP_ATTRIBUTE = 'data-tooltip'

type TooltipProps = Partial<Record<typeof TOOLTIP_ATTRIBUTE, string>>

/**
 * Marks an element, HTML or SVG, with the text the tooltip layer shows for it. Orca shows editors
 * in a webview that never displays native `title` tooltips, so the plugin draws its own.
 */
export function tooltipProps(text: string | null): TooltipProps {
  return text ? { [TOOLTIP_ATTRIBUTE]: text } : {}
}

/** The nearest element at or above `target` that has a tooltip. */
export function tooltipOwner(target: EventTarget | null): Element | null {
  return target instanceof Element ? target.closest(`[${TOOLTIP_ATTRIBUTE}]`) : null
}

export function tooltipText(owner: Element): string {
  return owner.getAttribute(TOOLTIP_ATTRIBUTE) ?? ''
}
