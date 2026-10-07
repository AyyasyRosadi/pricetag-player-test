/// <reference types="vite/client" />

/**
 * Typed view of the `VITE_*` variables declared in `.env`.
 *
 * Only `VITE_`-prefixed keys reach the browser — Vite inlines them at build
 * time, which is also why they must never hold a secret.
 */
interface ImportMetaEnv {
  /** Socket.IO origin of the player backend, e.g. `https://pricetag-stag2.mdevoffice.net`. */
  readonly VITE_WS_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
