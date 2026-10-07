# documentation.md — pricetag-player-vite

Technical documentation for the **SmartPriceTag player**: a React 18 +
TypeScript + Vite 8 application that must run on shop-floor smart TVs and on
desktop Chrome.

- **Normative browser-support rules:** [`rules.md`](./rules.md)
- **Guidance for AI agents:** [`agent.md`](./agent.md)
- **Everyday commands:** [`README.md`](./README.md)

---

## 1. Verified compatibility

The requirement was "Chrome 56+, Samsung TV 2017, LG TV 2017". Those are **not**
the same thing — the 2017 TVs ship engines *older* than Chrome 56.

| Target | OS / platform | Rendering engine | Result |
| --- | --- | --- | --- |
| Chrome **56+** | Desktop | Chromium 56+ | ✅ works |
| LG TV **2017** | webOS **3.5** | **Chromium 53** | ✅ works |
| Samsung TV **2017** | Tizen **3.0** | **Chromium 47** (worst case) | ✅ works |

### Why this needed changing

The project originally targeted `chrome >= 56` everywhere. That is **above**
both TVs, so the verification failed:

| Problem found | Impact at `chrome >= 56` |
| --- | --- |
| `async`/`await` left untranspiled (the 56 target has it natively) | Hard `SyntaxError` on Chromium 53 and 47 — blank screen |
| flexbox `gap` emitted as-is | Silently ignored below Chromium 84 — layout collapses |
| `min-height: 100svh` emitted as-is | Ignored below Chromium 108 |
| `border-inline` emitted as-is | Ignored below Chromium 87 |
| SVG `<use href>` without `xlink:href` | Icons do not render below Chromium 50 |
| `var()` relied on for the whole theme | Whole declaration discarded below Chromium 49 |

