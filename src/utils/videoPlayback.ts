/**
 * Video playback helpers — ported from `pt-player/src/utils/videoPlayback.ts`.
 *
 * Nothing in the player currently consumes `isVideoDrivenLayout` /
 * `onVideoPlaylistEnded` (they belong to the scheduler, which is not ported
 * yet), but the video widget emits the end-of-playlist signal, so the event
 * channel is here and ready.
 */
import { LayoutFrameConstants } from '@/constants/object'
import type { PlayerContent } from '@/types/player-content'

/** Zones that only decorate — they don't stop a layout from counting as video-only. */
const DECORATIVE_CONTENT_TYPES: string[] = [
  LayoutFrameConstants.ContentType.EMPTY,
  LayoutFrameConstants.ContentType.FRAME,
  LayoutFrameConstants.ContentType.FRAME_IMAGE,
  LayoutFrameConstants.ContentType.INSERT,
]

/**
 * True when a layout's only real widget is video. Such an item ignores
 * `duration` and holds the playlist until playback actually finishes.
 */
export function isVideoDrivenLayout(item?: PlayerContent.ContentPlayer): boolean {
  if (!item?.videoDetails?.length) return false

  const zones = item.layout?.layout_zone ?? []
  let hasVideo = false

  for (const zone of zones) {
    const type = zone.layout_zone_content?.content_type
    if (!type || DECORATIVE_CONTENT_TYPES.indexOf(type) !== -1) continue
    if (type !== LayoutFrameConstants.ContentType.VIDEO) return false
    hasVideo = true
  }

  return hasVideo
}

// ── "the video playlist reached its end" signal ───────────────────────────────
// The <video> element sits many levels below the scheduler, so it reports back
// through this channel instead of a chain of callback props.

type Listener = () => void

const listeners = new Set<Listener>()

export function onVideoPlaylistEnded(listener: Listener): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function emitVideoPlaylistEnded() {
  // snapshot first: a listener resubscribes while we are notifying
  for (const listener of Array.from(listeners)) listener()
}
