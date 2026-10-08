import { useCallback, useEffect, useRef, useState } from 'react'
import { describeApiError } from '@/infra/api/error'
import { getContent } from '@/infra/api/priceTag'
import { pushToast } from '@/infra/toast/store'
import type { PlayerContent } from '@/types/player-content'
import { deepEqual } from '@/utils/deepEqual'

/** How often the player re-asks the server what it should be showing. */
export const CONTENT_POLL_INTERVAL_MS = 30_000

/** How the fetch was triggered — this decides the loading and error behaviour. */
type LoadMode =
  /** startup / code change: show a spinner, always report a failure */
  | 'initial'
  /** the operator just pressed Submit: always report a failure */
  | 'explicit'
  /** the 30s heartbeat: stay silent unless this is the first failure in a row */
  | 'poll'

type UsePlayerContentResult = {
  content: PlayerContent.PlayerContentData | null
  isLoading: boolean
  /** Fetch immediately, outside the polling rhythm. */
  reload: (mode?: LoadMode) => Promise<void>
}

/**
 * Watches the content for one registration code.
 *
 * Behaviour, in order:
 *   1. If a code already exists at startup, fetch immediately.
 *   2. Poll every 30 seconds.
 *   3. Replace the content only when the payload actually differs — a poll that
 *      returns the same data must not re-render the frame, because a re-mount
 *      restarts video playback.
 *
 * Error handling is deliberately asymmetric. `poll` failures do not raise a
 * second toast while they keep failing: an unreachable backend would otherwise
 * stack a new error every 30 seconds forever. The first failure of a streak is
 * reported, and a success resets the streak. Startup and Submit always report.
 */
export function usePlayerContent(code: string | null): UsePlayerContentResult {
  const [content, setContent] = useState<PlayerContent.PlayerContentData | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState(false)

  /** Last payload that was actually rendered — the comparison baseline. */
  const rendered = useRef<PlayerContent.PlayerContentData | null>(null)
  /** Guards against an older, slower response overwriting a newer one. */
  const requestId = useRef(0)
  /** Consecutive failures, so the poll does not spam toasts. */
  const failures = useRef(0)

  const load = useCallback(
    async (mode: LoadMode = 'poll') => {
      if (!code) return

      const id = requestId.current + 1
      requestId.current = id
      if (mode !== 'poll') setIsLoading(true)

      try {
        const next = await getContent(code)
        if (id !== requestId.current) return // superseded by a newer request

        failures.current = 0
        if (deepEqual(rendered.current, next)) return // nothing moved

        rendered.current = next
        setContent(next)
      } catch (error) {
        if (id !== requestId.current) return

        failures.current += 1
        // One toast per outage, not one per poll.
        if (mode !== 'poll' || failures.current === 1) {
          pushToast(describeApiError(error), 'error')
        }
      } finally {
        if (id === requestId.current && mode !== 'poll') setIsLoading(false)
      }
    },
    [code],
  )

  // Startup, and whenever the operator saves a different code.
  useEffect(() => {
    if (!code) {
      rendered.current = null
      failures.current = 0
      return
    }

    // Deferred by one tick. `load` sets its loading flag synchronously, and
    // doing that straight from an effect is what `react-hooks/set-state-in-effect`
    // flags as a cascading render. The delay is 0ms — it only moves the setState
    // out of the effect's synchronous phase. The cleanup also cancels a fetch
    // that was queued but never started.
    const id = window.setTimeout(() => {
      void load('initial')
    }, 0)

    return () => window.clearTimeout(id)
  }, [code, load])

  // The 30s heartbeat.
  useEffect(() => {
    if (!code) return

    const id = window.setInterval(() => {
      void load('poll')
    }, CONTENT_POLL_INTERVAL_MS)

    return () => window.clearInterval(id)
  }, [code, load])

  // `content` is derived rather than reset in an effect: clearing it from inside
  // the effect above is a synchronous setState in an effect (rejected by
  // `react-hooks/set-state-in-effect`), and deriving it also guarantees a
  // cleared code can never leave a stale frame on screen for one render.
  return { content: code ? content : null, isLoading, reload: load }
}

export default usePlayerContent
