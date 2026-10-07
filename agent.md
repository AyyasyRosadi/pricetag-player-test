# agent.md — working in this repository as an AI agent

`pricetag-player-vite` is the **SmartPriceTag player**: a React 18 + TypeScript
+Vite 8 application that runs on shop-floor smart TVs and on desktop Chrome.

Read this file before editing. Then read `rules.md` — it is normative, and
`npm run check:tv` enforces the parts that can be automated.

---

## 1. The one thing to remember

The build target is **Chromium 47**, not Chrome 56.

| Target | Engine |
| --- | --- |
| Samsung TV 2017 (Tizen 3.0) | **Chromium 47** ← the floor |
| LG TV 2017 (webOS 3.5) | Chromium 53 |
| Desktop Chrome 56+ | Chromium 56+ |

Chrome 56 is a *subset* of Chromium 47 support, so "works on 47" implies "works
on 53 and 56". Never optimise for 56 at the expense of 47.

The default Vite template assumptions are wrong for this project. Do not
"restore" anything to the template default without checking `rules.md`.

---

## 2. Repo map

```
vite.config.ts          ← the compatibility core: Babel/core-js target + cssTarget
package.json            ← browserslist (autoprefixer) + npm scripts
.env / .env.example     ← VITE_WS_URL (Socket.IO origin); .env.local overrides
<domain>.pem / -key.pem ← mkcert leaf for `serve:https` (git-ignored; NEVER commit)
index.html              ← Vite entry; plugin-legacy rewrites it at build time
scripts/
  check-tv-compat.mjs     ← static source guard (`npm run check:tv`)
  check-legacy-bundle.mjs ← verifies the shipped bundle (`npm run check:bundle`)
  serve-https.mjs         ← HTTPS on :3030 at pt-player.mdevoffice.net
src/
  main.tsx              ← createRoot bootstrap
  App.tsx               ← app shell; renders the current page
  index.css             ← global styles (literal values only)
  vite-env.d.ts         ← types for ImportMetaEnv
  hooks/
    useRegistrationCode.ts ← phase 1: Socket.IO registration handshake
    useFullscreen.ts       ← Fullscreen API with the webkit fallback
  infra/websocket/
    socket.ts              ← the single shared Socket.IO connection
  utils/storage.ts         ← localStorage wrappers (they catch — see rules.md §6.8)
  pages/
    home/                  ← registration screen (the default page)
    media-smoke/           ← manual image/video check, not rendered by default
public/
  favicon.svg
  images/                  ← icon.png + title.svg, brand assets
rules.md                ← MUST / MUST NOT browser-support contract
documentation.md        ← architecture, build, testing, troubleshooting
```

Deliverable: `dist/` (git-ignored). The only server-side code is the local
`scripts/serve-https.mjs` dev server — there is no application backend here.

### Data flow

```
socket.ts (io(import.meta.env.VITE_WS_URL))
      │
      ▼
useRegistrationCode()  ──emit──▶ requestRegistrationCode / updateSocketId
      │                ◀──on──── registrationCode / overwriteRegistrationCode
      ▼
pages/home/index.tsx  → displays the code
```

The wire contract mirrors `pt-player` (`player-pt`). **Do not rename the events
or reshape the payload** — the backend is shared. Anything that depends on a
published layout (`isPublished`, `content_changes`, `checkCodeIsUsed`,
`submitRegistrationCode`, `updateContentSyncProgress`, player content, rotation)
is intentionally still unported.

---

## 3. Commands

```sh
npm run dev          # modern browsers ONLY — HMR/ESM, unusable on a TV
npm run check:tv     # static source guard; fix every error
npm run lint         # oxlint
npm run build        # tsc -b && vite build -> dist/ (modern + legacy bundles)
npm run check:bundle # parses dist/ legacy bundles; run after every build
npm run preview      # serve dist/ — the only way to exercise the TV path
npm run serve:tv     # same, bound to 0.0.0.0 so a TV on the LAN can load it
npm run serve:https  # HTTPS :3030 at pt-player.mdevoffice.net (desktop only)
npm run cert:generate # (re)create the mkcert leaf for `serve:https`
```

`npm run build` is dominated by the legacy Babel pass: roughly 10–20 s with warm
caches, and several minutes on a cold run now that `socket.io-client` is in the
graph. That is expected, not a hang.

`serve:https` gives a secure context and a production-shaped `Origin` for desktop
verification. **A TV cannot use it** — `pt-player.mdevoffice.net` only resolves
through this machine's hosts file and the mkcert CA is trusted only here. For the
TVs use `serve:tv` over the LAN IP. See `documentation.md` §13.

> Never claim a TV-facing change works because it renders in `npm run dev`. The
> dev server serves native ESM, which Chromium 47 cannot execute at all.

---

## 4. Non-negotiables when writing code

### JavaScript

- Polyfillable syntax is fine: `const`, arrow functions, template literals,
  classes, destructuring, spread, `async`/`await`, `?.`, `??`, dynamic
  `import()`. Babel downlevels all of it **because the target is 47**.
