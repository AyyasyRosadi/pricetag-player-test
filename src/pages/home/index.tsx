import { useEffect, useState } from 'react'
import ToastHost from '@/components/molecules/toast-host'
import {
  REGISTRATION_CODE_KEY,
  WAITING_REGISTRATION_CODE,
} from '@/constants/registration'
import { describeApiError } from '@/infra/api/error'
import { saveCode } from '@/infra/api/priceTag'
import { pushToast } from '@/infra/toast/store'
import { useFullscreen } from '@/hooks/useFullscreen'
import { usePlayerContent } from '@/hooks/usePlayerContent'
import Content from '@/pages/content'
import { getLocalStorageItem, setLocalStorageItem } from '@/utils/storage'
import './index.css'

/**
 * Delay before the cross-fade starts, so the browser has painted the card
 * before the opacity transition begins. Without it the transition can be
 * collapsed into the first paint and appear as an instant switch.
 */
const TRANSITION_DELAY_MS = 40

/**
 * Registration screen and content entry point.
 *
 * Card geometry is a 1:1 port of `pt-player`'s `src/page/home` default variant —
 * the numbers in `index.css` are the Tailwind classes from that file resolved to
 * pixels and verified against a screenshot of the running Next.js player.
 *
 * One deliberate deviation: every button is as wide as the code field above it.
 * Upstream uses `w-[80%]` for the button column against `w-[90%]` for the field,
 * so the buttons are narrower and their edges do not line up. See the note on
 * `.registration__actions` in `index.css`.
 *
 * Flow:
 *   - No saved code       -> [Fullscreen] [Insert Code]
 *   - Editing             -> [Fullscreen] [Submit] [Cancel]
 *   - Code saved          -> [Fullscreen] only; the code is hidden behind a
 *                            fade once content arrives
 *
 * The API pair is `/price-tag/*` — see `infra/api/priceTag.ts`, which documents
 * that those routes are not deployed yet.
 */
function Home() {
  const { ref: screenRef, isFullscreen, toggle } = useFullscreen<HTMLDivElement>()

  const [savedCode, setSavedCode] = useState<string | null>(() =>
    getLocalStorageItem(REGISTRATION_CODE_KEY),
  )
  const [isEditing, setIsEditing] = useState(false)
  const [draftCode, setDraftCode] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  /** Set by "Close content"; the player keeps polling, it just stops showing. */
  const [isContentHidden, setIsContentHidden] = useState(false)

  const { content, isLoading } = usePlayerContent(savedCode)

  const isSaved = Boolean(savedCode)
  const wantsContent = content !== null && !isContentHidden

  /*
   * Cross-fade. Both directions go through the timer rather than setting state
   * synchronously in the effect — that is what the `set-state-in-effect` lint
   * rule rejects, and the delay is what makes the transition visible at all.
   */
  const [showContent, setShowContent] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(
      () => setShowContent(wantsContent),
      wantsContent ? TRANSITION_DELAY_MS : 0,
    )
    return () => window.clearTimeout(id)
  }, [wantsContent])

  const code = savedCode ?? WAITING_REGISTRATION_CODE

  const handleCancel = () => {
    setIsEditing(false)
    setDraftCode('')
  }

  const handleSubmit = async () => {
    const trimmed = draftCode.trim()
    if (!trimmed || isSaving) return

    setIsSaving(true)
    try {
      const result = await saveCode(trimmed)

      // A backend that answers 200 with `{ ok: false }` must not be treated as a
      // success — otherwise a rejected code gets persisted and the screen locks
      // itself into a code the server never accepted.
      if (result?.ok === false) {
        pushToast('The server rejected that code', 'error')
        return
      }

      setLocalStorageItem(REGISTRATION_CODE_KEY, trimmed)
      setSavedCode(trimmed)
      setDraftCode('')
      setIsEditing(false)
      pushToast('Code saved successfully', 'success')

      // No explicit fetch here: changing `savedCode` re-runs the `initial` fetch
      // inside `usePlayerContent`, which is also what happens on a cold start.
      // Calling it here as well would double-fetch.
    } catch (error) {
      pushToast(describeApiError(error), 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div
        className={
          showContent ? 'registration screen-fade screen-fade--out' : 'registration screen-fade'
        }
        ref={screenRef}
      >
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
              disabled={isSaving}
              onChange={(event) => setDraftCode(event.target.value)}
            />
          ) : (
            <div
              className={
                isSaved
                  ? 'registration__code'
                  : 'registration__code registration__code--waiting'
              }
            >
              {code}
            </div>
          )}

          <div className="registration__actions">
            <button
              type="button"
              className="registration__button"
              onClick={toggle}
            >
              {isFullscreen ? 'Exit' : 'Fullscreen'}
            </button>

            {/*
             * Insert Code is hidden for good once a code is saved — the screen is
             * provisioned at that point, and re-registering is an operator task
             * (clear the code, or use the CMS), not something to expose on a TV.
             */}
            {!isEditing && !isSaved && (
              <button
                type="button"
                className="registration__button registration__button--bordered"
                onClick={() => setIsEditing(true)}
              >
                Insert Code
              </button>
            )}

            {/* Submit and Cancel replace Insert Code. Width comes from
                `.registration__actions`, which every button fills — see the
                note on that rule. */}
            {isEditing && (
              <>
                <button
                  type="button"
                  className="registration__button"
                  disabled={isSaving}
                  onClick={handleSubmit}
                >
                  {isSaving ? 'Saving…' : 'Submit'}
                </button>

                <button
                  type="button"
                  className="registration__button registration__button--bordered"
                  disabled={isSaving}
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </>
            )}
          </div>

          {isLoading && (
            <p className="registration__hint">Loading content…</p>
          )}
        </div>
      </div>

      {content && (
        <div className={showContent ? 'screen-fade' : 'screen-fade screen-fade--out'}>
          <Content {...content} />
        </div>
      )}

      {/*
       * DEV AFFORDANCE — delete before shipping to screens.
       *
       * The frame canvas is `position: fixed` and fills the viewport, and a TV
       * has no reload button, so without this there is no way back to the
       * registration card once content is showing. Closing only hides the frame;
       * polling continues, so the next changed payload brings it back.
       */}
      {showContent && (
        <button
          type="button"
          className="content-close"
          onClick={() => setIsContentHidden(true)}
        >
          Close content
        </button>
      )}

      <ToastHost />
    </>
  )
}

export default Home
