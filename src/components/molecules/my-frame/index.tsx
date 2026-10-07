import { useEffect, useRef, useState, type ReactNode } from 'react'

interface FrameProps {
  frameWidth: number
  frameHeight: number
  children?: ReactNode
}

/**
 * Frame canvas — ported from `pt-player/src/components/molecules/my-frame`.
 *
 * Scales a fixed-size design (the layout's `additional_configuration.width` x
 * `height`, e.g. 1920x1080) to fit whatever screen it lands on, letterboxed and
 * centred. Every widget inside works in absolute design pixels, so a layout can
 * be authored once and shown on any panel.
 *
 * Deviations from upstream, all noted inline:
 *   - `frameWidth`/`frameHeight` fall back to 1920x1080. Upstream uses
 *     non-null assertions (`layout?.additional_configuration?.width!`), which
 *     produce `NaN` for a layout without an explicit size and collapse the whole
 *     frame to zero.
 *   - `ResizeObserver` is Chromium 64+, so it is polyfilled for the legacy
 *     bundle only — see `additionalLegacyPolyfills` in vite.config.ts.
 */
export default function MyFrame({ frameWidth, frameHeight, children }: FrameProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 })

  const designWidth = frameWidth || 1920
  const designHeight = frameHeight || 1080

  useEffect(() => {
    const measure = () => {
      // Strategy: take the MINIMUM of all available width sources. Android
      // Chrome often reports inconsistent values across APIs; the smallest is
      // always the safest, since it never renders beyond what Chrome paints.
      const sources = [
        containerRef.current?.getBoundingClientRect().width,
        window.visualViewport?.width,
        document.documentElement.clientWidth,
      ].filter((v): v is number => typeof v === 'number' && v > 0)

      const width = Math.min(...sources)

      // For height, also take the minimum to avoid address-bar issues.
      const heightSources = [
        containerRef.current?.getBoundingClientRect().height,
        window.visualViewport?.height,
        document.documentElement.clientHeight,
      ].filter((v): v is number => typeof v === 'number' && v > 0)

      const height = Math.min(...heightSources)

      // Floor to integer — sub-pixel widths cause 1px gaps on some devices.
      setScreenSize({ width: Math.floor(width), height: Math.floor(height) })
    }

    // Small delay on mount: the first paint can report wrong values before
    // layout has settled.
    const timeout = setTimeout(measure, 50)

    // ResizeObserver is Chromium 64+, but it IS polyfilled for the legacy
    // bundle — see `additionalLegacyPolyfills` in vite.config.ts. The check:tv
    // rule cannot see build config, hence the suppression marker below.
    // tv-compat-allow
    const ro = new ResizeObserver(() => {
      setTimeout(measure, 30)
    })

    if (containerRef.current) ro.observe(containerRef.current)

    // `visualViewport` is Chromium 61+; `?.` leaves it out of the sources array
    // on engines that lack it.
    window.visualViewport?.addEventListener('resize', measure)
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)

    return () => {
      clearTimeout(timeout)
      ro.disconnect()
      window.visualViewport?.removeEventListener('resize', measure)
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
    }
  }, [])

  const scale =
    screenSize.width && screenSize.height
      ? Math.min(screenSize.width / designWidth, screenSize.height / designHeight)
      : 1

  const offsetX = Math.floor((screenSize.width - designWidth * scale) / 2)
  const offsetY = Math.floor((screenSize.height - designHeight * scale) / 2)

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        background: '#000000',
      }}
    >
      {screenSize.width > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: designWidth,
            height: designHeight,
            transformOrigin: 'top left',
            // Integer-pixel translate prevents sub-pixel blur/gap on panels.
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
            boxSizing: 'border-box',
            overflow: 'hidden',
            background: '#fff',
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
