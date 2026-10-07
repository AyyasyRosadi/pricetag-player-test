# pricetag-player-vite

React 18 + TypeScript + Vite 8 player for **SmartPriceTag**, targeting shop-floor
smart TVs and desktop Chrome.

## Browser support

| Target | OS / platform | Rendering engine |
| --- | --- | --- |
| Chrome 56+ | Desktop | Chromium 56+ |
| LG TV 2017 | webOS 3.5 | **Chromium 53** |
| Samsung TV 2017 | Tizen 3.0 | **Chromium 47** (worst case) |

Chrome 56 is the *stated* requirement, but the 2017 TVs ship **older** engines
than that. Because Chrome 56 is a subset of Chromium 47 support, this project
targets **Chromium 47** — the single floor that satisfies all three. Building for
56 alone would ship a bundle that throws a `SyntaxError` on both TVs.

📄 **[rules.md](./rules.md)** — the MUST / MUST NOT rules that keep this true.
📄 **[documentation.md](./documentation.md)** — architecture, build, testing, troubleshooting.
📄 **[agent.md](./agent.md)** — orientation for AI agents working in this repo.

## Getting started

```sh
npm install
cp .env.example .env.local   # only if you need a different backend
npm run dev          # modern browsers only — HMR/native ESM, unusable on a TV
npm run build        # -> dist/ with both a modern and a legacy (TV) bundle
npm run check:bundle # verify the built legacy bundles are Chromium 47 safe
npm run preview      # serve dist/ — the only local way to exercise the TV path
npm run serve:tv     # same, bound to 0.0.0.0 so a TV on your LAN can load it
npm run cert:generate # once: mkcert leaf for the HTTPS dev domain
npm run serve:https  # HTTPS :3030 at https://pt-player.mdevoffice.net
npm run check:tv     # static source guard for TV compatibility
npm run lint
```

Three ways to run it, for three different purposes:

| | URL | Who can open it |
| --- | --- | --- |
| `serve:tv` | `http://<lan-ip>:4173` | **the TVs** on your network |
| `serve:https` | `https://pt-player.mdevoffice.net:3030` | this machine only (hosts entry + mkcert CA); see [documentation.md §13](./documentation.md#13-https-mode) |
| `preview` | `http://localhost:4173` | this machine only |

The HTTPS mode mirrors `player-pt` — same domain, same port — but it cannot be
used from a TV: the domain has no public DNS record and TV browsers do not trust
the mkcert CA. Use `serve:tv` for the TVs.

Configuration lives in `.env` (committed, shared defaults) with per-machine
overrides in `.env.local` (git-ignored). Only `VITE_`-prefixed keys reach the
browser, and they are **inlined into the bundle** — never put a secret there.

| Variable | Meaning |
| --- | --- |
| `VITE_WS_URL` | Socket.IO origin of the player backend, e.g. `https://pricetag-stag2.mdevoffice.net` |

> `npm run dev` serves native ES modules with HMR, so **Chromium 47/53/56 cannot
> load it**. Develop in a modern browser, then verify real TV behaviour against
> `npm run build && npm run preview`, and finally on a device.
>
> To open the player on a TV, run `npm run build && npm run serve:tv` and point
> the TV's browser at `http://<your-lan-ip>:4173`. Note that VS Code's *Ports*
> panel forwards to your PC's `localhost`, which a TV on the network cannot
> reach — use the LAN address instead. Details in
> [documentation.md §9](./documentation.md#9-deployment-notes).

`npm run build` is dominated by the legacy Babel pass — roughly 10–20 s with a
warm cache, several minutes on the first run after a clean install now that
`socket.io-client` is in the graph. That is expected, not a hang.

## How the TV path works

[`@vitejs/plugin-legacy`](https://github.com/vitejs/vite/tree/main/packages/plugin-legacy)
emits a second, Babel + core-js powered copy of the app as SystemJS modules and
rewrites `index.html` so:

- modern browsers take `<script type="module">` — the fast, untouched ESM bundle
- Chromium 47/53/56 ignore the module scripts and run `<script nomodule>`

There is no user-agent sniffing anywhere.

Vite 8 minifies CSS with **lightningcss**, and `build.cssTarget: 'chrome47'`
makes it downlevel CSS nesting, `inset-inline`, `hsl()` alpha and 8-digit hex
colours. It cannot rescue flexbox `gap`, `svh` units, logical properties or
`var()` — those are source-level rules.

## The target lives in three places

Keep them in sync; changing one alone gives you a bundle that half-works.

| Setting | File | Drives |
| --- | --- | --- |
| `LEGACY_TARGETS = ['chrome >= 47']` | `vite.config.ts` | Babel + core-js |
| `"browserslist": ["chrome >= 47"]` | `package.json` | autoprefixer |
| `build.cssTarget: 'chrome47'` | `vite.config.ts` | lightningcss |

## Constraints to keep in mind

Full detail in [rules.md](./rules.md). The short version:

- **No CSS custom properties** for anything that must render — `var()` is
  Chromium 49+, and lightningcss deletes the literal-then-`var()` fallback at
  build time. Use literals, or gate them behind `@supports`.
- **No flexbox `gap`** (Chromium 84) — use margins.
- **No `svh`/`dvh`** (108), **no logical properties** (87), **no CSS Grid** (57),
  **no `aspect-ratio`** (88), **no `clamp()`** (79), **no `@container`** (105).
- **Style `:focus`**, not `:focus-visible` alone — a TV has no pointer, and the
  `:focus-visible` rule is dropped wholesale below Chromium 86.
- **`npm run check:tv` must pass** before a change is done.

## Project setup

The template provides a minimal React + Vite setup with HMR and some Oxlint
rules.

- [`@vitejs/plugin-react`](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [`@vitejs/plugin-react-swc`](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

### React Compiler

The React Compiler is not enabled on this template because of its impact on dev
& build performance. To add it, see the
[React Compiler installation guide](https://react.dev/learn/react-compiler/installation).

### Expanding the Oxlint configuration

For type-aware lint rules, install `oxlint-tsgolint` and edit `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules).
