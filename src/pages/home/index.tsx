import { useState } from 'react'
import {
  REGISTRATION_CODE_KEY,
  WAITING_REGISTRATION_CODE,
} from '../../constants/registration'
import { useApiProbe } from '../../hooks/useApiProbe'
import { useFullscreen } from '../../hooks/useFullscreen'
import { getLocalStorageItem, setLocalStorageItem } from '../../utils/storage'
import './index.css'

/*
 * Disabled together with the socket wiring in `Home` below — restore the three
 * imports and the two hook calls as a set. They are commented out rather than
 * removed so the phase 1 / phase 2 code is one `Ctrl+/` away.
 */
// import useRegistrationCode from '../../hooks/useRegistrationCode'
// import usePlayerContent from '../../hooks/usePlayerContent'
// import { useDelayedFlag } from '../../hooks/useDelayedFlag'

/**
 * How long the socket may stay down before the offline notice is shown. Only
 * used by the disabled offline notice below; kept so the constant and the
 * notice travel together.
 */
// const OFFLINE_NOTICE_DELAY_MS = 5000

/**
 * Registration screen — a 1:1 port of `pt-player`'s `src/page/home` default
 * variant, so the two players are visually identical.
 *
 * The values in `index.css` are not eyeballed; they are the Tailwind classes
 * from that file resolved to pixels (and cross-checked against a screenshot of
 * the running Next.js player). The original markup is:
 *
 *   bg-gray-200 / Card w-lg px-4 py-10 rounded-4xl flex-col gap-2
 *   ├─ icon w-16 h-16  +  title w-80 h-20        (flex gap-3)
 *   ├─ h1 text-3xl "Welcome to screen"           (text-center mb-10)
 *   ├─ p text-xl "This is your" / text-secondary "Screen Registration Code"
 *   ├─ box  border-orange-500 rounded-3xl h-16 w-[90%] p-10
 *   └─ div  flex-col gap-3 w-[80%] mt-12  → Buttons, h-16
 */
function Home() {
  /*
   * ── Socket.IO + getPlayerContent: TEMPORARILY DISABLED ─────────────────────
   *
   * WebSockets do not connect in the current environment, so both hooks are
   * commented out rather than deleted. `useRegistrationCode.ts` and
   * `usePlayerContent.ts` are untouched; uncomment the two lines below to
   * restore phase 1 and phase 2 exactly as they were.
   *
   * With them off nothing imports `infra/websocket/socket.ts`, so no connection
   * is attempted at all (it calls `io(...)` at module scope).
   */
  // const { registrationCode, isConnected } = useRegistrationCode()
  // usePlayerContent(registrationCode)

  const { ref: screenRef, isFullscreen, toggle } = useFullscreen<HTMLDivElement>()

  // With the socket off, the code can no longer be assigned by the backend, so
  // `localStorage` is the single source of truth for it.
  const [savedCode, setSavedCode] = useState<string | null>(() =>
    getLocalStorageItem(REGISTRATION_CODE_KEY),
  )

  const [isEditing, setIsEditing] = useState(false)
  const [draftCode, setDraftCode] = useState('')

  // Belongs to the socket-down notice at the bottom of this component.
  // const showOffline = useDelayedFlag(!isConnected, OFFLINE_NOTICE_DELAY_MS)

  // TEMPORARY: see hooks/useApiProbe.ts.
  const probe = useApiProbe()

  const code = savedCode ?? WAITING_REGISTRATION_CODE
  const showInput = isEditing

  const handleSubmitCode = () => {
    const trimmed = draftCode.trim()
    if (!trimmed) return

    setLocalStorageItem(REGISTRATION_CODE_KEY, trimmed)
    setSavedCode(trimmed)
    setDraftCode('')
    setIsEditing(false)
  }

  return (
    <div className="registration" ref={screenRef}>
      <div className="registration__card">
        <div className="registration__brand">
          <img className="registration__icon" src="/images/icon.png" alt="" />
          <img
            className="registration__logo"
            src="/images/title.svg"
            alt="SmartPriceTag"
          />
        </div>

        <div className="registration__title-wrap">
          <h1 className="registration__title">Welcome to screen</h1>
        </div>

        <div className="registration__lead">
          <p className="registration__lead-line">This is your</p>
          <p className="registration__lead-accent">Screen Registration Code</p>
        </div>

        {showInput ? (
          <input
            className="registration__code registration__code--input"
            value={draftCode}
            onChange={(event) => setDraftCode(event.target.value)}
          />
        ) : (
          <div
            className={
              savedCode
                ? 'registration__code'
                : 'registration__code registration__code--waiting'
            }
          >
            {code}
          </div>
        )}

        <div className="registration__actions">
          <button type="button" className="registration__button" onClick={toggle}>
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </button>

          <button
            type="button"
            className="registration__button registration__button--bordered"
            onClick={() => setIsEditing((editing) => !editing)}
          >
            Insert Code
          </button>

          {/* Only meaningful while the field is open; it commits the draft. */}
          {isEditing && (
            <button
              type="button"
              className="registration__button"
              onClick={handleSubmitCode}
            >
              Submit
            </button>
          )}
        </div>
      </div>

      {/*
       * The socket-down notice that used to live in this slot. Left here,
       * commented, next to its replacement so both halves travel together —
       * re-enable it with the hook calls at the top of this component.
       *
       * {showOffline && (
       *   <p className="registration__offline">
       *     Offline — retrying · {import.meta.env.VITE_WS_URL}
       *   </p>
       * )}
       */}

      {/*
       * TEMPORARY diagnostic, occupying the slot the offline notice used to
       * (pinned to the viewport, outside the card, so the card geometry is
       * untouched). See hooks/useApiProbe.ts.
       */}
      {probe.status === 200 && (
        <p className="registration__probe">
          call api success with status {probe.status}
          {probe.firstUser
            ? ` · #${probe.firstUser.id} ${probe.firstUser.first_name} ${probe.firstUser.last_name} (${probe.firstUser.email})`
            : ''}
        </p>
      )}

      {probe.status !== null && probe.status !== 200 && (
        <p className="registration__probe registration__probe--error">
          call api failed with status {probe.status}
        </p>
      )}

      {probe.error && (
        <p className="registration__probe registration__probe--error">
          call api failed · {probe.error}
        </p>
      )}
    </div>
  )
}

export default Home
