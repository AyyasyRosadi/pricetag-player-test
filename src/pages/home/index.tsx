import { useEffect, useState } from 'react'
import useRegistrationCode, {
  WAITING_REGISTRATION_CODE,
} from '../../hooks/useRegistrationCode'
import { useFullscreen } from '../../hooks/useFullscreen'
import './index.css'

/**
 * How long the socket may stay down before the offline notice is shown.
 *
 * On a cold load `isConnected` is false until the `connect` event arrives, so
 * without this the notice would flash for a few hundred milliseconds and the
 * card would visibly jump. Only a genuinely stuck screen should say anything.
 */
const OFFLINE_NOTICE_DELAY_MS = 5000

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
 *   └─ div  flex-col gap-3 w-[80%] mt-12  → two Buttons, h-16
 */
function Home() {
  const { registrationCode, isConnected } = useRegistrationCode()
  const { ref: screenRef, isFullscreen, toggle } = useFullscreen<HTMLDivElement>()

  // Manual-entry mode. `pt-player` only toggles this UI — its `submitAnotherCode`
  // is never wired to the button — so nothing is emitted here either. The input
  // is kept as local state for the same reason.
  const [isEditing, setIsEditing] = useState(false)
  const [draftCode, setDraftCode] = useState('')
  const [showOffline, setShowOffline] = useState(false)

  // Only surface a connection problem once it has lasted a moment.
  useEffect(() => {
    if (isConnected) {
      setShowOffline(false)
      return
    }
    const timer = setTimeout(() => setShowOffline(true), OFFLINE_NOTICE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [isConnected])

  const code = registrationCode ?? WAITING_REGISTRATION_CODE
  const isWaiting = code === WAITING_REGISTRATION_CODE
  const showInput = isEditing && !isWaiting

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
              isWaiting
                ? 'registration__code registration__code--waiting'
                : 'registration__code'
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
            {isEditing
              ? 'Use Default Registration Code'
              : 'Use Another Registration Code'}
          </button>
        </div>
      </div>

      {/*
       * NOT in `pt-player`. Shown only after the socket has been down for
       * `OFFLINE_NOTICE_DELAY_MS`, so a healthy screen is pixel-identical to the
       * Next.js player while a stuck one still says why — a TV gives you no
       * devtools. It is pinned to the viewport, never inside the card, so it
       * cannot shift the layout. Delete this block to drop it entirely.
       */}
      {showOffline && (
        <p className="registration__offline">
          Offline — retrying · {import.meta.env.VITE_WS_URL}
        </p>
      )}
    </div>
  )
}

export default Home