- Never use: top-level `await`, `for await...of`, BigInt literals (`10n`),
  RegExp lookbehind / named groups / `\p{…}`, `structuredClone`, `Object.hasOwn`,
  `Array#at`, `Array#flat`/`flatMap`, `String#replaceAll`,
  `Promise.allSettled`/`any`, `globalThis`, `WeakRef`.
- New Web API (e.g. `ResizeObserver`, `IntersectionObserver`)? Register it in
  `vite.config.ts` under `additionalLegacyPolyfills`. Usage-based polyfilling
  will not discover it.

### CSS

- **Literal colours only.** `var()` is Chromium 49+, and lightningcss deletes the
  literal-then-`var()` fallback trick at build time. If you need tokens, gate the
  `var()` behind `@supports` or preprocess with Sass.
- No flexbox `gap` (Chromium 84) — use `margin`. No `svh`/`dvh` — use `vh`.
  No logical properties (`border-inline`, `inset-inline`) — use `left`/`right`.
  No Grid (Chromium 57), `aspect-ratio` (88), `clamp()` (79), `@container` (105).
- Style `:focus` directly; a TV has no pointer and the user must see the
  selection. Never let `:focus-visible` be the only focus style.
- Write flat CSS, not nesting, even though Vite would lower it.

### HTML / assets

- Pair `href` with `xlinkHref` on every `<use>`.
- Keep sprites same-origin and served as `image/svg+xml`.
- The app must be served over `http(s)`, never `file://`.
- No runtime CDN, remote font, or analytics dependency.

### Socket.IO / backend

- The wire contract mirrors `pt-player`. **Never rename an event or reshape a
  payload** — the backend is shared with the Next.js player and there is no
  version negotiation.
- One connection for the whole app, created at module scope in
  `src/infra/websocket/socket.ts`. Do not call `io()` anywhere else.
- `transports: ['websocket']` only — the backend rejects polling.
- Endpoints come from `import.meta.env.VITE_WS_URL` (`.env`). Never hardcode a
  host in a component, and never put a secret in a `VITE_` variable: Vite inlines
  it into the bundle and the TV downloads it.
- Wrap every `localStorage` access — TV firmware throws
  ([rules.md §6.8](./rules.md#6-traps-that-no-tool-catches)).
- Guard optional APIs (`screen.orientation?.type`) — a throw inside the connect
  handler silently kills the whole registration flow.

---

## 5. Workflow

1. **Before editing** — skim `rules.md` for the area you are touching.
2. **While editing** — if you need to break a rule, add
   `tv-compat-allow: <reason>` on the line (or the line above) and explain why in
   your summary. Do not silently deviate.
3. **After editing**
   ```sh
   npm run check:tv && npm run lint && npm run build && npm run check:bundle
   ```
   All four must pass. `check:tv` and `check:bundle` exit non-zero on errors.
4. **Verify the artefact**, not just the source:
   ```sh
   npm run check:bundle                             # parses dist/ legacy bundles
   grep -o 'gap:[^;}]*' dist/assets/*.css           # expect nothing
   grep -oE '[0-9]+(svh|dvh|lvh)' dist/assets/*.css # expect nothing
   grep -o 'var(--' dist/assets/*.css | wc -l       # expect 0
   ```
5. **Report honestly.** If you could not test on a real device, say so. Do not
   describe something as verified when only `npm run dev` was used. Likewise, do
   not claim the Socket.IO integration works if you only exercised it against a
   mock — the backend contract in `pt-player` is the source of truth.

---

## 6. Changing the browser target

Only touch the target if the task explicitly asks. It lives in three places and
they must move together:

| File | Setting |
| --- | --- |
| `vite.config.ts` | `LEGACY_TARGETS = ['chrome >= 47']` |
| `package.json` | `"browserslist": ["chrome >= 47"]` |
| `vite.config.ts` | `build.cssTarget: 'chrome47'` |

Raising the floor is safe and shrinks the bundle. **Lowering it below 47 is not
supported** by this setup — see `documentation.md`.

---

## 7. Failure modes to recognise

| Symptom on a TV | Likely cause |
| --- | --- |
| Blank white screen, nothing renders | `async`/`await` or ESM reaching the TV; the target was raised |
| Text black on white, no colours, no borders | `var()` reached Chromium 47 |
| Layout fine but elements touch each other | flex `gap` silently ignored |
| Icons missing, links fine | external `<use>` without `xlinkHref`, or `file://` |
| Icons render on desktop, not on TV | sprite MIME type / cross-origin |
| Element focus is invisible | `:focus-visible` used alone |
| Whole screen dead | an unsupported API threw during bootstrap — check `additionalLegacyPolyfills` |
| Works in `npm run dev`, fails in `preview` | the legacy bundle is what TVs run; debug `dist/`, not the dev server |

---

## 8. Conventions

- TypeScript strict-ish, ESM, no default exports except components.
- Keep `src/` free of `any`; the TS config is not a compatibility checker, so
  read `rules.md` rather than trusting types.
- Comments in this repo explain **why**, especially where a line looks wrong but
  is deliberate (literal colours, `:focus`, margins instead of `gap`). Preserve
  them.
- Do not reformat or "modernise" existing TV-safe CSS. Literal values and
  flattened rules are deliberate.
