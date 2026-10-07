import type { TPlayerContent } from '../../types/player-content'
import apiClient from './client'

/**
 * Exchanges this screen's registration code for a session cookie.
 *
 * Ported from `pt-player/src/hooks/useSocketIo.tsx` (`requestToken`) on top of
 * this repo's `apiClient`. The cookie — not the response body — is the point:
 * it authorises every later call, so this has to happen before
 * `getPlayerContent`.
 *
 * `pt-player` gates at `if (response.ok)`, reading a body field. The body is
 * returned untouched here so the caller can apply the same check once the real
 * payload shape is confirmed against the backend.
 */
export const requestPlayerToken = (code: string, socketId: string | undefined) =>
  apiClient.post<{ ok?: boolean }>('/player-render/auth/requestToken', {
    code,
    socket_id: socketId,
  })

/**
 * The published layout for whichever screen the session cookie belongs to.
 *
 * Ported from `pt-player/src/infra/api/player.ts`. The endpoint takes no
 * parameters — the screen is identified by the cookie, which is why
 * `requestPlayerToken` has to succeed first.
 */
export const getPlayerContent = () =>
  apiClient.get<TPlayerContent>('/player-render/content/getPlayerContent')
