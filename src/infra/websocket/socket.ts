import { io } from 'socket.io-client'

/**
 * Socket.IO endpoint of the player backend.
 *
 * Inlined at build time from `.env` (`VITE_WS_URL`). It is intentionally the
 * bare origin — socket.io-client appends `path: '/socket.io'` itself.
 */
const WS_URL = import.meta.env.VITE_WS_URL

if (!WS_URL) {
  // Reached when `.env` is missing. Failing quietly here would leave a TV
  // showing "Waiting Registration Code" forever with no clue why.
  console.error(
    '[socket] VITE_WS_URL is not set — copy .env.example to .env.local and restart the build.',
  )
}

/**
 * Shared Socket.IO connection.
 *
 * Module scope on purpose: exactly one connection per screen, created on first
 * import and reused by every hook, so a re-render never opens a second socket.
 *
 * `transports: ['websocket']` skips the HTTP long-polling upgrade dance. That
 * matters on the 2017 TVs: polling keeps several XHRs in flight and the
 * handshake is slower than the engine's default timeout on their hardware.
 * Chromium 47 has a native `WebSocket`, so the fast path is always available.
 *
 * `withCredentials: true` keeps cookies on the handshake — the backend uses
 * them (see `.env`) and dropping them would silently register a second screen.
 */
export const socket = io(WS_URL, {
  transports: ['websocket'],
  path: '/socket.io',
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
  withCredentials: true,
})

export default socket
