import type { PlayerContent } from '@/types/player-content'
import apiClient from './client'

/**
 * Player REST API — ported from `pt-player/src/infra/api/player.ts` plus the
 * `requestToken` callback from `pt-player/src/hooks/useSocketIo.tsx`.
 *
 * All three calls are cookie-authorised. `requestPlayerToken` is what issues the
 * cookie; without it the other two answer `401 {"message":"No authentication
 * token found"}`.
 *
 * NOTE: with the socket layer removed there is currently nothing that calls
 * `requestPlayerToken` or `getPlayerContent` — the frame renders from
 * `constants/dummy.ts` instead. They are kept because they are the REST half of
 * the port and are what a future trigger should use.
 *
 * `getPlayerPresignUrl` IS live: the video widget calls it, and falls back to
 * the payload's own URL when it fails.
 */

/**
 * Exchanges a registration code for a session cookie.
 *
 * `socket_id` came from the Socket.IO connection. The backend historically used
 * it to tie the session to a live socket; with the socket gone `undefined` is
 * sent. If the endpoint starts rejecting that, it needs a replacement
 * correlation id rather than a socket.
 */
export const requestPlayerToken = (code: string, socketId?: string) =>
  apiClient.post<{ ok?: boolean }>('/player-render/auth/requestToken', {
    code,
    socket_id: socketId,
  })

/**
 * The published layout for whichever screen the session cookie belongs to.
 * Takes no parameters — the screen is identified by the cookie.
 */
export const getPlayerContent = () =>
  apiClient.get<PlayerContent.PlayerContentData>(
    '/player-render/content/getPlayerContent',
  )

/**
 * Turns a media path into a short-lived presigned URL.
 * Used by the video widget before every clip.
 */
export const getPlayerPresignUrl = (data: { path: string }) =>
  apiClient.post<{ url?: string }>(
    '/player-render/media/getNewPresignedUrl',
    data,
  )
