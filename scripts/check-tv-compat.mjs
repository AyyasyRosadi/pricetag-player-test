#!/usr/bin/env node
/**
 * Smart-TV compatibility guard.
 *
 * The player must run on the 2017 TV browsers, which are older than the
 * "Chrome 56+" desktop requirement:
 *
 *   LG webOS TV 3.5      (2017) -> Chromium 53
 *   Samsung Tizen TV 3.0 (2017) -> Chromium 47  (worst case)
 *
 * Babel (via @vitejs/plugin-legacy) and lightningcss (via `build.cssTarget`)
 * already fix a lot at build time. This script covers the remainder: syntax and
 * APIs that NO build step can rescue, so they have to be caught while editing.
 *
 *   errors -> guaranteed breakage on a 2017 TV, the run fails
 *   warns  -> works, but only because something else carries it; please verify
 *
 * Suppress a finding you have deliberately accepted by putting
 * `tv-compat-allow` in the same line or the line above.
 *
 * Usage: npm run check:tv
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Syntax / built-ins that Babel cannot transpile or that core-js will not see. */
const JS_RULES = [
  { re: /\(\?<=|\(\?<!/, msg: 'RegExp lookbehind is Chromium 62+ and regex syntax cannot be transpiled.' },
  { re: /\(\?<[A-Za-z_$]/, msg: 'RegExp named capture groups are Chromium 64+ and cannot be transpiled.' },
  { re: /\\[pP]\{/, msg: 'RegExp Unicode property escapes are Chromium 64+.' },
  { re: /\b\d+n\b/, msg: 'BigInt literals are Chromium 67+ and preset-env does not transpile them.' },
  { re: /\bfor\s+await\b/, msg: '`for await...of` is Chromium 63+ and cannot be transpiled.' },
  { re: /^await\s/m, msg: 'Top-level await is Chromium 89+ and cannot be transpiled.' },
  { re: /\bstructuredClone\s*\(/, msg: 'structuredClone is Chromium 98+. Hand-roll a deep clone or use JSON.' },
  { re: /\bObject\.hasOwn\b/, msg: 'Object.hasOwn is Chromium 93+. Use Object.prototype.hasOwnProperty.call().' },
  { re: /\.replaceAll\s*\(/, msg: 'String#replaceAll is Chromium 85+. Use .split(x).join(y) or a /g regex.' },
  { re: /\.flatMap\s*\(|\.flat\s*\(/, msg: 'Array#flat/flatMap are Chromium 69+.' },
  { re: /\.at\s*\(\s*-?\d/, msg: 'Array#at is Chromium 92+. Use arr[arr.length - 1].' },
  { re: /\bPromise\.(allSettled|any)\b/, msg: 'Promise.allSettled/any are Chromium 76/85+.' },
  { re: /\bglobalThis\b/, msg: 'globalThis is Chromium 71+. Use `window` in this app.' },
  { re: /\bWeakRef\b|\bFinalizationRegistry\b/, msg: 'WeakRef/FinalizationRegistry are Chromium 84+.' },
]

/** Web APIs missing on the TVs; these need `additionalLegacyPolyfills`. */
const JS_WARN_RULES = [
  { re: /\bResizeObserver\b/, msg: 'ResizeObserver is Chromium 64+. Add a polyfill to `additionalLegacyPolyfills` in vite.config.ts.' },
  { re: /\bIntersectionObserver\b/, msg: 'IntersectionObserver is Chromium 51+. Add a polyfill to `additionalLegacyPolyfills`.' },
  { re: /\bAbortController\b|\bAbortSignal\b/, msg: 'AbortController is Chromium 66+. Add a polyfill if you rely on it.' },
  { re: /\bqueueMicrotask\b/, msg: 'queueMicrotask is Chromium 71+. core-js usually covers it — confirm in dist/.' },
  { re: /\.getAnimations\s*\(|\bAnimation\b/, msg: 'The fuller Web Animations API (getAnimations, Animation objects) is Chromium 84+. Element.animate() alone is older, but prefer CSS transitions on the TVs.' },
  { re: /\brequestIdleCallback\b/, msg: 'requestIdleCallback is Chromium 47+ (borderline). Prefer requestAnimationFrame.' },
]

/** CSS that lightningcss cannot lower for Chromium 47. */
const CSS_RULES = [
  { re: /\b\d*\.?\d+(svh|svw|lvh|lvw|dvh|dvw|svmin|svmax|lvmin|lvmax|dvmin|dvmax)\b/, msg: 'Small/large/dynamic viewport units are Chromium 108+. Use vh/vw.' },
  { re: /aspect-ratio\s*:/, msg: 'aspect-ratio is Chromium 88+ and cannot be lowered. Use the padding-bottom percentage trick.' },
  { re: /\bdisplay\s*:\s*(inline-)?grid\b/, msg: 'CSS Grid needs Chromium 57+. The TVs only have flexbox.' },
  { re: /\b(clamp|min|max)\s*\(/, msg: 'CSS min()/max()/clamp() are Chromium 79+. Use fixed values plus media queries.' },
  { re: /@container|\bcontainer-type\s*:|\bcontainer-name\s*:/, msg: 'Container queries are Chromium 105+. Use media queries.' },
  { re: /\bgap\s*:|\b(row-gap|column-gap)\s*:/, msg: 'flexbox `gap` is Chromium 84+ (grid `gap` is 57+). Replace with margins.' },
  { re: /:focus-visible/, msg: ':focus-visible is Chromium 86+ and the whole rule is dropped on the TVs. Style :focus instead.' },
  { re: /:has\s*\(/, msg: ':has() is Chromium 105+.' },
]

/** CSS that degrades instead of breaking — worth a look, not a failure. */
const CSS_WARN_RULES = [
  { re: /:(is|where)\s*\(/, msg: ':is()/:where() are Chromium 88+. lightningcss usually lowers them — verify dist/.' },
  { re: /\bposition\s*:\s*sticky\b/, msg: 'position: sticky is Chromium 56+; the 2017 TVs (47/53) ignore it.' },
  { re: /\b(border|margin|padding)-(inline|block)\b|\b(inset-inline|inset-block|inline-size|block-size)\s*:/, msg: 'Logical properties are Chromium 87+. lightningcss lowers `inset-inline` but not `border-inline` — prefer left/right/top/bottom.' },
  { re: /\bbackdrop-filter\s*:|accent-color\s*:/, msg: 'backdrop-filter (76+) / accent-color (93+) are unsupported. Treat them as decoration only.' },
  { re: /\bprefers-color-scheme\b|\bcolor-scheme\s*:/, msg: 'Chromium 76/81+. Harmless — the TVs simply stay in the light theme, so make sure light mode stands alone.' },
  { re: /#[0-9a-fA-F]{8}\b|\bhsla?\([^)]*\/[^)]*\)/, msg: '4/8-digit hex and slash-alpha hsl() need Chromium 62/65. lightningcss lowers them — verify dist/.' },
  { re: /:focus-within/, msg: ':focus-within is Chromium 60+.' },
  { re: /\benv\s*\(\s*safe-area-inset/, msg: 'env(safe-area-inset-*) is Chromium 69+.' },
]

const CSS_DECL_RE = /([-a-zA-Z][\w-]*)\s*:\s*([^;{}]*)/g

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

/**
 * Blank out comments while keeping every other character (and every newline) in
 * place, so byte offsets and line numbers stay valid. Without this, prose that
 * merely *mentions* a banned feature would be reported.
 */
function stripComments(source, kind) {
  const chunks = []
  let plain = ''
  const flush = () => {
    if (plain) chunks.push(plain)
    plain = ''
  }
  const hide = (from, to) => {
    flush()
    let masked = ''
    for (let i = from; i < to; i++) masked += source[i] === '\n' ? '\n' : ' '
    chunks.push(masked)
  }

  let i = 0
  while (i < source.length) {
    if (kind === 'html' && source.startsWith('<!--', i)) {
      const end = source.indexOf('-->', i + 4)
      const stop = end === -1 ? source.length : end + 3
      hide(i, stop)
      i = stop
      continue
    }
    if (source.startsWith('/*', i)) {
      const end = source.indexOf('*/', i + 2)
      const stop = end === -1 ? source.length : end + 2
      hide(i, stop)
      i = stop
      continue
    }
    // `//` starts a line comment in JS, but `://` inside a URL must survive.
    if (kind !== 'html' && source[i] === '/' && source[i + 1] === '/' && source[i - 1] !== ':') {
      const end = source.indexOf('\n', i)
      const stop = end === -1 ? source.length : end
      hide(i, stop)
      i = stop
      continue
    }
    plain += source[i]
    i++
  }
  flush()
  return chunks.join('')
}

function lineOf(source, index) {
  let line = 1
  for (let i = 0; i < index; i++) if (source.charCodeAt(i) === 10) line++
  return line
}

function isAllowed(lines, line) {
  return (
    (lines[line - 1] || '').includes('tv-compat-allow') ||
    (lines[line - 2] || '').includes('tv-compat-allow')
  )
}

function scanRules(raw, scannable, rules, level, file, findings) {
  const lines = raw.split('\n')
  for (const { re, msg } of rules) {
    const flags = re.flags.includes('g') ? re.flags : re.flags + 'g'
    for (const m of scannable.matchAll(new RegExp(re.source, flags))) {
      const line = lineOf(scannable, m.index)
      if (isAllowed(lines, line)) continue
      findings.push({
        file,
        line,
        level,
        msg,
        text: (lines[line - 1] || '').trim(),
      })
    }
  }
}

/**
 * Chrome < 49 — and therefore the Chromium 47 Samsung engine — throws the whole
 * `var()` declaration away. The usual rescue is a literal value first:
 *
 *   color: #6b6375;
 *   color: var(--text);
 *
 * ...but lightningcss (Vite 8's CSS minifier) folds that pair down to the
 * `var()` declaration alone, deleting the fallback. So this check is only a
 * first line of defence: for TV-critical properties use a literal or an
 * `@supports (color: var(--x)) { ... }` gate, which does survive the build.
 */
function scanVarFallbacks(raw, scannable, file, findings) {
  const lines = raw.split('\n')
  let offset = 0
  // Splitting on `}` resets the "already declared literally" memory per block.
  for (const segment of scannable.split('}')) {
    const seen = new Set()
    for (const m of segment.matchAll(CSS_DECL_RE)) {
      const [, prop, value] = m
      if (prop.startsWith('--')) continue
      if (value.includes('var(')) {
        if (!seen.has(prop)) {
          const line = lineOf(scannable, offset + m.index)
          if (!isAllowed(lines, line)) {
            findings.push({
              file,
              line,
              level: 'error',
              msg: `\`${prop}\` uses var() with no literal fallback above it in the same block. Chromium 47 (< 49) discards the whole declaration. Add \`${prop}: <literal value>;\` first — but note that lightningcss FOLDS that pair back into a single var() declaration, so anything that must render on the TVs needs a literal or an @supports gate.`,
              text: (lines[line - 1] || '').trim(),
            })
          }
        }
      } else {
        seen.add(prop)
      }
    }
    offset += segment.length + 1
  }
}

/** Bare `href` on <use> is SVG2 (Chromium 50+); the TVs need xlink:href too. */
function scanSvgUse(raw, scannable, file, findings) {
  const uses = (scannable.match(/<use\b/g) || []).length
  const xlink = (scannable.match(/xlinkHref=/g) || []).length
  if (uses > xlink) {
    const line = lineOf(scannable, scannable.indexOf('<use'))
    findings.push({
      file,
      line,
      level: 'warn',
      msg: `${uses - xlink} <use> without \`xlinkHref\`. Add the \`xlink:href\` twin so the 2017 TVs can resolve the sprite.`,
      text: '<use>',
    })
  }
}

function main() {
  const findings = []
  const files = [...walk(join(ROOT, 'src')), join(ROOT, 'index.html')]

  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, '/')
    const raw = readFileSync(file, 'utf8')
    const ext = extname(file)

    if (ext === '.css') {
      const scannable = stripComments(raw, 'css')
      scanRules(raw, scannable, CSS_RULES, 'error', rel, findings)
      scanRules(raw, scannable, CSS_WARN_RULES, 'warn', rel, findings)
      scanVarFallbacks(raw, scannable, rel, findings)
    } else if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.mjs') {
      const scannable = stripComments(raw, 'js')
      scanRules(raw, scannable, JS_RULES, 'error', rel, findings)
      scanRules(raw, scannable, JS_WARN_RULES, 'warn', rel, findings)
      scanSvgUse(raw, scannable, rel, findings)
    } else if (ext === '.html') {
      const scannable = stripComments(raw, 'html')
      scanRules(raw, scannable, CSS_RULES, 'error', rel, findings)
      scanSvgUse(raw, scannable, rel, findings)
    }
  }

  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)

  const errors = findings.filter((f) => f.level === 'error')
  const warns = findings.filter((f) => f.level === 'warn')

  for (const f of [...errors, ...warns]) {
    console.log(`${f.file}:${f.line}  ${f.level === 'error' ? 'error' : ' warn'}  ${f.msg}`)
    if (f.text) console.log(`         > ${f.text}`)
  }
  if (findings.length) console.log('')

  console.log(`check:tv — ${errors.length} error(s), ${warns.length} warning(s) across ${files.length} file(s).`)
  console.log('Targets: Chrome 56+ desktop / LG webOS 3.5 = Chromium 53 / Samsung Tizen 3.0 = Chromium 47.')

  process.exit(errors.length ? 1 : 0)
}

main()
