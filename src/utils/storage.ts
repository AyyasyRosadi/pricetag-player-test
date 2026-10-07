/**
 * `localStorage` helpers.
 *
 * Every access is wrapped in try/catch on purpose: unlike desktop Chrome, TV
 * browsers can throw on `localStorage` — some firmware restricts storage for
 * app-installed pages, and Safari-family engines throw in private mode. A
 * registration code that cannot be persisted is still worth displaying, so the
 * failures are swallowed rather than allowed to unmount the player.
 */

export const getLocalStorageItem = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export const setLocalStorageItem = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Non-fatal: the code still lives in React state for this session.
  }
}

export const removeLocalStorageItem = (key: string): void => {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Ignored for the same reason as above.
  }
}
