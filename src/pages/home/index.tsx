import { useState } from 'react'
import {
  REGISTRATION_CODE_KEY,
  WAITING_REGISTRATION_CODE,
} from '@/constants/registration'
import { dummyData } from '@/constants/dummy'
import { useApiProbe } from '@/hooks/useApiProbe'
import { useFullscreen } from '@/hooks/useFullscreen'
import Content from '@/pages/content'
import { getLocalStorageItem, setLocalStorageItem } from '@/utils/storage'
import './index.css'

/**
 * Registration screen — a 1:1 port of `pt-player`'s `src/page/home` default
 * variant, so the two players are visually identical. The card geometry in
 * `index.css` is the Tailwind class list from that file resolved to pixels and
 * verified against a screenshot of the running Next.js player.
 *
 * The Socket.IO wiring that used to live here is gone; `registrationCode` now
 * comes from `localStorage` alone (see the Insert Code / Submit buttons).
 *
 * "Show Content" renders `constants/dummy.ts` through the ported frame renderer
 * (`pages/content`), which is the same path a real payload will take.
 */
function Home() {
  const { ref: screenRef, isFullscreen, toggle } = useFullscreen<HTMLDivElement>()

  const [savedCode, setSavedCode] = useState<string | null>(() =>
    getLocalStorageItem(REGISTRATION_CODE_KEY),
  )
  const [isEditing, setIsEditing] = useState(false)
  const [draftCode, setDraftCode] = useState('')
  const [showContent, setShowContent] = useState(false)

  // TEMPORARY: see hooks/useApiProbe.ts.
  const probe = useApiProbe()

  const code = savedCode ?? WAITING_REGISTRATION_CODE

  const handleSubmitCode = () => {
    const trimmed = draftCode.trim()
    if (!trimmed) return

    setLocalStorageItem(REGISTRATION_CODE_KEY, trimmed)
    setSavedCode(trimmed)
    setDraftCode('')
    setIsEditing(false)
  }

  /*
   * The frame canvas is `position: fixed` and covers the viewport, so the card
   * cannot be clicked through while it is up. That is why there is a close
   * affordance here — a TV has no reload button, and without it the only way
   * back to the registration screen would be power-cycling the device.
   */
  if (showContent) {
    return (
      <>
        <Content {...dummyData} />
        <button
          type="button"
          className="content-close"
          onClick={() => setShowContent(false)}
        >
          Close content
        </button>
      </>
    )
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

        {isEditing ? (
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

          <button
            type="button"
            className="registration__button registration__button--bordered"
            onClick={() => setShowContent(true)}
          >
            Show Content
          </button>
        </div>
      </div>

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
