import axios from 'axios'

/** REST base for the player backend, e.g. `https://pricetag-stag2.mdevoffice.net/api`. */
const API_URL = import.meta.env.VITE_API_URL

if (!API_URL) {
  console.error(
    '[api] VITE_API_URL is not set — copy .env.example to .env.local and restart the build.',
  )
}

const baseClient = axios.create({
  baseURL: API_URL,
  // Mandatory, not cosmetic: `requestToken` answers with a session cookie and
  // every later call is authorised by that cookie, not by a bearer token.
  withCredentials: true,
})

/**
 * Thin unwrapping client, mirroring `pt-player/src/infra/axios`.
 *
 * `pt-player` also routes through `setupInterceptorsTo`, which is a no-op
 * (both `interceptors.*.use` calls are commented out upstream), so it is not
 * ported.
 *
 * ---------------------------------------------------------------------------
 * DO NOT add `timeout`, `signal` or `cancelToken` to this client.
 *
 * axios only reaches for `AbortController` when one of those is present
 * (`composeSignals(signals, timeout)` in the xhr adapter short-circuits when
 * both are empty), and `AbortController` is Chromium 66+. Adding a timeout
 * would therefore work perfectly on a dev machine and silently break *every*
 * API call on the 2017 TVs. See rules.md §6.
 * ---------------------------------------------------------------------------
 */
export const apiClient = {
  async get<T>(url: string): Promise<T> {
    const response = await baseClient.get<T>(url)
    return response.data
  },

  async post<T>(url: string, data?: unknown): Promise<T> {
    const response = await baseClient.post<T>(url, data)
    return response.data
  },
}

export default apiClient
