# rules.md — browser-support rules for pricetag-player-vite

These are the **normative rules** that keep this player running on all three
required targets. Treat them as a contract, not advice. Anything that violates
a **MUST NOT** is a bug, even if it works perfectly on your machine.

> Enforcement: `npm run check:tv` (see [§7](#7-enforcement)). It is the fastest
> way to catch a violation, but it is a guardrail, not a proof — the build
> output still has to be eyeballed for the cases in [§6](#6-traps-that-no-tool-catches).

---

## 1. Supported targets

| Target | Platform / OS | Rendering engine | Status |
| --- | --- | --- | --- |
| Chrome **56+** | Desktop Chrome | Chromium 56+ | Required |
| Samsung TV **2017** | Tizen **3.0** | **Chromium 47** (worst case¹) | Required |
| LG TV **2017** | webOS **3.5** | **Chromium 53** | Required |

¹ Samsung's published engine version for Tizen 3.0 is reported inconsistently as
Chromium 47 or 56 depending on firmware, model and region. **We assume 47**, so
the project keeps working either way. That assumption is what makes the
"effectively the floor is Chromium 47" rule below non-negotiable.

### The operative rule

> **MUST:** Treat **Chromium 47** as the single compatibility floor for every
> decision in this repository. Chrome 56 is a *subset* of Chromium 47 support —
> if it works on 47 it works on 53 and 56, so there is never a reason to
> optimise "for 56" specifically at the cost of 47.

Also relevant:

- Both TVs' browsers are **Blink/V8**, the same engine family as Chrome. There is
  no Safari/WebKit branch to support.
- TVs are **1080p, D-pad driven, no mouse, no touch, no hover, no keyboard**.
  This makes focus styling a hard requirement, not a nicety — see
  [§4.2](#42-focus-styling-is-a-requirement-not-a-nicety).
- TVs frequently cannot reach the public internet. Do not depend on CDNs at
  runtime.

---

## 2. Where the target is configured

The target lives in **three** places. They MUST stay in sync — changing one and
not the others gives you a bundle that half-works.

| Setting | File | What it drives |
| --- | --- | --- |
| `LEGACY_TARGETS = ['chrome >= 47']` | `vite.config.ts` | Babel + core-js for the `<script nomodule>` bundle |
| `"browserslist": ["chrome >= 47"]` | `package.json` | autoprefixer (PostCSS) |
| `cssTarget: 'chrome47'` | `vite.config.ts` | lightningcss lowering + minification |

> **MUST:** change all three together, and re-run `npm run check:tv` plus
> `npm run build` afterwards.

### Raising the floor

Raising the floor (e.g. dropping 2017 TVs) is allowed and lowers bundle size.
Lowering it below 47 is **not** supported here — Chromium 47 is the point at
which `var()`, `<script nomodule>` handling and core-js's remaining coverage
still line up. Below that, hand-written fallbacks are required.

---

## 3. JavaScript rules

Babel (`@vitejs/plugin-legacy`) transpiles and polyfills a great deal, so most
modern **syntax** is fine: `const`/`let`, arrow functions, template literals,
classes, `for...of`, destructuring, spread, `async`/`await`, optional chaining
(`?.`), nullish coalescing (`??`), dynamic `import()`. All of that is
downlevelled for the legacy bundle.

What Babel **cannot** save you from:

| MUST NOT use | Why | Do this instead |
| --- | --- | --- |
| Top-level `await` | ESM-only; Chromium 89+; not transpilable | Wrap in an `async function` and call it |
| `for await...of` | Chromium 63+ | `Promise.all` over an array |
| BigInt literals (`10n`) | Chromium 67+; `preset-env` does not transpile them | `Number`, or a string + a helper |
| RegExp lookbehind `(?<=` / `(?<!` | Chromium 62+; regex syntax is never transpiled | Restructure the pattern |
| RegExp named groups `(?<name>…)` | Chromium 64+ | Numbered groups |
| RegExp Unicode property escapes `\p{…}` | Chromium 64+ | Explicit character classes |
| `structuredClone()` | Chromium 98+ | `JSON.parse(JSON.stringify(x))` for plain data |
| `Object.hasOwn()` | Chromium 93+ | `Object.prototype.hasOwnProperty.call(x, k)` |
| `Array#at()` | Chromium 92+ | `arr[arr.length - 1]` |
| `Array#flat()` / `#flatMap()` | Chromium 69+ | Loops / `reduce` |
| `String#replaceAll()` | Chromium 85+ | `.split(x).join(y)` or a `/g` regex |
| `Promise.allSettled` / `Promise.any` | Chromium 76 / 85+ | `Promise.all` + a `catch` per item |
| `globalThis` | Chromium 71+ | `window` |
| `WeakRef` / `FinalizationRegistry` | Chromium 84+ | Plain references |

### Web APIs

Babel's polyfills are **usage-based and only cover what it can see statically**.
A DOM API that Chromium 47 lacks will not be detected just because a dependency
calls it. If you need one, register it explicitly in `vite.config.ts`:

```ts
legacy({
  targets: LEGACY_TARGETS,
  additionalLegacyPolyfills: ['resize-observer-polyfill'],
})
```

| API | Engine | Note |
| --- | --- | --- |
| `IntersectionObserver` | Chromium 51 | **Must** be polyfilled for the TVs |
| `ResizeObserver` | Chromium 64 | **Must** be polyfilled for the TVs |
| `AbortController` | Chromium 66 | Polyfill if used |
| `queueMicrotask` | Chromium 71 | Usually covered by core-js — verify in `dist/` |
| `Element.animate()` / `getAnimations()` | Chromium 36 / 84 | Prefer CSS transitions; avoid `getAnimations` |
| Fullscreen API (unprefixed) | Chromium 71 | Use the `webkit`-prefixed fallback — see [§6.7](#6-traps-that-no-tool-catches) |
| `screen.orientation` | Chromium 38 | Optional on TV firmware — guard with `?.` |

`fetch`, `Promise`, `Symbol`, `Map`/`Set`, `URL`/`URLSearchParams`, `WebSocket`,
`requestAnimationFrame`, `matchMedia`, `classList`, `CustomEvent` are all safe on
Chromium 47. `localStorage` exists but **may throw** — always wrap it
([§6.8](#6-traps-that-no-tool-catches)).

> **MUST NOT** rely on a runtime-loaded `<script>` to bring in a polyfill. The
> legacy bundle is loaded *as* the app; there is no "later" to patch it.

---

## 4. CSS rules

Vite 8 minifies CSS with **lightningcss**, and `cssTarget: 'chrome47'` makes it
downlevel CSS nesting, `inset-inline`, `hsl()` alpha and 8-digit hex colours for
you. It does **not** rescue the following — these MUST be avoided in source.

| MUST NOT use | Engine | Do this instead |
| --- | --- | --- |
| `var(--x)` for anything that must render | Chromium 49 | Literal values (see [§4.1](#41-css-custom-properties-are-off-limits)) |
| `gap` / `row-gap` / `column-gap` on flex containers | Chromium 84 | Margins (`> * + * { margin-top: … }`) or `li + li { margin-left: … }` |
| `svh` / `lvh` / `dvh` / `svw` / … | Chromium 108 | `vh` / `vw` |
| `border-inline*`, `margin-inline*`, `padding-inline*`, `inline-size`, `inset-inline` | Chromium 87 | Physical `left` / `right` / `top` / `bottom`, `border-left`, `width`, `height` |
| `display: grid` | Chromium 57 | Flexbox |
| `aspect-ratio` | Chromium 88 | Padding-top percentage box |
| `clamp()` / `min()` / `max()` | Chromium 79 | Fixed values + media queries |
| `@container` / `container-type` | Chromium 105 | Media queries |
| `:focus-visible` **on its own** | Chromium 86 | Style `:focus` (see [§4.2](#42-focus-styling-is-a-requirement-not-a-nicety)) |
| `:has()` | Chromium 105 | A class toggled from JS |

Safe on Chromium 47: flexbox (unprefixed), `calc()`, `transition`, `transform`
(including `perspective()`), `box-shadow`, `border-radius`, media queries,
`@supports`, pseudo-elements, `::before`/`::after`, `inline-flex`,
`position: absolute/relative/fixed`.

### 4.1 CSS custom properties are off limits

Two separate reasons, both fatal:

1. `var()` is **Chromium 49+**. On a Chromium 47 Samsung panel the entire
   declaration is discarded and the element renders unstyled.
2. The usual rescue — literal first, `var()` second — **does not survive the
   build**. lightningcss folds the pair together and keeps only the `var()`:

   ```css
   /* source */
   .counter { color: #aa3bff; color: var(--accent); }

   /* dist — the fallback is gone */
   .counter { color: var(--accent); }
   ```

**MUST:** use literal values for anything that has to render on a TV.

If you genuinely need authoring-time tokens, you have three options, in order of
preference:

1. **Preprocessor** (Sass/Less) — variables compile to literals, nothing reaches
   the browser as `var()`. This is the cleanest answer.
2. **`@supports` gate** — the only `var()` structure that survives lightningcss.
   Verified:

   ```css
   .counter { color: #aa3bff; }              /* every engine, incl. Chromium 47 */
   @supports (color: var(--x)) {
     .counter { color: var(--accent); }      /* Chromium 49+ only */
   }
   ```

3. **Accept the breakage** — and then also raise the floor to Chromium 49 in all
   three places from [§2](#2-where-the-target-is-configured).

### 4.2 Focus styling is a requirement, not a nicety

There is no mouse on a TV. The viewer navigates with the D-pad and **must** be
able to see what is selected.

```css
/* MUST: works on every engine */
.card:focus {
  outline: 2px solid #aa3bff;
  outline-offset: 2px;
}

/* MAY: modern-only refinement. Chromium 47/53 drop this rule entirely,
   which is exactly the desired outcome — the :focus ring above stays. */
.card:focus:not(:focus-visible) {
  outline: none;
}
```

> **MUST NOT** use `:focus-visible` as the *only* focus style. The whole rule is
> dropped on the TVs, leaving the user with no visible selection.

Never set `outline: none` without an equally visible replacement.

### 4.3 CSS nesting

Vite lowers nesting, so it works — but this project writes **flat** CSS anyway.
Rationale: the source stays readable, and the result does not depend on which
minifier is active. Nesting also hides specificity mistakes that are painful to
debug on a TV where you have no devtools.

---

## 5. HTML, assets and packaging rules

| Rule | Why |
| --- | --- |
| **MUST:** serve over `http`/`https`, never `file://` | Chrome blocks local `file://` fetches; `<script nomodule>` and the external SVG sprite will not load |
| **MUST:** send `Content-Type: image/svg+xml` for `.svg` | A wrong MIME type breaks the sprite |
| **MUST:** keep `favicon.svg` / `icons.svg` same-origin | Cross-origin `<use>` needs CORS |
| **MUST:** pair `href` with `xlinkHref` on SVG `<use>` | Bare `href` is SVG2 (Chromium 50+); the TVs need `xlink:href` |
| **SHOULD:** inline critical SVG sprites into the document | External `<use>` is the most common TV rendering failure |
| **MUST NOT:** depend on remote fonts, CDNs, or analytics at runtime | TV browsers are frequently offline and the UA is spoofed |
| **MUST NOT:** assume a viewport smaller than 1920×1080 | TV panels are 1080p; test the `> 1024px` branch |
| **MUST NOT:** commit TLS private keys or certificates (`*.pem`, `*.key`) | `.gitignore` covers them; `npm run cert:generate` recreates the dev pair anywhere |
| **MUST NOT:** treat `serve:https` as a TV-testable URL | The dev domain resolves only via this machine's hosts file, and the TVs do not trust the mkcert CA |

Absolute asset URLs (`/assets/…`) are the Vite default and work when the app is
served from a domain root. If the player is packaged under a sub-path, set
`base: './'` in `vite.config.ts` **and** re-verify the sprite references.

---

## 6. Traps that no tool catches

These are real, verified behaviours of this toolchain. Re-check them after any
dependency upgrade.

1. **lightningcss deletes fallback declarations.** Covered in
   [§4.1](#41-css-custom-properties-are-off-limits). Re-verify by grepping
   `dist/assets/*.css` after a build.
2. **`async`/`await` is only transpiled because the target is 47.** With the old
   `chrome >= 56` target, Babel leaves `async function` untouched, which is a
   hard `SyntaxError` on Chromium 53 and 47. If anyone raises the target back to
   56, every `await` in the codebase becomes a TV-breaking bug.
3. **TypeScript will not warn you.** `tsconfig.app.json` uses
   `lib: ["ES2023", "DOM"]`, so `Object.hasOwn`, `Array#at` and friends
   type-check happily. The type system is not a compatibility check.
4. **Regex syntax is never transpiled.** A lookbehind that type-checks fine will
   still throw at parse time on a TV.
5. **Polyfills are static-analysis driven.** A built-in reached through a
   computed property or a dynamically imported module may not be polyfilled.
6. **`:focus-visible` silently removes focus styles.** See
   [§4.2](#42-focus-styling-is-a-requirement-not-a-nicety).
7. **The Fullscreen API needs the `webkit` prefix.** `requestFullscreen`,
   `document.fullscreenElement`, `exitFullscreen` and the `fullscreenchange`
   event only exist from Chromium 71. The TVs expose
   `webkitRequestFullscreen` / `webkitFullscreenElement` / `webkitExitFullscreen`
   / `webkitfullscreenchange` instead. Calling the unprefixed form throws
   "not a function" and kills the handler. Always go through a helper — see
   `src/hooks/useFullscreen.ts`.
8. **`localStorage` can throw.** Desktop Chrome almost never does, but TV
   firmware and private-mode engines do, and an uncaught throw during render
   blanks the screen. Always wrap it — see `src/utils/storage.ts`.
9. **Third-party libraries pull in older-browser landmines.** `socket.io-client`
   is safe here, but only because Vite resolves its `browser` field: the
   Node variant of `globals.node.js` exports `global` and would need the
   `globalThis` polyfill (Chromium 71+). After adding or upgrading a dependency,
   re-run the AST check in [§7](#verifying-a-build) — it is the only thing that
   proves the shipping bundle is clean.
10. **`screen.orientation` is optional.** The API is Chromium 38+, but some TV
    engines omit it entirely. Reading `screen.orientation.type` unguarded throws
    inside the socket connect handler. Use `?.` with a fallback.

---

## 7. Enforcement

```sh
npm run check:tv      # static guard: banned syntax, APIs, CSS features
npm run lint          # oxlint
npm run build         # tsc -b && vite build
npm run check:bundle  # verifies dist/: parses the shipped legacy bundle
npm run preview       # serve dist/ — the only way to test the TV path
```

`check:tv` reports two severities:

- **error** — guaranteed breakage on a 2017 TV. The command exits non-zero.
- **warn** — works, but only because something else carries it. Read it.

Suppress a finding you have consciously accepted by adding `tv-compat-allow` to
the same line or the line above it, together with the reason:

```css
/* tv-compat-allow: dark mode is desktop-only decoration. */
@media (prefers-color-scheme: dark) { … }
```

### Verifying a build

`check:tv` reads the source; `check:bundle` reads the artefact. Both are needed:
a dependency can ship untranspiled syntax that no source rule could ever see.

```sh
npm run build
npm run check:bundle  # parses dist/*legacy*.js and fails on any post-ES2015 syntax
grep -o 'gap:[^;}]*'   dist/assets/*.css               # expect no output
grep -oE '[0-9]+(svh|dvh|lvh)' dist/assets/*.css       # expect no output
grep -o 'var(--' dist/assets/*.css | wc -l             # expect 0 unless @supports-gated
grep -c 'globalThis' dist/assets/index-legacy-*.js     # expect 0 (must resolve to the shim)
```

### Definition of done

A change is only finished when **all** of these hold:

- [ ] `npm run check:tv` → 0 errors
- [ ] `npm run lint` → clean
- [ ] `npm run build` → succeeds
- [ ] `npm run check:bundle` → legacy bundles reported safe
- [ ] the CSS greps above return the expected results
- [ ] the change was exercised through `npm run preview`, not `npm run dev`
- [ ] anything user-visible was re-checked for D-pad focus

---

## 8. Quick reference

| ✅ Use | ❌ Avoid |
| --- | --- |
| literal colours | `var(--token)` |
| `margin-top` / `li + li { margin-left }` | flex `gap` |
| `100vh` | `100svh` / `100dvh` |
| `border-left`, `left`/`right` | `border-inline`, `inset-inline` |
| flexbox | CSS Grid |
| `:focus` (+ `:not(:focus-visible)` refinement) | `:focus-visible` alone |
| `@media` queries | `@container` queries |
| `async function` wrappers | top-level `await` |
| `arr[arr.length - 1]` | `arr.at(-1)` |
| `window` | `globalThis` |
| `http(s)://` serving | `file://` |
| `href` + `xlinkHref` on `<use>` | bare `href` on `<use>` |
