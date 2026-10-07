import { useCallback, useEffect, useState } from 'react'

/**
 * Vendor-prefixed Fullscreen API.
 *
 * The unprefixed API (`requestFullscreen`, `document.fullscreenElement`,
 * `exitFullscreen`, `fullscreenchange`) only landed in Chromium 71. Both 2017
 * TV engines are older — Chromium 53 and 47 — and expose the `webkit`-prefixed
 * variants instead, so calling the unprefixed one on a TV throws
 * "requestFullscreen is not a function" and kills the whole handler.
 */
type TFullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => void | Promise<void>
  msRequestFullscreen?: () => void | Promise<void>
}

type TFullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null
  msFullscreenElement?: Element | null
  webkitExitFullscreen?: () => void | Promise<void>
  msExitFullscreen?: () => void | Promise<void>
}

const getFullscreenElement = (): Element | null => {
  const doc = document as TFullscreenDocument
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? doc.msFullscreenElement ?? null
}

const requestFullscreen = (element: HTMLElement): void => {
  const el = element as TFullscreenElement
  // Prefixed first: on a modern browser the unprefixed one exists too, and
  // either order works, but this keeps the TV path obvious.
  const request = el.requestFullscreen ?? el.webkitRequestFullscreen ?? el.msRequestFullscreen
  if (!request) return
  // Chromium 71+ returns a Promise; the prefixed versions return undefined and
  // signal failure through the `fullscreenerror` event instead. `await`-ing
  // undefined is harmless, but an unhandled rejection is not — hence the catch.
  void Promise.resolve(request.call(el))
    .catch((error: unknown) => console.warn('[fullscreen] request rejected:', error))
}

const exitFullscreen = (): void => {
  const doc = document as TFullscreenDocument
  const exit = doc.exitFullscreen ?? doc.webkitExitFullscreen ?? doc.msExitFullscreen
  if (!exit) return
  void Promise.resolve(exit.call(doc))
    .catch((error: unknown) => console.warn('[fullscreen] exit rejected:', error))
}

export function useFullscreen<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // A callback ref rather than a RefObject: the effect below has to re-run when
  // the node appears, and `useRef` would not trigger that.
  const ref = useCallback((node: T | null) => setElement(node), [])

  const toggle = useCallback(() => {
    if (getFullscreenElement()) {
      exitFullscreen()
    } else if (element) {
      requestFullscreen(element)
    }
  }, [element])

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(getFullscreenElement()))

    // All four names are registered: engines older than Chromium 71 only ever
    // fire the prefixed event, and the listener list is harmless on modern ones.
    const events = [
      'fullscreenchange',
      'webkitfullscreenchange',
      'msfullscreenchange',
    ]
    events.forEach((name) => document.addEventListener(name, onChange))
    onChange()

    return () => events.forEach((name) => document.removeEventListener(name, onChange))
  }, [])

  return { ref, isFullscreen, toggle }
}
