import { useEffect, useState } from 'react'

/**
 * TEMPORARY diagnostic — not part of the player.
 *
 * WebSockets could not be established in the current environment, so this calls
 * a public, unauthenticated API to answer a narrower question: can this build
 * make *any* cross-origin request at all, and see the status code?
 *
 * Remove this file, its call in `pages/home/index.tsx` and the
 * `.registration__probe` rules in `pages/home/index.css` once the real API path
 * is working again.
 *
 * Deliberately `fetch`, not the shared `apiClient`:
 *
 *   1. reqres answers with `Access-Control-Allow-Origin: *`, and a wildcard
 *      forbids credentialed requests. The shared client sets
 *      `withCredentials: true`, so the browser would reject the response before
 *      the app ever saw the status code — a false negative.
 *   2. It must not inherit `baseURL`, which points at the player API.
 *
 * `fetch` is Chromium 42+, so unlike the axios path there is nothing here that
 * needs a polyfill on the 2017 TVs.
 *
 * This endpoint is outside the project's "no remote dependencies at runtime"
 * rule (rules.md §5) on purpose, and is why the file is named after the probe
 * rather than folded into `infra/api`.
 */

const PROBE_URL = 'https://reqres.in/api/users?page=1'

export type TProbeUser = {
  id: number
  email: string
  first_name: string
  last_name: string
  avatar: string
}

export type TApiProbe = {
  /** HTTP status, or `null` while the request is in flight or never completed. */
  status: number | null
  /** The first element of the response's `data` array, when there is one. */
  firstUser: TProbeUser | null
  /** Set only when the request itself failed — a CORS rejection lands here. */
  error: string | null
}

export const useApiProbe = (): TApiProbe => {
  const [probe, setProbe] = useState<TApiProbe>({
    status: null,
    firstUser: null,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const response = await fetch(PROBE_URL)

        // Read the body defensively: a proxy or captive portal can answer with
        // HTML, and `response.json()` would then throw and hide the status.
        let firstUser: TProbeUser | null = null
        try {
          const body = (await response.json()) as { data?: TProbeUser[] }
          firstUser = Array.isArray(body?.data) ? (body.data[0] ?? null) : null
        } catch {
          firstUser = null
        }

        if (cancelled) return
        setProbe({ status: response.status, firstUser, error: null })
      } catch (error) {
        if (cancelled) return
        // `TypeError: Failed to fetch` is what a CORS rejection looks like from
        // inside the page — there is no status code to report.
        setProbe({
          status: null,
          firstUser: null,
          error: (error as Error)?.message ?? 'request failed',
        })
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [])

  return probe
}

export default useApiProbe
