#!/usr/bin/env node
/**
 * Legacy-bundle verifier.
 *
 * `check:tv` (scripts/check-tv-compat.mjs) guards the *source*. This script
 * guards what actually ships: it parses `dist/**\/*legacy*.js` — the copy the
 * 2017 TVs download — and fails if any construct survives that Chromium 47
 * cannot execute.
 *
 * That second guard matters because third-party dependencies are transpiled by
 * the same Babel pass, and a single un-transpiled `?.` anywhere in a 190 kB
 * bundle is a hard SyntaxError on the TV, not a degraded render.
 *
 * Run after `npm run build`:
 *   npm run check:bundle
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@babel/parser'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS = join(ROOT, 'dist', 'assets')

/** Node types that must not appear in a bundle destined for Chromium 47. */
const BANNED = {
  AwaitExpression: 'async/await (Chromium 55+)',
  OptionalMemberExpression: 'optional chaining `?.` (Chromium 80+)',
  OptionalCallExpression: 'optional call `?.()` (Chromium 80+)',
  BigIntLiteral: 'BigInt literal (Chromium 67+)',
  ImportExpression: 'dynamic `import()` (Chromium 63+)',
  ImportMeta: '`import.meta` (Chromium 64+)',
  ClassPrivateProperty: 'private class field (Chromium 74+)',
  ClassPrivateMethod: 'private class method (Chromium 84+)',
  ClassProperty: 'class field (Chromium 72+)',
  StaticBlock: 'class static block (Chromium 94+)',
}

const SKIP_KEYS = new Set(['loc', 'start', 'end', 'range', 'extra', 'leadingComments', 'trailingComments', 'innerComments'])

function walk(node, visit) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit)
    return
  }
  if (typeof node.type === 'string') visit(node)
  for (const key of Object.keys(node)) {
    if (SKIP_KEYS.has(key)) continue
    walk(node[key], visit)
  }
}

function inspect(file) {
  const code = readFileSync(file, 'utf8')
  let ast
  try {
    ast = parse(code, { sourceType: 'script' })
  } catch (error) {
    return [{ message: `does not parse as a classic script: ${error.message}`, line: 1 }]
  }

  const found = new Map()
  walk(ast, (node) => {
    const banned = BANNED[node.type]
    if (banned && !found.has(banned)) found.set(banned, node.loc?.start.line ?? 1)

    // `??` and object spread are ordinary node shapes, so they are checked by
    // shape rather than by type.
    if (node.type === 'LogicalExpression' && node.operator === '??' && !found.has('nullish `??` (Chromium 80+)')) {
      found.set('nullish `??` (Chromium 80+)', node.loc?.start.line ?? 1)
    }
    if (node.type === 'ObjectExpression' && node.properties?.some((p) => p?.type === 'SpreadElement') && !found.has('object spread (Chromium 60+)')) {
      found.set('object spread (Chromium 60+)', node.loc?.start.line ?? 1)
    }
    if (node.type === 'ForOfStatement' && node.await && !found.has('`for await` (Chromium 63+)')) {
      found.set('`for await` (Chromium 63+)', node.loc?.start.line ?? 1)
    }
    if (node.type === 'RegExpLiteral' && /\(\?</.test(node.pattern ?? '') && !found.has('RegExp lookbehind / named group (Chromium 62+/64+)')) {
      found.set('RegExp lookbehind / named group (Chromium 62+/64+)', node.loc?.start.line ?? 1)
    }
  })

  return [...found].map(([message, line]) => ({ message, line }))
}

function main() {
  if (!existsSync(ASSETS)) {
    console.error('check:bundle — dist/assets not found. Run `npm run build` first.')
    process.exit(1)
  }

  const files = readdirSync(ASSETS).filter((name) => /legacy.*\.js$/.test(name))
  if (!files.length) {
    console.error('check:bundle — no *legacy*.js in dist/assets. Did plugin-legacy run?')
    process.exit(1)
  }

  let failed = 0
  for (const name of files) {
    const file = join(ASSETS, name)
    const findings = inspect(file)
    const size = (readFileSync(file).length / 1024).toFixed(1)
    if (findings.length) {
      failed++
      console.log(`${relative(ROOT, file).replace(/\\/g, '/')}  (${size} kB)`)
      for (const { message, line } of findings) console.log(`  error  line ${line}: ${message}`)
    } else {
      console.log(`${relative(ROOT, file).replace(/\\/g, '/')}  (${size} kB)  OK — no post-ES2015 syntax`)
    }
  }

  console.log('')
  console.log(`check:bundle — ${failed ? `${failed} file(s) UNSAFE on Chromium 47` : 'legacy bundles are Chromium 47 safe.'}`)
  process.exit(failed ? 1 : 0)
}

main()
