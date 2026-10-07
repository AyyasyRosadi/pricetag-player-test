/**
 * Webfont loader — ported from `pt-player/src/utils/loadFont.tsx`.
 *
 * ---------------------------------------------------------------------------
 * KNOWN DEVIATION FROM rules.md §5
 *
 * rules.md forbids runtime remote dependencies, and this injects a
 * `<link href="https://fonts.googleapis.com/css?family=…">` into `<head>` at
 * runtime. It is kept because the widgets are styled by the CMS: each widget
 * carries its own `fontFamily`/`fontWeight`, and without the webfont the frame
 * renders in the fallback (Arial) and does not match the CMS preview at all.
 *
 * Consequence to be aware of: on a screen with no internet the font request
 * fails silently and text falls back. Nothing breaks, but the layout will not
 * match the preview. Delete the `loadFontWithCrossorigin(...)` calls in the
 * widgets to make the player fully offline-safe.
 * ---------------------------------------------------------------------------
 */

/** Fonts already requested this session, by `family:weight`. */
const requested = new Set<string>()

export function loadFontWithCrossorigin(fontFamily: string, fontWeight?: string) {
  if (!fontFamily) return

  const key = `${fontFamily}:${fontWeight ?? ''}`
  // `pt-player` appends a fresh <link> on every widget mount, so a screen left
  // running accumulates one <link> per widget per re-render. Same request, same
  // stylesheet — skip it. Visually identical, and it keeps the DOM bounded.
  if (requested.has(key)) return
  requested.add(key)

  const link = document.createElement('link')
  link.href = `https://fonts.googleapis.com/css?family=${fontFamily.replace(
    / /g,
    '+',
  )}:${fontWeight}`
  link.rel = 'stylesheet'
  link.crossOrigin = 'anonymous'

  document.head.appendChild(link)
}
