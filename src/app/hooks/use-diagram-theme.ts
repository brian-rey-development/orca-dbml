import { useEffect, useMemo, useState } from 'preact/hooks'
import type { TextMeasure } from '../../diagram/card-layout'
import { canvasTextMeasure } from '../../diagram/text-measure'
import { readDiagramTheme, type DiagramTheme } from '../../diagram/theme'
import type { EditorHost } from '../../host/editor-host'

export type ThemedMeasure = {
  readonly theme: DiagramTheme
  readonly measure: TextMeasure
}

export function useDiagramTheme(host: EditorHost): ThemedMeasure {
  const [theme, setTheme] = useState(() => readDiagramTheme(document.documentElement))

  useEffect(() => {
    const subscription = host.onThemeChange(() =>
      setTheme(readDiagramTheme(document.documentElement))
    )
    return () => subscription.dispose()
  }, [host])

  const measure = useMemo(
    () => canvasTextMeasure({ fontSans: theme.fontSans, fontMono: theme.fontMono }),
    [theme.fontSans, theme.fontMono]
  )

  return { theme, measure }
}
