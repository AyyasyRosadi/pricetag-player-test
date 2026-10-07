/**
 * Installs `ResizeObserver` as a global, for the legacy bundle.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS NOT `additionalLegacyPolyfills`
 *
 * `additionalLegacyPolyfills: ['resize-observer-polyfill']` looks like it works
 * — it builds, and the package name appears in `polyfills-legacy.js` — but it
 * installs nothing, and the failure is SILENT. Two independent reasons:
 *
 *   1. The package ships two builds:
 *        main   = dist/ResizeObserver.js     (UMD — assigns window.ResizeObserver)
 *        module = dist/ResizeObserver.es.js  (ESM — only `export default`s it)
 *      Vite resolves `module` first, and the ESM build's default export even
 *      prefers the native implementation if one exists. It was never designed
 *      to patch the global.
 *      The UMD build is no help either: bundled as CJS its
 *      `typeof module !== 'undefined'` branch wins, so it exports instead of
 *      assigning.
 *
 *   2. `additionalLegacyPolyfills` cannot reference a local module at all.
 *      `buildPolyfillChunk()` in @vitejs/plugin-legacy builds that chunk with
 *      `root: <the plugin's own dist dir>` and `configFile: false`, so the
 *      project's `@` alias, relative specifiers AND root-absolute specifiers all
 *      fail to resolve ("UNRESOLVED_IMPORT … Module not found"). Only bare
 *      node_modules specifiers resolve, and reason 1 rules those out.
 *
 * So the assignment happens here, in application code, where Vite's resolver
 * works normally. The cost is ~12 kB gzipped in the MODERN bundle, where the
 * guard is a no-op. That is the price of not shipping a blank screen to the TV.
 * ---------------------------------------------------------------------------
 *
 * Without this the frame throws on first paint —
 *   `ReferenceError: ResizeObserver is not defined`
 * — and React unmounts the tree, leaving a blank white screen on the TV while a
 * desktop browser is completely fine. `ResizeObserver` is Chromium 64+, and it
 * is required twice: by the frame canvas (`components/molecules/my-frame`) and
 * by `react-fast-marquee`, which the running-text widget renders. Both call
 * `new ResizeObserver(...)` unguarded.
 *
 * Verified by running the built legacy bundle in a browser with Chromium 53's
 * APIs deleted — see `scripts/make-legacy-probe.mjs`.
 */
import ResizeObserverPolyfill from 'resize-observer-polyfill'

if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = ResizeObserverPolyfill as unknown as typeof ResizeObserver
}
