/**
 * DEV TOOL — a stand-in for the `/price-tag/*` API, which is not deployed yet.
 *
 * This is NOT a fallback baked into the app: nothing in `src/` knows it exists.
 * It is an external server you point the build at while the real routes are
 * missing, so the flow can be exercised on a real TV today.
 *
 *   POST /api/price-tag/save-code          -> { ok: true }
 *   GET  /api/price-tag/getContent/:code   -> the payload from constants/dummy.ts
 *   GET  /__variant?v=2                    -> switch the payload, to prove the
 *                                             30s poll replaces changed content
 *
 * Usage (see documentation.md §18):
 *
 *   node scripts/mock-api.mjs                 # terminal 1
 *   printf 'VITE_API_URL=http://127.0.0.1:4180/api\n' > .env.local
 *   npm run build && npm run serve:tv         # terminal 2
 *   # open the screen on the TV, Insert Code, Submit
 *
 * Remember to delete `.env.local` and rebuild when you are done, or the build
 * will keep pointing at the mock.
 */
import { createServer } from 'node:http'

const { dummyData } = await import(
  new URL('../src/constants/dummy.ts', import.meta.url).href
)

const PORT = Number(process.env.MOCK_PORT ?? 4180)
let variant = 1

/** Deep-clone, so each request returns a fresh object as a real API would. */
function payload() {
  const copy = JSON.parse(JSON.stringify(dummyData))
  copy.displayItems.mappingItems[0].item_name =
    variant === 1 ? 'Matoa KG' : 'VARIANT TWO ITEM'
  return copy
}

function applyCors(res, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin || '*')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  // Chrome's Private Network Access preflight: a page on the LAN calling
  // 127.0.0.1 is a downgrade and is blocked without this.
  res.setHeader('Access-Control-Allow-Private-Network', 'true')
}

const json = (res, status, body) =>
  res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body))

const server = createServer((req, res) => {
  applyCors(res, req.headers.origin)

  const url = new URL(req.url, 'http://localhost')
  const stamp = new Date().toISOString().slice(11, 19)
  console.log(`[${stamp}] ${req.method} ${url.pathname}${url.search}`)

  if (req.method === 'OPTIONS') return res.writeHead(204).end()

  if (url.pathname === '/__variant') {
    variant = Number(url.searchParams.get('v')) || 1
    console.log(`        -> variant is now ${variant}`)
    return json(res, 200, { variant })
  }

  if (req.method === 'POST' && url.pathname === '/api/price-tag/save-code') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      console.log(`        -> body ${body}`)
      json(res, 200, { ok: true })
    })
    return
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/price-tag/getContent/')) {
    const code = decodeURIComponent(url.pathname.split('/').pop())
    console.log(`        -> code ${code}, variant ${variant}`)
    return json(res, 200, payload())
  }

  json(res, 404, { error: 'no such route' })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`mock /price-tag API on http://127.0.0.1:${PORT}`)
  console.log('point VITE_API_URL at it, then rebuild — see the file header.')
})
