import { useCallback, useEffect, useState } from 'react'
import {
  REGISTRATION_CODE_KEY,
  WAITING_REGISTRATION_CODE,
} from '../constants/registration'
import socket from '../infra/websocket/socket'
import { getLocalStorageItem, setLocalStorageItem } from '../utils/storage'

// Re-exported so this hook stays the single import site for the registration
// constants. They are defined in `constants/registration.ts` because importing
// *this* module runs `infra/websocket/socket.ts`, which opens a connection at
// import time — a caller that only wants a constant must not trigger that.
export { REGISTRATION_CODE_KEY, WAITING_REGISTRATION_CODE }

/**
 * Screen geometry reported on connect. The backend uses it to decide which
 * layout to build for this screen, so the field names and shapes are part of
 * the wire contract and mirror `pt-player` exactly.
 */
export type TAdditionalInfo = {
  width: number
  height: number
  devicePixelRatio: number
  orientation: string
}

export const buildAdditionalInfo = (): TAdditionalInfo => ({
  width: window.screen.width,
  height: window.screen.height,
  devicePixelRatio: window.devicePixelRatio,
  // `screen.orientation` is Chromium 38+, but some TV engines omit it entirely.
  // It must never be allowed to throw during the first connect.
  orientation: window.screen.orientation?.type ?? 'landscape-primary',
})

/**
 * Phase 1 of the `pt-player` port: the Socket.IO handshake that gives this
 * screen a `registrationCode`, and nothing else.
 *
 * Wire contract (identical to `pt-player`, do not rename):
 *
 *   emit  requestRegistrationCode  (additionalInfoJson)   first boot, no code yet
 *   emit  updateSocketId           (code, additionalInfoJson)
 *   on    registrationCode         (code)                 reserve/assign
 *   on    overwriteRegistrationCode(code)                 operator re-assigned it
 *
 * Deliberately NOT ported yet — everything that depends on a *published layout*:
 * `content_changes`, `checkCodeIsUsed` / `codeIsUsed`, `submitRegistrationCode`,
 * `updateContentSyncProgress`, `request_latest_player_screen`, and all rotation
 * handling.
 *
 * `isPublished` and the `getPlayerContent` fetch that hangs off it now live in
 * `usePlayerContent`, which keeps this hook to the handshake alone.
 */
export default function useRegistrationCode() {
  const [registrationCode, setRegistrationCode] = useState<string | null>(() =>
    getLocalStorageItem(REGISTRATION_CODE_KEY),
  )
  const [isConnected, setIsConnected] = useState(() => socket.connected)

  const persistCode = useCallback((code: string) => {
    setRegistrationCode(code)
    setLocalStorageItem(REGISTRATION_CODE_KEY, code)
  }, [])

  useEffect(() => {
    // Storage is read here rather than closed over from state so the listeners
    // can be attached exactly once for the lifetime of the screen. `pt-player`
    // re-subscribes the whole effect on every code change, which drops and
    // re-adds handlers mid-handshake.
    const claimedCode = () => getLocalStorageItem(REGISTRATION_CODE_KEY)

    const handleConnect = () => {
      setIsConnected(true)

      const additionalInfo = JSON.stringify(buildAdditionalInfo())
      const code = claimedCode()

      if (!code) {
        // First boot: ask the backend to reserve a code for this screen.
        socket.emit('requestRegistrationCode', additionalInfo)
      } else {
        // Reconnect: re-attach this socket id to the code we already own, so the
        // screen keeps its identity across drops.
        socket.emit('updateSocketId', code, additionalInfo)
      }
    }

    const handleDisconnect = (reason: string) => {
      setIsConnected(false)
      console.warn('[socket] disconnected:', reason)
    }

    const handleRegistrationCode = (code: string) => {
      // The backend re-sends the code on every connect. A code already held must
      // win, otherwise a reconnect would overwrite an operator's assignment.
      if (!claimedCode()) persistCode(code)
    }

    const handleOverwriteRegistrationCode = (code: string) => {
      persistCode(code)
      socket.emit('updateSocketId', code, JSON.stringify(buildAdditionalInfo()))
    }

    const handleError = (message: unknown) => {
      console.error('[socket] server error:', message)
    }

    // The socket is created at import time, so it can already be connected by
    // the time this effect runs — `connect` would never fire again.
    //
    // Only `connect` is bound, not Manager `reconnect`: socket.io re-emits
    // `connect` after every successful reconnection as well, so binding both
    // (as `pt-player` does) fires `requestRegistrationCode` twice and can
    // reserve two codes for one screen.
    if (socket.connected) handleConnect()
    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('registrationCode', handleRegistrationCode)
    socket.on('overwriteRegistrationCode', handleOverwriteRegistrationCode)
    socket.on('error', handleError)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('registrationCode', handleRegistrationCode)
      socket.off('overwriteRegistrationCode', handleOverwriteRegistrationCode)
      socket.off('error', handleError)
    }
  }, [persistCode])

  return { registrationCode, isConnected }
}
