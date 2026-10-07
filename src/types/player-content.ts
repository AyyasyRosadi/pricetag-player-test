/**
 * Minimal view of what `getPlayerContent` returns.
 *
 * Deliberately loose: the response is only logged for now, and the renderer
 * that would consume it is not ported yet. Tighten this against
 * `pt-player/src/types/player-content.ts` when that phase starts — the two
 * fields below are the ones `pt-player` reads while merely *deciding* what to
 * do with the payload (orientation / rotation), before any rendering.
 */
export type TPlayerContent = {
  orientation?: string
  layout?: {
    additional_configuration?: {
      width?: number
      height?: number
      screen_rotation?: string
    }
  }
  [key: string]: unknown
}
