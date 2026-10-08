import type { PlayerContent } from '@/types/player-content'
import apiClient from './client'

/**
 * Player provisioning API — `/price-tag/*`.
 *
 * These are separate from the `/player-render/*` endpoints in `./player.ts`:
 * that pair is the Socket.IO-era flow (registration code -> session cookie ->
 * published layout), whereas this pair is the current one — the operator types a
 * code, the server binds it to the screen, and the player polls for what to
 * show.
 *
 * ---------------------------------------------------------------------------
 * STATUS: these routes do not exist on staging yet.
 *
 * Probed 2026-10-07 against `https://pricetag-stag2.mdevoffice.net/api`:
 *
 *   GET  /player-render/content/getPlayerContent  -> 401 application/json  (real route)
 *   GET  /price-tag/getContent/:code              -> 404 text/html         (falls through
 *   POST /price-tag/save-code                     -> 404 text/html          to the Next app)
 *
 * The 404s come back as HTML with `Vary: rsc`, i.e. the web front-end is
 * answering, not an API. So every call below will fail until the backend ships
 * these routes. That failure is surfaced to the operator as an error toast
 * rather than being swallowed — see `hooks/usePlayerContent.ts`.
 * ---------------------------------------------------------------------------
 */

/**
 * Binds a registration code to this screen.
 *
 * Resolves on HTTP 2xx. A body of `{ ok: false }` is treated as a rejection by
 * the caller, so a backend that answers `200 { ok: false }` cannot silently
 * persist a bad code.
 */
export const saveCode = (code: string) =>
  apiClient.post<{ ok?: boolean }>('/price-tag/save-code', { code })

/**
 * The content this screen should be showing, keyed by its registration code.
 *
 * The code is a path parameter, so it is URL-encoded — a code with a slash or a
 * space would otherwise change the route.
 */
export const getContent = (code: string) =>
  apiClient.get<PlayerContent.PlayerContentData>(
    `/price-tag/getContent/${encodeURIComponent(code)}`,
  )
