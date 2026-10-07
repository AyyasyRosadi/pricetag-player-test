/**
 * Registration-code constants.
 *
 * These live here rather than in `hooks/useRegistrationCode.ts` because
 * importing that module has a **side effect**: it imports
 * `infra/websocket/socket.ts`, which calls `io(...)` at module scope and opens a
 * connection immediately. Anything that only wants a constant — the home page,
 * for instance, while the socket is disabled — must not be able to trigger that
 * by accident.
 *
 * `useRegistrationCode` re-exports both, so existing import sites keep working.
 */

/** `localStorage` key holding this screen's registration code across reloads. */
export const REGISTRATION_CODE_KEY = 'registrationCode'

/** Placeholder shown until an operator claims the screen. */
export const WAITING_REGISTRATION_CODE = 'Waiting Registration Code'
