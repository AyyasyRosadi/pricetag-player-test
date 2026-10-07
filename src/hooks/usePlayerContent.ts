import { useEffect, useRef } from 'react'
import { describeApiError } from '../infra/api/error'
import { getPlayerContent, requestPlayerToken } from '../infra/api/player'
import socket from '../infra/websocket/socket'

/**
 * Phase 2 of the `pt-player` port: react to `isPublished` and pull this
 * screen's layout.
 *
 * The trigger chain is identical to `pt-player/src/hooks/useSocketIo.tsx`:
 *
 *   socket  isPublished === 'Yes'
 *     ->    POST /player-render/auth/requestToken   registration code -> cookie
 *     ->    GET  /player-render/content/getPlayerContent
 *
 * For now the response is only logged. Nothing renders it, and the two things
 * `pt-player` does with it besides rendering are not ported yet: the
 * `checkCodeIsUsed` echo and the 5-minute refresh interval.
 */
export default function usePlayerContent(registrationCode: string | null) {
  // Listeners are attached exactly once, so the current code is read through a
  // ref instead of being closed over. Closing over it would freeze whatever the
  // code was when the effect first ran, and this hook lives for the whole
  // session — an operator re-assigning the screen would leave it fetching with
  // a stale code.
  const codeRef = useRef(registrationCode)

  // `pt-player` keeps an `authenticated` flag so repeated `isPublished` events
  // do not re-POST the token. Same intent, but in a ref so setting it does not
  // re-run the effect and detach the listener mid-flight.
  const authenticatedRef = useRef(false)

  useEffect(() => {
    codeRef.current = registrationCode
  }, [registrationCode])

  useEffect(() => {
    const authenticate = async (code: string) => {
      if (authenticatedRef.current) return

      try {
        const body = await requestPlayerToken(code, socket.id)
        authenticatedRef.current = true
        console.log('[player-content] requestToken ok:', body)
      } catch (error) {
        // Not fatal, and `pt-player` swallows this entirely. Carrying on means
        // the content call below gets to report the real status (a 401 from the
        // API is far more informative than a failed token POST).
        console.error('[player-content] requestToken failed:', describeApiError(error))
      }
    }

    const fetchPlayerContent = async () => {
      const code = codeRef.current

      if (!code) {
        console.warn('[player-content] isPublished arrived before a code — skipping')
        return
      }

      await authenticate(code)

      try {
        const content = await getPlayerContent()
        console.log('[player-content] getPlayerContent:', content)
      } catch (error) {
        console.error('[player-content] getPlayerContent failed:', describeApiError(error))
      }
    }

    const handleIsPublished = (isPublished: string) => {
      console.log('[player-content] isPublished:', isPublished)

      if (isPublished === 'Yes') {
        void fetchPlayerContent()
      }
      // 'No' means the backend unpublished this screen. `pt-player` drops the
      // layout here; there is nothing to drop while the payload is only logged.
    }

    socket.on('isPublished', handleIsPublished)

    return () => {
      socket.off('isPublished', handleIsPublished)
    }
  }, [])
}