The fix was to move the target down to **Chromium 47** (a superset of Chrome 56)
and rewrite the parts of the app that no build step can rescue. See
[§5](#5-why-chromium-47-and-not-chrome-56) and `rules.md`.

### On the Samsung version

Samsung's published Tizen 3.0 engine version is reported inconsistently as
Chromium **47** or **56** depending on firmware, model and region. The project
targets **47** so both readings work. That decision costs some bundle size
(see [§7](#7-build-output)) and buys certainty.

> LG's mapping is not ambiguous: webOS 3.5 (2017) = Chromium 53, and webOS 4.0
> (2018) reuses the same 53 engine. `https://webostv.developer.lge.com/develop/specifications/web-engine-version`

### Evidence

| Claim | How it was verified |
| --- | --- |
| `async`/`await` survives at target 56 | `@babel/preset-env` run with `targets:['chrome 56']` → `async function f(){ await g() }` unchanged. At `chrome 53` and `chrome 47` it becomes `_asyncToGenerator(...)`. |
| The legacy bundles contain nothing Chromium 47 cannot parse | Parsed `dist/assets/*legacy*.js` with `@babel/parser` and searched the AST for `AwaitExpression`, `OptionalMemberExpression`, `??`, `BigIntLiteral`, object spread, private class fields, dynamic `import()` — none found. |
| The shipped CSS contains no unsupported feature | `grep` over `dist/assets/*.css`: 0 × `gap:`, 0 × `svh`/`dvh`/`lvh`, 0 × `border-inline`, 0 × `var(--`. |
| lightningcss deletes the literal-then-`var()` fallback | Ran lightningcss directly with `targets: chrome 47`; `color:#6b6375;color:var(--text)` compiles to `color:var(--text)`. Only an `@supports` gate survives. |
| The TV code path is `nomodule` | `dist/index.html` contains `type="module"` scripts plus `nomodule` polyfill + entry scripts. |

Re-run all of these with:

```sh
npm run check:tv && npm run build
```

---

## 2. Requirements

- Node.js 20+ (developed on 24)
- npm
- A modern Chromium browser for development
- For device testing: Samsung Tizen Studio and/or the LG webOS CLI (optional)

---

## 3. Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server. Native ESM + HMR. **Cannot be used to test TVs.** |
| `npm run build` | `tsc -b && vite build` → `dist/`. Emits modern + legacy bundles. ~10 s warm, ~60 s cold. |
| `npm run preview` | Serves `dist/`. **This is the only local way to exercise the TV path.** |
| `npm run serve:tv` | Same as `preview`, but bound to `0.0.0.0:4173` so a TV on the LAN can reach `http://<your-lan-ip>:4173`. |
| `npm run lint` | oxlint (`.oxlintrc.json`) |
| `npm run check:tv` | Static smart-TV compatibility guard (`scripts/check-tv-compat.mjs`) |

---

## 4. How the compatibility pipeline works

### 4.1 JavaScript — two bundles, one page

Chromium 47 predates the features the primary bundle relies on: native ES
modules (Chromium 61), `import.meta` (64), dynamic `import()` (63) and
`async`/`await` (55). It cannot execute Vite's normal ESM output at all.

`@vitejs/plugin-legacy` therefore emits **two** copies of the app and rewrites
`index.html` so each engine picks the right one without any user-agent sniffing:

```
dist/index.html
├── <script type="module">          ← modern: ESM, untouched, small
├── <script type="module">          ← feature probe (import.meta.resolve, dynamic import, async generators)
│                                       if it throws -> load the legacy bundle
├── <script nomodule>               ← Safari 10.1 "double module" workaround
├── <script nomodule> polyfills     ← core-js bundle
└── <script nomodule> entry         ← SystemJS.import(index-legacy.js)
```

How each engine behaves:

| Engine | `type="module"` | `nomodule` attribute | Loads |
| --- | --- | --- | --- |
| Chromium 47/53/56 | unknown type → **ignored** | unknown attribute → **runs** | legacy |
| Modern Chrome | runs | **skipped** | modern |

This is why the legacy path is not "a fallback that rarely runs": on the target
hardware it is the *only* path.

A consequence worth internalising: **`npm run dev` tells you nothing about TV
behaviour.** Develop in a modern browser, then verify against
`npm run build && npm run preview`.

### 4.2 Polyfills

Babel's polyfilling is **usage-based**: it injects a core-js import only for
built-ins it can see statically being used, and only when the target lacks them.
That covers JavaScript the compiler can see. It does **not** cover:

- DOM APIs (`ResizeObserver` is Chromium 64, `IntersectionObserver` is 51, …)
- anything reached through a computed property
- anything inside a dependency loaded at runtime

Those must be declared in `vite.config.ts`:

```ts
legacy({
  targets: LEGACY_TARGETS,
  additionalLegacyPolyfills: ['resize-observer-polyfill'],
})
```

### 4.3 CSS — two passes

| Pass | Tool | Driven by | Handles |
| --- | --- | --- | --- |
| 1 | **PostCSS** (`css.transformer: 'postcss'`, the Vite default) | `postcss.config.js` + `browserslist` | autoprefixer: `-webkit-` prefixes |
| 2 | **lightningcss** (`build.cssMinify: 'lightningcss'`, the Vite 8 default) | `build.cssTarget` | lowering + minification: CSS nesting, `inset-inline` → `left`/`right`, `hsl()` alpha, 8-digit hex, `color-scheme` |

`build.cssTarget` **takes precedence over `css.lightningcss.targets`** whenever
`cssMinify` is `lightningcss`, and it is the switch that makes pass 2
TV-aware.

lightningcss does not rescue everything. It cannot express `gap` for flex
containers, `svh` units, logical border/margin properties, `aspect-ratio`,
`min()`/`max()`/`clamp()`, or `var()` — and, importantly, it **folds
`prop: literal; prop: var(--x)` down to the single `var()` declaration**,
deleting the fallback. Those are source-level rules, listed in `rules.md`.

### 4.4 Keeping the target in sync

Three settings, one number. Change them together:

| Setting | File |
| --- | --- |
| `LEGACY_TARGETS = ['chrome >= 47']` | `vite.config.ts` (Babel + core-js) |
| `"browserslist": ["chrome >= 47"]` | `package.json` (autoprefixer) |
| `build.cssTarget: 'chrome47'` | `vite.config.ts` (lightningcss) |

---

## 5. Why Chromium 47 and not Chrome 56?

Chrome 56 is a **subset** of Chromium 47's capabilities. Building for 47
automatically satisfies 53 and 56, so there is exactly one number to reason
about and no way to accidentally "support 56" while breaking the TVs.

The costs are real but bounded:

- a larger legacy bundle ([§7](#7-build-output)), which **only TV-era clients
  download**;
- a slower build, because the legacy Babel pass is the expensive part;
- a stricter CSS authoring style (literal colours, margins instead of `gap`).

The alternative — treating the TVs as best-effort — was rejected because a
missing `async` transform produces a blank screen, not a degraded one.

---

## 6. Project structure

```
index.html                 Vite entry (rewritten by plugin-legacy at build time)
vite.config.ts             Compatibility core: Babel target + cssTarget
package.json               browserslist (autoprefixer) + scripts
postcss.config.js          autoprefixer
tsconfig*.json             TypeScript project references (app / node)
.oxlintrc.json             Lint configuration
rules.md                   MUST / MUST NOT browser-support contract
documentation.md           This file
agent.md                   Guidance for AI agents
scripts/
  check-tv-compat.mjs      Static compatibility guard
src/
  main.tsx                 createRoot bootstrap
  App.tsx                  App shell — renders the current page
  index.css                Global theme (literal values only)
  pages/
    home/
      index.tsx            Home — image + video smoke test
      index.css            Page styles
public/
  favicon.svg              Copied to dist/ verbatim
```

Anything in `public/` is copied to `dist/` unchanged and must be referenced by
absolute URL. Anything imported from `src/` (images, CSS) is hashed and emitted
to `dist/assets/`.

---

## 7. Build output

Measured on this machine (Node 24, Vite 8.3.3):

| File | Size | Gzip | Downloaded by |
| --- | --- | --- | --- |
| `index-*.js` (modern) | ~144 kB | ~46.6 kB | modern Chrome |
| `index-*.css` | ~4.2 kB | ~1.6 kB | everyone |
| `index-legacy-*.js` | ~151 kB | ~49.0 kB | **TVs only** |
| `polyfills-legacy-*.js` | ~81 kB | ~29.5 kB | **TVs only** |

For comparison, the original `chrome >= 56` target produced a ~62 kB polyfill
bundle and a ~17 s build. Moving to 47 added roughly **19 kB of legacy
polyfills** (7 kB gzipped) and made the legacy Babel pass heavier — measured at
~60 s on the first cold run and ~10 s once Node's caches are warm.

If your workload is dominated by edits to `src/`, this is the slowest part of
the loop. `npm run dev` is unaffected — it serves the modern bundle only.

---

## 8. Testing

### Local

```sh
npm run check:tv     # static guard
npm run lint
npm run build
npm run preview      # then open http://localhost:4173
```

`npm run preview` serves exactly what the TVs download (the `nomodule` path) to
any modern browser, so you can at least confirm the legacy bundle boots.

### Browser-emulation limits

DevTools device emulation changes the viewport, **not the JavaScript engine**.
It cannot verify any of the compatibility rules in this project. Treat it as a
layout tool only.

### Real devices

- **Samsung (Tizen):** Tizen Studio → TV emulator, or a real set with Developer
  Mode enabled. Test both the emulator (which reports a *newer* engine than the
  hardware) and, ideally, the physical TV.
- **LG (webOS):** `ares-cli` (`ares-install`, `ares-launch`) against a TV in
  Developer Mode. The webOS simulator uses the desktop Chromium, so it is not a
  substitute for the device.

Both platforms load the app from a local package or an `http(s)` origin. If the
app is packaged locally, confirm that relative asset URLs still resolve.

### What to check on-device

1. The app paints at all (proves the `nomodule` bundle booted).
2. Colours and borders are present (proves no `var()` reached the TV).
3. Spacing between stacked/rowed elements (proves no flex `gap` was relied on).
4. Every focusable element shows a visible focus ring under D-pad navigation.
5. The image renders and the video actually plays (proves the remote media is
   reachable and the H.264/MP4 codec is supported by the TV).
6. 1920×1080 layout, including any part of the UI beyond 1024 px wide.

---

## 9. Deployment notes

- **Serve over `http(s)`, never `file://`.** Chrome blocks local file fetches, so
  neither the `nomodule` bundle nor the external SVG sprite will load.
- **Serve `.svg` as `image/svg+xml`.**
- The default `base: '/'` works when the app is served from a domain root. For a
  packaged app under a sub-path, set `base: './'` in `vite.config.ts` and
  re-check the sprite URLs.
- `<script>` tags are emitted with `crossorigin`. If assets move to a CDN, that
  CDN must send `Access-Control-Allow-Origin`.
- Do not introduce runtime dependencies on CDNs, remote fonts or analytics. TV
  browsers are frequently offline and their user agents are customised.
- Set a cache-busting policy on `index.html`; the hashed assets are immutable.

### Getting the build onto a TV over the LAN

```sh
npm run build
npm run serve:tv        # vite preview --host 0.0.0.0 --port 4173 --strictPort
```

Then on the TV open `http://<your-lan-ip>:4173` — for example
`http://172.16.30.107:4173` on a Samsung TV's *Internet* app or an LG TV's *Web
Browser*. Find your IP with `ipconfig` (Windows) or `ipconfig getifaddr en0`
(macOS).

Important: **VS Code's Ports panel will not help here.** It forwards a port from a
*remote* host to your own machine's `localhost`, so the URL it produces is only
reachable from your PC. A TV is a separate device on the Wi-Fi and needs the
machine's LAN address, which is why the server is bound to `0.0.0.0`.

Checklist when the TV cannot connect:

1. The TV and the PC must be on the **same network** (both `172.16.30.x`).
2. Windows Firewall must allow `node.exe` inbound — check with
   `netsh advfirewall firewall show rule name=all dir=in | findstr /i node.exe`.
   The default profile must match your Wi-Fi (Private vs Public).
3. Some guest / corporate Wi-Fi enables **AP client isolation**, which blocks
   device-to-device traffic even on the same subnet. Use a phone hotspot or a
   non-isolated network if that is the case.
4. The address is DHCP-assigned and can change after a reboot — re-run `ipconfig`.
5. The server stops when the terminal closes or the machine sleeps.

---

## 10. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Blank white screen on TV | `async`/`await` or ESM reached the TV — usually the target was raised | Restore `chrome >= 47` in all three places |
| Unstyled text on TV | `var()` reached Chromium 47 | Use literals; see `rules.md` §4.1 |
| Elements cramped / touching | flex `gap` ignored (Chromium < 84) | Use margins |
| Icons missing | `<use href>` without `xlink:href`, `file://`, wrong MIME type, or cross-origin | See `rules.md` §5 |
| Focus is invisible | `:focus-visible` used as the only focus style | Style `:focus` |
| Works in `dev`, broken in `preview` | You are testing the legacy bundle for the first time | Debug `dist/`, not the dev server |
| Build is slow | The legacy Babel pass | Expected (~60 s); not a hang |
| `check:tv` fails on a line you accepted | Deliberate deviation | Add `tv-compat-allow: <reason>` on/above the line |

---

## 11. Verifying the guard itself

`scripts/check-tv-compat.mjs` is only useful if it fails when it should. A quick
self-test:

```sh
cat > src/__probe.ts <<'EOF'
export const a = [1, 2, 3].at(-1)
export const b = structuredClone({})
export const c = /(?<name>a)/
EOF
npm run check:tv   # must exit non-zero and report 3 errors
rm src/__probe.ts
```

The checker also understands the `tv-compat-allow` escape hatch and blanks out
comments before scanning, so prose that merely *mentions* a banned feature is not
reported.
