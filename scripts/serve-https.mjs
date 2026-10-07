#!/usr/bin/env node
/**
 * HTTPS server for the built player.
 *
 * Mirrors `player-pt/server.ts`: the same domain and the same port, so the TV
 * project and this one are reachable at the same URL.
 *
 *   https://pt-player.mdevoffice.net:3030
 *
 * Why this exists rather than a plain `vite preview`:
 *   - `pt-player.mdevoffice.net` has no public DNS record. It is wired up in the
 *     Windows hosts file as `127.0.0.1`, and the certificate is an mkcert leaf
 *     signed by a CA that is trusted *on this machine only*. So this URL is for
 *     verifying from this PC. A TV resolves DNS itself and does not have the
 *     mkcert CA, so it keeps using the LAN address over HTTP (`npm run serve:tv`).
 *   - The certificate is a leaf for the hostname only, with no IP SAN, so
 *     reaching it by `https://172.16.30.107:3030` would fail certificate
 *     validation even from this machine.
 *
 * Serving goes through Vite's `preview`, which brings `base`, SPA fallback and
 * HTTP Range support (the player streams video) for free.
 *
 * Prerequisites, both checked below:
 *   1. `npm run build` — `dist/` must exist.
 *   2. `npm run cert:generate` — the `.pem` files must exist.
 *
 * Override with `HTTPS_PORT` / `HTTPS_DOMAIN` if the pair ever needs to differ
 * from `player-pt`; the certificate has to match `HTTPS_DOMAIN`.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const DOMAIN = process.env.HTTPS_DOMAIN ?? 'pt-player.mdevoffice.net'
const PORT = Number(process.env.HTTPS_PORT ?? 3030)

const CERT_FILE = join(ROOT, `${DOMAIN}.pem`)
const KEY_FILE = join(ROOT, `${DOMAIN}-key.pem`)
const DIST = join(ROOT, 'dist')

if (!existsSync(DIST)) {
  console.error('[serve:https] dist/ is missing — run `npm run build` first.')
  process.exit(1)
}

if (!existsSync(CERT_FILE) || !existsSync(KEY_FILE)) {
  console.error(
    `[serve:https] no certificate for ${DOMAIN}.\n` +
      `             Run: npm run cert:generate\n` +
      `             (expects ${DOMAIN}.pem and ${DOMAIN}-key.pem next to package.json)`,
  )
  process.exit(1)
}

const server = await preview({
  preview: {
    // 0.0.0.0 as well as the hosts entry: this keeps the server reachable by
    // LAN IP for a quick desktop check, and by hostname via the hosts file.
    host: '0.0.0.0',
    port: PORT,
    strictPort: true,
    https: {
      key: readFileSync(KEY_FILE),
      cert: readFileSync(CERT_FILE),
    },
  },
})

server.printUrls()
console.log('')
console.log(`  Player:  https://${DOMAIN}:${PORT}`)
console.log(
  `  Needs:   a hosts entry for ${DOMAIN} and the mkcert CA trusted on the client.`,
)
console.log(`  TV note: the TVs cannot use this URL — use \`npm run serve:tv\` for those.`)
