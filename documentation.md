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
| `npm run build` | `tsc -b && vite build` → `dist/`. Emits modern + legacy bundles. ~10–20 s warm, several minutes cold. |
| `npm run preview` | Serves `dist/`. **This is the only local way to exercise the TV path.** |
| `npm run serve:tv` | Same as `preview`, but bound to `0.0.0.0:4173` so a TV on the LAN can reach `http://<your-lan-ip>:4173`. |
| `npm run serve:https` | HTTPS on `0.0.0.0:3030` at `https://pt-player.mdevoffice.net:3030` — same domain and port as `player-pt`. Desktop verification only; see [§13](#13-https-mode). |
| `npm run cert:generate` | (Re)creates the local mkcert leaf for `pt-player.mdevoffice.net`. Needs [mkcert](https://github.com/FiloSottile/mkcert). |
| `npm run lint` | oxlint (`.oxlintrc.json`) |
| `npm run check:tv` | Static **source** guard (`scripts/check-tv-compat.mjs`) |
| `npm run check:bundle` | Parses the built **legacy** bundles and fails on any post-ES2015 syntax (`scripts/check-legacy-bundle.mjs`). Run after `build`. |

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

Those need a **global assignment from application code**, in a module under
`src/polyfills/` imported by `src/main.tsx`:

```ts
// src/polyfills/resizeObserver.ts
import ResizeObserverPolyfill from 'resize-observer-polyfill'

if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = ResizeObserverPolyfill
}
```

⚠️ **Do not use `additionalLegacyPolyfills` for this.** It builds, and the
package name shows up in `polyfills-legacy.js`, but it installs nothing — and it
fails *silently*. Read §17 before trying; this cost a real blank-screen bug on
the LG TV.

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
.env / .env.example        VITE_WS_URL — the Socket.IO origin
pt-player.mdevoffice.net.pem       TLS leaf for HTTPS mode (git-ignored)
pt-player.mdevoffice.net-key.pem   Its private key (git-ignored — never commit)
rules.md                   MUST / MUST NOT browser-support contract
documentation.md           This file
agent.md                   Guidance for AI agents
scripts/
  check-tv-compat.mjs      Static source guard
  check-legacy-bundle.mjs  Parses the built legacy bundles
  serve-https.mjs          HTTPS server on :3030 (domain parity with player-pt)
src/
  main.tsx                 createRoot bootstrap
  App.tsx                  App shell — renders the current page
  index.css                Global styles (literal values only)
  vite-env.d.ts            Types for `import.meta.env`
  hooks/
    useRegistrationCode.ts Registration handshake (phase 1 of the pt-player port)
    useFullscreen.ts       Fullscreen API + `webkit` fallback
  infra/websocket/
    socket.ts              The single shared Socket.IO connection
  utils/
    storage.ts             localStorage wrappers that never throw
  pages/
    home/                  Registration screen (default page)
    media-smoke/           Image/video sanity check, not rendered by default
public/
  favicon.svg              Copied to dist/ verbatim
  images/                  icon.png + title.svg (brand assets)
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
5. 1920×1080 layout, including any part of the UI beyond 1024 px wide.

For the registration screen specifically:

6. The status line reads **Connected** and names the expected host. If it says
   *Offline — retrying*, the TV cannot reach `VITE_WS_URL`: check the TV's
   network, then that the host is reachable from the TV's subnet.
7. A code appears. *"Waiting Registration Code"* means the socket connected but
   no operator has claimed the screen yet — that is a backend state, not a bug.
8. The code survives a reload (it is persisted in `localStorage`).
9. Panels rendered by the media smoke page (`src/pages/media-smoke`) load their
   remote image/video, proving the H.264/MP4 codec and outbound requests work.
   Remember those URLs are hotlinks and may be blocked by referrer checks —
   localise them before shipping.

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
| Build is slow | The legacy Babel pass, now including socket.io | Expected (minutes cold); not a hang |
| `check:tv` fails on a line you accepted | Deliberate deviation | Add `tv-compat-allow: <reason>` on/above the line |
| Status line stuck on *Offline — retrying* | TV cannot reach `VITE_WS_URL` | Check the TV's network, then that the host resolves and answers from that subnet |
| Socket connects but never a code | Backend has not assigned one | Expected: the screen shows *Waiting Registration Code* until an operator claims it |
| Two codes for one screen | An extra `connect`/`reconnect` listener | Bind only `socket.on('connect')`, never Manager `reconnect` too |
| Console: `VITE_WS_URL is not set` | `.env` missing when the build ran | Restore `.env` (or make `.env.local`) and rebuild — Vite inlines the value at build time |
| Code resets on every reload | `localStorage` blocked by the TV | Expected on some firmware; the screen re-registers each boot |

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

`check:bundle` is the counterpart for the artefact — it parses
`dist/*legacy*.js` and reports any construct Chromium 47 cannot execute. The two
are complementary: `check:tv` sees your source, `check:bundle` sees what the TVs
actually download, including everything a dependency dragged in.

---

## 12. Socket.IO and the registration flow

Phase 1 of the port from `pt-player` (`../player-pt`). The registration code is
what identifies a screen to the CMS; until an operator claims it, the screen
shows the code and nothing else.

### Configuration

| Variable | Where | Meaning |
| --- | --- | --- |
| `VITE_WS_URL` | `.env` (override in `.env.local`) | Socket.IO origin, e.g. `https://pricetag-stag2.mdevoffice.net` |

Only `VITE_`-prefixed keys reach the browser. Vite **inlines them into the
bundle at build time**, so they are visible to anyone who downloads the player —
never put a credential there. `VITE_WS_URL` must be a bare origin, without a
path, because socket.io-client appends `path: '/socket.io'` itself.

### The connection

`src/infra/websocket/socket.ts` creates one `io()` at module scope, so the whole
app shares a single connection and re-renders can never open a second one.

```ts
io(VITE_WS_URL, {
  transports: ['websocket'],   // the backend rejects polling ("Transport unknown")
  path: '/socket.io',
  withCredentials: true,       // cookies ride along on the handshake
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
})
```

On a TV this is also the cheapest option: skipping the HTTP long-polling upgrade
avoids several XHRs in flight, and Chromium 47 has a native `WebSocket`.

### The handshake

```
              ┌──────────────────────────────────────────────┐
   no code ──▶│ emit requestRegistrationCode(additionalInfo) │
              └──────────────────────────────────────────────┘
              ┌──────────────────────────────────────────────┐
  has code ──▶│ emit updateSocketId(code, additionalInfo)    │
              └──────────────────────────────────────────────┘

   on registrationCode          (code)  → persist + display, only if none held
   on overwriteRegistrationCode (code)  → persist + display + re-emit updateSocketId
```

`additionalInfo` is `{ width, height, devicePixelRatio, orientation }` read from
`window.screen`. The backend uses it to size the layout it later pushes, so the
field names are part of the wire contract.

Two deliberate divergences from `pt-player`, both fixes rather than behaviour
changes:

1. **Only `socket.on('connect')` is bound**, not Manager `reconnect` as well.
   socket.io re-emits `connect` after every successful reconnection, so binding
   both fires `requestRegistrationCode` twice and can reserve two codes for one
   screen.
2. **Listeners are registered once per mount**, reading `localStorage` inside the
   handler instead of closing over state. `pt-player` re-runs its whole effect on
   every code change, tearing down handlers mid-handshake.

### State

The code is kept in React state *and* `localStorage` (`registrationCode`). A code
already held always wins over one the server sends, so a reconnect cannot
overwrite an operator's assignment. Clearing `localStorage` is how you force a
screen to re-register.

> The hook returns `{ registrationCode, isConnected }`. `isConnected` feeds the
> status line on the registration card — a TV has no devtools, so "did the socket
> connect, and to what host?" is the only question worth answering on the glass.

### Not ported yet

Everything that depends on a published layout stays out until this is stable:
`isPublished`, `content_changes`, `checkCodeIsUsed` / `codeIsUsed`,
`submitRegistrationCode`, `updateContentSyncProgress`,
`request_latest_player_screen`, the `player-render/auth/requestToken` call,
player content fetching, and all rotation handling.

### Verifying the backend by hand

Connect without registering anything (this creates no screen):

```sh
node -e "
const { io } = require('socket.io-client');
const s = io('https://pricetag-stag2.mdevoffice.net', { transports:['websocket'], path:'/socket.io' });
s.on('connect', () => console.log('connected', s.id, s.io.engine.transport.name));
s.on('connect_error', (e) => console.log('error', e.message));
setTimeout(() => process.exit(0), 8000);
"
```

Expect `connected <id> websocket`. To exercise the full registration handshake,
add `s.on('connect', () => s.emit('requestRegistrationCode', JSON.stringify({ width: 1920, height: 1080, devicePixelRatio: 1, orientation: 'landscape-primary' })))`
— but note that **reserves a real screen** on the backend, so open the player on
the TV instead when you want an end-to-end check.

---

## 13. HTTPS mode

`npm run serve:https` runs the built player over TLS at the **same domain and
port as `player-pt`**:

```
https://pt-player.mdevoffice.net:3030
```

| | `player-pt` | this repo |
| --- | --- | --- |
| Domain | `pt-player.mdevoffice.net` | same |
| HTTPS port | `3030` (`server.ts`) | same |
| Plain port | `2020` (`next dev` / `next start`) | `4173` (`serve:tv`) |
| Certificate | mkcert leaf, `*.pem` in the project root | same, but generated here |

### Setup

```sh
npm run cert:generate   # mkcert leaf -> pt-player.mdevoffice.net.pem (+ -key.pem)
npm run build
npm run serve:https
```

`cert:generate` wraps:

```sh
mkcert -cert-file pt-player.mdevoffice.net.pem \
       -key-file pt-player.mdevoffice.net-key.pem \
       pt-player.mdevoffice.net
```

Requires [mkcert](https://github.com/FiloSottile/mkcert) and its CA installed
(`mkcert -install`). **The `.pem` files are git-ignored** — `*.pem` and `*.key`
are in `.gitignore`; never commit a private key. Anyone can regenerate the pair
in one command, so there is nothing to share.

### How the name resolves

`pt-player.mdevoffice.net` has **no public DNS record**. It is wired up in
`C:\Windows\System32\drivers\etc\hosts` as `127.0.0.1`, and the certificate is an
mkcert leaf whose CA is trusted in this machine's *user* root store. Both halves
are machine-local, which is exactly why the URL resolves and validates here.

### What HTTPS mode is — and is not — for

**It is for verifying from this PC.** Specifically it gives you a *secure
context* and a production-shaped `Origin`, which matters because the player talks
to a `wss://` backend.

**It is not usable from a 2017 TV**, for two independent reasons:

1. TV browsers resolve DNS themselves, so the hosts entry does not apply, and
   there is no public A record for the name.
2. The TVs do not have the mkcert CA in their trust stores, so the certificate
   fails validation and the TV refuses the page.

For the TVs, keep using `npm run build && npm run serve:tv` and open
`http://<your-lan-ip>:4173`. If you ever need TLS *on the TV*, it will have to be
a certificate the TV trusts (a real one for a name that genuinely resolves to
this machine) — not mkcert.

The certificate is issued for the hostname only, with no IP SAN, so
`https://172.16.30.107:3030` fails validation. Always use the name.

### Host allow-listing

Vite rejects requests whose `Host` header it does not recognise (DNS-rebinding
protection). Its built-in allowlist covers `localhost` and any IP literal — which
is why the LAN path works untouched — but a hostname has to be declared:

```ts
// vite.config.ts
preview: {
  allowedHosts: ['pt-player.mdevoffice.net'],
}
```

### Verifying it by hand

Windows `curl` uses Schannel, which reports
`CERT_TRUST_REVOCATION_STATUS_UNKNOWN` for a local CA because it cannot reach a
CRL. That is a revocation-check quirk, not a bad certificate. Verify with either:

```sh
CA="C:/Users/ayyas/AppData/Local/mkcert/rootCA.pem"

# Schannel: skip only the revocation check
curl --ssl-no-revoke --cacert "$CA" -o /dev/null -w '%{http_code}\n' \
     https://pt-player.mdevoffice.net:3030/

# OpenSSL: full chain validation
echo | openssl s_client -connect pt-player.mdevoffice.net:3030 \
  -servername pt-player.mdevoffice.net -CAfile "$CA" 2>&1 \
  | grep 'Verify return code'
```

The first prints `200`; the second prints `Verify return code: 0 (ok)`.

> Changing `HTTPS_PORT` or `HTTPS_DOMAIN` in the environment is supported, but
> the certificate must then match the domain — regenerate it with
> `cert:generate` after editing the domain.

---

## 14. The player API, and the CORS allow-list

Phase 2 of the `pt-player` port adds the REST half of the player next to the
Socket.IO half. The socket assigns the screen a `registrationCode`; the REST API
is what actually hands back the published layout.

Base URL: `VITE_API_URL` (`.env`), e.g.
`https://pricetag-stag2.mdevoffice.net/api`. `pt-player` calls the same value
`NEXT_PUBLIC_API_URL`.

### Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/player-render/auth/requestToken` | Body `{ code, socket_id }`. Answers with a **session cookie**; it is the cookie, not the body, that authorises everything after it. |
| `GET` | `/player-render/content/getPlayerContent` | The published layout. Takes **no parameters** — the screen is identified by the cookie. |

Both are sent with `withCredentials: true`; without it there is no cookie and the
second call is a guaranteed `401`.

### Trigger chain

Identical to `pt-player/src/hooks/useSocketIo.tsx`:

```
socket  isPublished === 'Yes'
  ->    POST /player-render/auth/requestToken      registrationCode -> cookie
  ->    GET  /player-render/content/getPlayerContent
```

`isPublished: 'No'` means the operator unpublished the screen.

> Today the response is **only logged** (`usePlayerContent`). Nothing renders it
> yet, and neither the `checkCodeIsUsed` echo nor the 5-minute refresh interval
> `pt-player` runs alongside it is ported.

### ⚠️ The API is served from an allow-list, and that decides where you can test

The backend (Kong) reflects `Access-Control-Allow-Origin` **only for origins on
its allow-list**. Measured against staging:

| Page origin | `Access-Control-Allow-Origin` |
| --- | --- |
| `https://pt-player.mdevoffice.net:3030` | ✅ reflected |
| `https://pricetag-stag2.mdevoffice.net` | ✅ reflected |
| `http://172.16.30.107:4173` — the TV URL | ❌ absent |
| `http://localhost:4173` | ❌ absent |
| `http://localhost:2020` — `pt-player`'s dev port | ❌ absent |

Confirmed from a real browser, not from curl alone:

```
https://pt-player.mdevoffice.net:3030   -> HTTP 401 {"message":"No authentication token found"}
http://172.16.30.107:4173               -> FETCH REJECTED: Failed to fetch
```

The first means "the request arrived and was refused for lack of a cookie", which
is the expected pre-`requestToken` state. The second never left the browser.

**Consequences, in order of importance:**

1. `npm run serve:tv` — the URL the TVs actually use — **cannot call the API.**
   The registration screen works there (the socket is not subject to CORS), but
   `getPlayerContent` will fail. This is a server-side configuration issue, not
   a bug in this repo.
2. `npm run serve:https` **can** call the API, because that origin is
   allow-listed. This is the only local origin that can, which is the real reason
   `pt-player`'s dev server runs at that exact domain and port.
3. To make the API work on a TV, one of these has to happen — none of them is a
   code change in this repo:
   - the backend adds the LAN origin to the allow-list;
   - the player is served from an allow-listed host (a real deployment);
   - the app is put behind a reverse proxy that serves `/api` **same-origin**, so
     CORS never applies. This also removes the cookie's cross-site problem, which
     is the next hurdle after the allow-list (a `Set-Cookie` without
     `SameSite=None; Secure` is dropped on a cross-site request).

`describeApiError` (`src/infra/api/error.ts`) exists to make this failure legible:
a rejected-by-CORS call has no `response` at all, so it reports
"the request never reached the API" instead of axios's bare "Network Error".

### Checking it by hand

```sh
API=https://pricetag-stag2.mdevoffice.net/api

# Is an origin allow-listed?  (empty = no)
curl -s -D - -o /dev/null -X OPTIONS "$API/player-render/content/getPlayerContent" \
  -H "Origin: http://172.16.30.107:4173" \
  -H "Access-Control-Request-Method: GET" | grep -i access-control-allow-origin

# Does the API answer at all?  (404 "Player not found" for a bogus code)
curl -s -X POST "$API/player-render/auth/requestToken" \
  -H 'Content-Type: application/json' \
  -d '{"code":"nope","socket_id":"nope"}'
```

To watch the real flow, open the app at `https://pt-player.mdevoffice.net:3030`,
publish the screen in the CMS, and read the console:

```
[player-content] isPublished: Yes
[player-content] requestToken ok: {…}
[player-content] getPlayerContent: {…}
```

### Ported / not ported

Ported: the axios client (`src/infra/api/client.ts`), `requestPlayerToken`,
`getPlayerContent`, `describeApiError`, and the `isPublished` trigger.

Not ported: rendering anything, `content_changes` (a full page reload in
`pt-player`), `checkCodeIsUsed` / `codeIsUsed`, `submitRegistrationCode`,
`updateContentSyncProgress`, `request_latest_player_screen`, rotation, and the
5-minute refresh interval.

---

## 15. Current state: socket disabled, API probe in its place

WebSockets would not connect in the test environment, so the Socket.IO and
`getPlayerContent` wiring is **commented out, not deleted**.

### What is switched off

In `src/pages/home/index.tsx`, four lines are commented, in two groups:

```tsx
// import useRegistrationCode from '../../hooks/useRegistrationCode'
// import usePlayerContent from '../../hooks/usePlayerContent'
// import { useDelayedFlag } from '../../hooks/useDelayedFlag'
// const OFFLINE_NOTICE_DELAY_MS = 5000

// const { registrationCode, isConnected } = useRegistrationCode()
// usePlayerContent(registrationCode)
// const showOffline = useDelayedFlag(!isConnected, OFFLINE_NOTICE_DELAY_MS)
```

and the socket-down notice is kept commented next to its replacement at the
bottom of the returned JSX.

Uncommenting those lines restores phases 1 and 2 exactly as they were.
`useRegistrationCode.ts`, `usePlayerContent.ts`, `useDelayedFlag.ts`,
`infra/websocket/socket.ts` and `infra/api/*` are all untouched.

**Nothing imports `socket.ts` while this is off**, and `socket.ts` calls
`io(...)` at module scope — so no connection is attempted at all. It also means
`socket.io-client` and `axios` are no longer in the bundle:

| | with socket + API | disabled + probe |
| --- | --- | --- |
| `index-legacy.js` | 241.0 kB | **153.5 kB** |
| `polyfills-legacy.js` | 145.8 kB | **81.2 kB** |
| `index.js` | 223.3 kB | **144.5 kB** |
| build time | 13.6 s | **4.2 s** |

### The probe — REMOVED

`hooks/useApiProbe.ts` existed to answer one question: can this app make an API
call from the TV's environment at all? It fetched
`https://reqres.in/api/users?page=1` and reported into the slot the offline notice
used, outside the card so the card geometry was untouched:

```
call api success with status 200 · #1 George Bluth (george.bluth@reqres.in)
```

It has now been deleted, for three reasons:

1. The question is answered, and the real `/price-tag/*` calls report their own
   failures through the toast.
2. It was a **remote runtime dependency**, which rules.md §5 forbids for shipped
   code.
3. The failure shape it used — a viewport-pinned line across the bottom — is
   where the toast stack now lives.

The `.registration__probe` / `.registration__offline` CSS went with it.

### Insert Code / Submit

The second card button is now **Insert Code** (it toggles the text field, as
before) and a **Submit** button appears below it while the field is open. Submit
writes the trimmed value to `localStorage` under `registrationCode`, updates the
displayed code and closes the field.

With the socket off there is no backend to assign a code, so `localStorage` is
the only source of truth for it — the card reads it on mount.

> The registration constants (`REGISTRATION_CODE_KEY`,
> `WAITING_REGISTRATION_CODE`) moved to `src/constants/registration.ts`.
> `useRegistrationCode` re-exports them, so no import site changed. The move
> matters because importing that hook runs `socket.ts` as a side effect, and the
> home page must not reconnect just to read a string.

---

## 16. The widget layer: canvas, widgets and dummy rendering

The entire widget layer of `pt-player` is now ported: the frame canvas, all 14
object widgets, and the renderer that turns a payload into a positioned layout.

### Socket.IO is gone

`src/infra/websocket/`, `hooks/useRegistrationCode.ts`,
`hooks/usePlayerContent.ts` and `hooks/useDelayedFlag.ts` are deleted, and
`socket.io-client` is uninstalled. Nothing in the bundle references socket.io or
engine.io any more.

`infra/api/*` (axios) survives, because `getPlayerPresignUrl` is still used — by
the video widget.

### Layout

```
src/constants/
  object.ts            LayoutFrameConstants (content types)     [ported]
  dummy.ts             the sample payload to render             [provided by you]
src/types/
  frame.ts  items.ts  object.ts  player-content.ts              [ported]
src/utils/
  parseToJson.ts  formatNumber.ts  loadFont.ts  videoPlayback.ts [ported]
src/components/molecules/my-frame/index.tsx                     [ported]
src/components/atoms/object-*/index.tsx     14 widgets          [ported]
src/pages/content/index.tsx                  frame renderer     [ported]
src/pages/content/components/wrapper.tsx     widget dispatcher  [ported]
src/pages/content/frame-context.ts           FrameContext       [split out]
```

### Rendering the frame

The frame is driven by the API now — see §18. Verified rendered text from a
mocked payload:

```
Loading video…  ~  Matoa KG  ~  225.000  ~  / Kg  ~  10 October 2026
~  Special Price Until:  ~  Close content
```

### Two `erasableSyntaxOnly` problems, and how they were solved

1. **`namespace` is banned** — it emits runtime code. `pt-player` declares every
   type namespace that way (`LayoutFrameTypes`, `ItemsTypes`, …) and the widgets
   are written against `LayoutFrameTypes.LayoutZone`-style qualified names. These
   became `export declare namespace X { export { … } }` — ambient, type-only,
   so nothing is emitted, and the widget code stays verbatim. A plain
   `export type LayoutFrameTypes = { … }` does **not** work: TypeScript refuses
   qualified access through a type alias.
   `LayoutFrameConstants` holds values, so it became a plain `const` object.
2. **`noUnusedLocals` / `noUnusedParameters`** — the upstream widgets carry
   CMS-editor props (`isSelected`, `setWidth`, `setHeight`, `updateSize`) and
   unused imports. Those are dropped, not stubbed.

### New dependencies

| Package | Needed by | Notes |
| --- | --- | --- |
| `dayjs` | period widget | ES5-safe; its `globalThis` reference is `typeof`-guarded with a `self` fallback |
| `react-barcode` | barcode widget | clean — no modern APIs found |
| `qrcode.react` | barcode widget (QR) | clean |
| `react-fast-marquee` | running-text widget | **uses `ResizeObserver`** |
| `resize-observer-polyfill` | devDependency | supplies `ResizeObserver` for the legacy bundle only |

`ResizeObserver` is Chromium 64+, and it is required **twice**: by the canvas and
by `react-fast-marquee`. Both call sites carry a `tv-compat-allow` marker so
`check:tv` does not re-report them.

⚠️ **It is NOT installed via `additionalLegacyPolyfills`** — that approach builds
and appears to work but installs nothing. See §17; this was the cause of a real
blank-screen bug on the LG TV.

Bundle cost of the whole layer:

| | before | after |
| --- | --- | --- |
| `index-legacy.js` | 153.5 kB | **319.5 kB** |
| `polyfills-legacy.js` | 81.2 kB | **157.2 kB** (~76 kB is the observer polyfill) |
| `index.js` | 144.5 kB | **299.5 kB** |

`npm run check:bundle` still reports both legacy bundles as Chromium 47 safe.

### Adaptations from upstream

Every one is commented at its site:

- `@/…` path alias added to `vite.config.ts` + `tsconfig.app.json` so ported
  files keep their import specifiers.
- The `index.tsx` version dispatcher in each widget is collapsed into the widget
  file — both `switch` branches return `V1` upstream.
- `object-image copy/` renamed `object-frame-image/` (a space in a module path).
- `next/image` → `<img>`; `?fromAndroid` / `useSearchParams` dropped;
  `TRotationDegree` / `setIsNeedToRotate` props dropped (they came from the
  socket hook).
- Tailwind / daisyUI class names inside widgets → inline styles (no Tailwind
  build here). The price widget's `justifyContent`/`flexWrap`/`gap` are inert
  upstream too (no `display: flex`) and were left alone to match the CMS preview.
- `styleV1.module.css` → a plain `index.css`.
- `memo(deepEqual)` → plain `memo`; `useCallback` with a mismatched dep list →
  a plain function.
- The video widget falls back to the payload's own `VideoUrl` when the presign
  call fails, so it renders while the API is unreachable.
- `loadFontWithCrossorigin` is deduped (upstream appends a new `<link>` per
  widget mount, unbounded on a screen that runs for weeks).

### ⚠️ Known deviation from rules.md §5

The widgets load their fonts from Google Fonts at runtime
(`utils/loadFont.ts`), which rules.md forbids for shipped code. This was a
deliberate decision: widget typography comes from the CMS, and without the
webfont the frame does not match the CMS preview at all. On an offline screen the
request fails silently and text falls back — nothing breaks, but the layout will
not match. To make it fully offline-safe, delete the
`loadFontWithCrossorigin(...)` calls in the widgets.

### Not ported

`toggle-fullscreen` (a HeroUI button) and `my-autoscale-card` (a CMS preview
helper) — neither is a frame widget, and both would need HeroUI/Tailwind. Also
not ported: the scheduler, screen rotation, and the content-diff/watchdog logic.

---

## 17. The blank-screen bug: `additionalLegacyPolyfills` does not work

**Symptom.** After entering a code and submitting it, the LG TV showed a blank
white screen. The laptop was fine. (At the time, the frame was reached through a
**Show Content** button, since removed — see §18.)

**Cause.** `ResizeObserver is not defined`, thrown during the first effect of
`MyFrame`. React unmounted the tree, so nothing rendered. `ResizeObserver` is
Chromium 64+; the LG (webOS 3.5) is Chromium 53. Modern desktop Chrome has it
natively, which is why the laptop never reproduced it.

The configured fix — `additionalLegacyPolyfills: ['resize-observer-polyfill']` —
**did nothing, and did so silently.** It is broken for two independent reasons:

1. **The package does not self-install.** It ships two builds:

   | field | file | behaviour |
   | --- | --- | --- |
   | `main` | `dist/ResizeObserver.js` | UMD — assigns `window.ResizeObserver` |
   | `module` | `dist/ResizeObserver.es.js` | ESM — only `export default`s the class |

   Vite resolves `module` first, so importing the package for its side effects
   installs nothing. Its ESM default export even prefers the native
   implementation when one exists — it was never designed to patch a global.
   The UMD build does not rescue it either: bundled as CJS, its
   `typeof module !== 'undefined'` branch wins and it exports instead of
   assigning.

2. **`additionalLegacyPolyfills` cannot reference a local module.** That chunk is
   built by `buildPolyfillChunk()` in `@vitejs/plugin-legacy` with
   `root: <the plugin's own directory>` and `configFile: false`. The project's
   `@` alias, relative specifiers **and** root-absolute specifiers all fail with
   `UNRESOLVED_IMPORT … Module not found`. Only bare node_modules specifiers
   resolve — and reason 1 rules those out.

**Fix.** Assign the global from application code, where Vite's resolver behaves
normally: `src/polyfills/resizeObserver.ts`, imported first by `src/main.tsx`.
The guard makes it a no-op on modern browsers. Cost: ~12 kB gzipped in the
*modern* bundle, offset almost exactly by the dead import leaving the polyfill
chunk.

### `npm run probe:legacy` — reproducing TV-only failures

`check:tv` (static source scan) and `check:bundle` (AST scan) both pass on code
that still breaks on a TV, because neither executes anything. Runtime API gaps
are invisible to them.

`scripts/make-legacy-probe.mjs` closes that gap. It writes
`dist/_legacy-probe.html`, a page that:

1. **deletes the APIs Chromium 53 does not have** — `ResizeObserver`,
   `Object.entries`, `Promise.prototype.finally`, `String.prototype.padStart`,
   `Array.prototype.flat`, `AbortController`, `globalThis`, `visualViewport`, …
2. loads the **legacy** polyfill chunk and entry (with `nomodule` stripped, so a
   modern Chrome will run them — this is the only way to exercise the legacy path
   without a TV);
3. **seeds a `registrationCode` in `localStorage`**, so the app takes the
   provisioned path (startup fetch -> content -> frame), then reports uncaught
   errors and rendered text.

The deletion happens *before* the polyfill chunk, exactly as on a real TV, so
whatever core-js restores is what the TV would have had.

The frame only renders if the API answers, so pair the probe with the mock from
§18 when the real routes are missing:

```
npm run mock:api                                    # terminal 1
printf 'VITE_API_URL=http://127.0.0.1:4180/api\n' > .env.local
npm run build && npm run serve:tv                   # terminal 2
npm run probe:legacy
chrome --headless=new --dump-dom http://172.16.30.107:4173/_legacy-probe.html
```

Current output — the second line is the one that matters:

```
after polyfill chunk : {"ResizeObserver":"undefined", ...}
after app entry      : {"ResizeObserver":"function"}

ERRORS (0):

RENDERED TEXT: Welcome to screen ... Screen Registration Code PROBE1 Fullscreen
             ~  Loading video…  ~  Matoa KG  ~  225.000  ~  / Kg
             ~  10 October 2026  ~  Special Price Until:  ~  Close content
```

> `console.error: Video error` is expected and harmless: the media URLs in
> `constants/dummy.ts` are presigned with a 1-hour expiry, so an old copy of the
> payload has a dead video URL. The widget logs it and keeps rendering.
```

> The early snapshot being `undefined` is expected and is *not* a failure: the
> polyfill is installed by the app entry, which runs after the chunk that
> snapshot is taken in. The final line is what proves the fix.

**Rule of thumb:** when something works on the laptop and fails on a TV, do not
reason about it from the source — run `probe:legacy` and look at the error.

---

## 18. Provisioning and the content lifecycle

The registration screen now provisions the screen itself and pulls content,
replacing the old **Show Content** button (which only ever rendered the bundled
`constants/dummy.ts`).

### Button flow

| State | Buttons |
| --- | --- |
| No saved code | `Fullscreen` · `Insert Code` |
| Editing | `Fullscreen` · `Submit` · `Cancel` |
| Code saved | `Fullscreen` |

`Submit` and `Cancel` **replace** `Insert Code` rather than joining it.

**Every button is exactly as wide as the code field**, and their left edges
align — measured at 432.0 px / left 542.8 for the field, `Fullscreen`,
`Insert Code`, `Submit` and `Cancel` alike, in both states. This is a deliberate
deviation from `pt-player`, which uses `w-[80%]` for the button column against
`w-[90%]` for the field, leaving the buttons narrower and misaligned. The
implementation is a single number: `.registration__actions` is `width: 90%` (the
field's own width) and every button fills it, since a column flex container
stretches its children by default.

`Insert Code` is hidden permanently once a code is in `localStorage`: the screen
is provisioned at that point, so re-registering is an operator task, not
something to expose on a TV.

### The API

`infra/api/priceTag.ts`:

```
POST /price-tag/save-code          body { code }        -> { ok: true }
GET  /price-tag/getContent/:code   (code as a path param) -> PlayerContentData
```

A `200 { ok: false }` is treated as a rejection, so a backend that reports
failure in the body cannot get a bad code persisted.

> ⚠️ **These routes are not deployed.** Probed 2026-10-07 against
> `https://pricetag-stag2.mdevoffice.net/api`: `/player-render/...` answers
> `401 application/json` (a real route), while `/price-tag/...` answers
> `404 text/html` with `Vary: rsc` — the Next front-end, not an API. Every call
> therefore fails today, and that failure is shown as an error toast.

### The lifecycle

```
savedCode (localStorage)
      │
      ├─ on mount, if present ──▶ GET /getContent/:code      ('initial')
      │
      └─ every 30s ─────────────▶ GET /getContent/:code      ('poll')
                                        │
                            deepEqual(new, rendered)?
                                        │ yes -> do nothing
                                        └ no  -> replace
```

Implemented in `hooks/usePlayerContent.ts`:

- **Startup**: a code in `localStorage` fetches immediately — no operator action.
- **Poll**: `setInterval` at `CONTENT_POLL_INTERVAL_MS` (30 s).
- **Comparison**: `utils/deepEqual.ts`, not `JSON.stringify` — the latter is
  key-order sensitive, so a backend that reorders its serialisation would look
  like a change and re-mount the frame every 30 s. Verified with 18 cases,
  including key-order permutations.
- **Superseded requests**: a request id guards against a slow earlier response
  overwriting a newer one.
- **Error throttling**: `poll` failures raise a toast only on the *first* failure
  of a streak; otherwise an unreachable backend would stack a new error every 30
  seconds forever. A success resets the streak. `initial` and `explicit` always
  report.

⚠️ **Watch the presigned URLs.** `item_image` and `videoDetails[].VideoUrl` carry
`X-Amz-Date` / `X-Amz-Signature` query strings. If the backend mints new ones on
every call, `deepEqual` will report "changed" on every poll and the frame will
re-mount (restarting video) every 30 s even though nothing moved. The fix belongs
in a normaliser, not in `deepEqual` — see the caveat in that file.

### Toast

`infra/toast/store.ts` is a framework-free queue; `hooks/useToasts.ts` binds it
with `useSyncExternalStore` (a React 18 API, not a browser one — no Chromium 47
concern). `components/molecules/toast-host` renders it bottom right (measured at
`right: 24, bottom: 24`), `pointer-events: none` so a toast can never swallow a
click or take D-pad focus, auto-dismissing after 4 s.

"Code saved successfully" is a success toast; failures use
`describeApiError` and a red tone.

### The transition

Moving from the card to the frame cross-fades over 420 ms. Only `opacity` is
transitioned: `opacity < 1` creates a stacking context but **not** a containing
block, so the frame canvas inside keeps its viewport-relative
`position: fixed`. The 40 ms delay before the fade starts guarantees the browser
has painted the card first, otherwise the transition collapses into the initial
paint and reads as an instant switch.

### Testing it before the backend exists

`scripts/mock-api.mjs` (`npm run mock:api`) is a **dev tool**, not a fallback —
nothing in `src/` knows it exists:

```
npm run mock:api                                    # terminal 1
printf 'VITE_API_URL=http://127.0.0.1:4180/api\n' > .env.local
npm run build && npm run serve:tv                   # terminal 2
# on the TV: Insert Code -> Submit -> frame appears
curl 'http://127.0.0.1:4180/__variant?v=2'          # next poll swaps the content
```

**Delete `.env.local` and rebuild afterwards**, or the build will keep pointing
at the mock.

Verified end to end against this mock:

```
1. initial buttons      : ["Fullscreen","Insert Code"]      Show Content: false
2. after Insert Code    : ["Fullscreen","Submit","Cancel"]
   widths input/submit/cancel: 432.0 / 432.0 / 432.0  -> match: true
4. toast                : "Code saved successfully"   right:24 bottom:24
   localStorage         : "ABC123"
   buttons after save   : ["Fullscreen"]              Insert Code gone: true
5. frame rendered       : true   card faded out: true
   frame text           : ... Matoa KG 225.000 / Kg 10 October 2026 ...

poll  t= 2s / 20s / 40s -> "Matoa KG"        (identical payloads: no change)
      mock switched to variant 2
poll  t=80s             -> "VARIANT TWO ITEM"  (changed payload: replaced)
```

The mock logged exactly the contract specified:

```
OPTIONS /api/price-tag/save-code
POST    /api/price-tag/save-code          -> body {"code":"ABC123"}
GET     /api/price-tag/getContent/ABC123
```

### Removed

- `hooks/useApiProbe.ts` and its `.registration__probe` / `.registration__offline`
  CSS — the temporary reqres.in reachability probe. Its bottom-of-screen slot is
  where the toast stack lives now, and it was a remote runtime dependency that
  rules.md §5 forbids.
- The **Show Content** button and its `constants/dummy.ts` import. `dummy.ts`
  itself is still used, by the mock server and `probe:legacy`.
