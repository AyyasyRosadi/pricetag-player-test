/**
 * Registration-code constants.
 *
 * They live here rather than beside the registration UI so that anything needing
 * only a constant does not have to pull in a module with side effects. That was
 * originally because `hooks/useRegistrationCode.ts` opened a Socket.IO
 * connection at import time; the socket layer is gone now, but the split is
 * still the right shape — `pages/home` reads the code from `localStorage` and
 * these are the only two strings it needs.
 */

/** `localStorage` key holding this screen's registration code across reloads. */
export const REGISTRATION_CODE_KEY = 'registrationCode'

/** Placeholder shown until an operator claims the screen. */
export const WAITING_REGISTRATION_CODE = 'Waiting Registration Code'
