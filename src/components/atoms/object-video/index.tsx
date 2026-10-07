import { useCallback, useEffect, useRef, useState } from 'react'
import { getPlayerPresignUrl } from '@/infra/api/player'
import type { LayoutFrameTypes } from '@/types/frame'
import type { PlayerContent } from '@/types/player-content'
import { emitVideoPlaylistEnded } from '@/utils/videoPlayback'

/**
 * Video widget — ported from
 * `pt-player/src/components/atoms/object-video/{index,v1}.tsx`.
 * Version dispatcher collapsed; see `object-text/index.tsx`.
 *
 * Two changes from upstream, both marked inline:
 *
 *   1. If the presign call fails, the widget falls back to the `VideoUrl`
 *      already present in the payload. Upstream only ever uses the freshly
 *      presigned URL, so when the API is unreachable (it is CORS-restricted to
 *      allow-listed origins — see documentation.md §14) the element gets
 *      `src=""` and shows nothing. The bundled dummy data carries a usable
 *      `VideoUrl`, so the fallback is what makes video render at all in dev.
 *   2. Upstream's loading overlay uses Tailwind + daisyUI classes
 *      (`absolute inset-0 …` / `loading loading-dots`), neither of which exists
 *      in this build. The same box is expressed inline.
 */
export default function VideoObject({
  value,
}: LayoutFrameTypes.ObjectProps & {
  value?: PlayerContent.VideoDetails[]
}) {
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(undefined)
  const videoRef = useRef<HTMLVideoElement>(null)

  const current = value?.[currentIndex]
  const fallbackUrl = current?.VideoUrl
  const videoPath = current?.VideoPath ?? ''

  const resolveSource = useCallback(async () => {
    if (!videoPath) return ''

    try {
      const presign = await getPlayerPresignUrl({ path: videoPath })
      if (presign?.url) return presign.url
    } catch (error) {
      // Expected whenever the API is unreachable; the payload URL is a fine
      // stand-in while it is still within its own expiry.
      console.warn('[video] presign failed, using the payload URL:', error)
    }

    return fallbackUrl ?? ''
  }, [videoPath, fallbackUrl])

  useEffect(() => {
    let cancelled = false

    const fetchVideo = async () => {
      const url = await resolveSource()
      if (!cancelled) setCurrentSrc(url || undefined)
    }

    void fetchVideo()

    return () => {
      cancelled = true
    }
  }, [resolveSource])

  const handleEnded = () => {
    const total = value?.length ?? 0

    if (currentIndex < total - 1) {
      setCurrentIndex((index) => index + 1)
      return
    }

    // end of the clip list — let the scheduler move on to the next playlist item
    emitVideoPlaylistEnded()

    setCurrentIndex(0)
    if (total <= 1) {
      // src is unchanged, so React re-uses the element and it would sit on the
      // last frame; rewind it by hand instead
      const element = videoRef.current
      if (element) {
        element.currentTime = 0
        element.play().catch(() => undefined)
      }
    }
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        left: 0,
        top: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#ffffff',
        overflow: 'hidden',
        margin: 0,
      }}
    >
      {value?.length ? (
        <>
          {loading && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f3f4f6',
                color: '#0963a0',
                fontSize: '20px',
              }}
            >
              Loading video…
            </div>
          )}
          <video
            onError={(event) => console.error('Video error:', event)}
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
              left: 0,
              top: 0,
              objectFit: 'fill',
              margin: 0,
            }}
            ref={videoRef}
            key={currentSrc} // Re-initialize video when src changes
            src={currentSrc}
            autoPlay
            muted
            onEnded={handleEnded}
            onLoadedData={() => setLoading(false)}
          />
        </>
      ) : (
        <h1 style={{ fontSize: '20px', fontWeight: 600 }}>Grid for Video</h1>
      )}
    </div>
  )
}
