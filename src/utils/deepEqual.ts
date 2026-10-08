/**
 * Structural equality, used to decide whether a polled payload differs from the
 * one already on screen.
 *
 * `JSON.stringify` is not usable here: it is key-order sensitive, so a backend
 * that serialises the same data in a different order would look like a change
 * and re-render the frame every 30 seconds.
 *
 * ---------------------------------------------------------------------------
 * CAVEAT — presigned media URLs
 *
 * The `item_image` / `videoDetails[].VideoUrl` fields carry presigned S3 URLs
 * with `X-Amz-Date` and `X-Amz-Signature` query strings. If the backend mints
 * fresh ones on every call, this comparison will report "changed" on every poll
 * even when nothing meaningful moved, and the frame will re-mount (restarting
 * video) every 30 seconds.
 *
 * If that shows up, normalise those fields before comparing rather than
 * loosening this function. The two payloads to compare should be reduced with
 * something like:
 *
 *   const stable = (p) => JSON.parse(JSON.stringify(p, (key, value) =>
 *     key === 'presignedUrl' || key === 'VideoUrl' ? String(value).split('?')[0] : value))
 *
 * That is deliberately NOT done by default — it would hide a genuine change to
 * which file is being shown.
 * ---------------------------------------------------------------------------
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true

  // `NaN !== NaN`, but two NaNs are the same value for our purposes.
  if (typeof a === 'number' && typeof b === 'number') {
    return Number.isNaN(a) && Number.isNaN(b)
  }

  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return false
  }

  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }

  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  if (leftKeys.length !== rightKeys.length) return false

  for (const key of leftKeys) {
    if (!Object.prototype.hasOwnProperty.call(right, key)) return false
    if (!deepEqual(left[key], right[key])) return false
  }
  return true
}
