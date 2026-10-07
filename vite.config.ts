import { fileURLToPath, URL } from 'node:url'
import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Lowest browser the player has to survive on.
//
// The product requirement is "Chrome 56+", but the 2017 smart TVs ship older
// engines than that:
//
//   LG webOS TV 3.5      (2017) -> Chromium 53
//   Samsung Tizen TV 3.0 (2017) -> Chromium 47  (worst case reported; some
//                                  firmware reports Chromium 56, so we target
//                                  the lower one to stay safe)
//
// `chrome >= 47` is a strict superset of `chrome >= 56`, so desktop Chrome 56
// keeps working. Chromium 47 predates native ES modules (Chrome 61),
// `import.meta`, dynamic `import()` and `async`/`await` (Chrome 55), so it
// cannot execute Vite's default modern bundle at all. `@vitejs/plugin-legacy`
// emits a second, Babel + core-js powered copy of the app as SystemJS modules
// and rewrites `index.html` so:
//
//   - modern browsers load `<script type="module">` (fast path, untouched)
//   - Chromium 47/53/56 ignore the module scripts and run `<script nomodule>`
//
// Keep the target in sync in all three places:
//   - `LEGACY_TARGETS` below   -> Babel + core-js (JS)
//   - `browserslist` in package.json -> autoprefixer (postcss)
//   - `build.cssTarget` below  -> lightningcss lowering/minify (CSS)
const LEGACY_TARGETS = ['chrome >= 47']

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: LEGACY_TARGETS,
      // Babel's polyfills are usage-based and only cover JS language features
      // plus statically visible built-ins, for code it can see at build time.
      // Web platform APIs that Chromium 47 lacks are NOT detected
      // automatically, so the ones the ported widgets need are listed here.
      //
      // ResizeObserver (Chromium 64) is required TWICE: by the frame canvas
      // (`components/molecules/my-frame`) and by `react-fast-marquee`, which the
      // running-text widget renders. Both call `new ResizeObserver(...)`
      // unguarded, so without it the frame throws `ReferenceError` on first
      // paint — a blank white screen on the TV while a desktop browser is fine.
      //
      // It is NOT installed from here. `additionalLegacyPolyfills` builds this
      // chunk with the plugin's own `root` and `configFile: false`, so only bare
      // node_modules specifiers resolve — and naming `resize-observer-polyfill`
      // installs nothing anyway, because its ESM build merely exports the class.
      // The global is assigned in `src/polyfills/resizeObserver.ts`, imported by
      // `src/main.tsx`; read that file before touching this.
    }),
  ],
  resolve: {
    // `@/…` mirrors `pt-player`'s tsconfig paths, so ported widget files can
    // keep their import specifiers verbatim.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Vite 8 minifies CSS with lightningcss by default, and `cssTarget` is what
    // drives its lowering pass (it takes precedence over
    // `css.lightningcss.targets`). This is what downlevels CSS nesting,
    // `inset-inline`, `hsl()` alpha and 8-digit hex colours for the TVs.
    //
    // It does NOT rescue everything — flexbox `gap`, `svh` units, logical
    // border/margin properties, `aspect-ratio` and `var()` are passed through
    // unchanged. Those have to be avoided in source; see rules.md.
    cssTarget: 'chrome47',
  },
  preview: {
    // Vite validates the Host header to block DNS-rebinding. Its own allowlist
    // covers `localhost` and any IP literal, which is why LAN access by IP works
    // out of the box — but a hostname must be listed or every request 403s.
    // `pt-player.mdevoffice.net` is wired to this machine through the hosts file
    // (see `npm run serve:https`).
    allowedHosts: ['pt-player.mdevoffice.net'],
  },
})
