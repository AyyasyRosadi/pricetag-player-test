/** The shape of an axios failure, narrowed to what this app reads. */
type TApiErrorShape = {
  message?: string
  response?: {
    status?: number
    data?: {
      errors?: Array<{ status?: number; title?: string }>
    }
  }
}

/**
 * Turns any thrown value into one readable line.
 *
 * The player API reports failures as `{ errors: [{ status, title }] }` —
 * `pt-player` reads `error.response?.data?.errors?.[0]?.title`, and that path is
 * preserved so later ports keep working.
 *
 * The case `pt-player` cannot report is the one worth calling out: when the
 * request never reaches the API there is no `response` at all, and the message
 * is a bare "Network Error". On this project the usual cause is the server-side
 * CORS allow-list rather than the network, so the message says so explicitly.
 */
export const describeApiError = (error: unknown): string => {
  const { response, message } = (error ?? {}) as TApiErrorShape
  const title = response?.data?.errors?.[0]?.title

  if (title) return `${response?.status ?? '?'} — ${title}`
  if (response) return `${response.status ?? '?'} — request rejected`

  return (
    `no response (${message ?? 'unknown'}) — the request never reached the API. ` +
    'Most likely the origin is not on the backend CORS allow-list; see documentation.md §14.'
  )
}
