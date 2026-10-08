import { dismissToast } from '@/infra/toast/store'
import { useToasts } from '@/hooks/useToasts'
import './index.css'

/**
 * Renders the toast queue at the bottom right.
 *
 * Non-interactive on purpose: `pointer-events: none` on the container means a
 * toast can never swallow a click or steal D-pad focus from the buttons behind
 * it. Each toast dismisses itself after `TOAST_DURATION_MS`.
 *
 * `role="status"` + `aria-live="polite"` so a screen reader announces the
 * message without interrupting.
 */
export default function ToastHost() {
  const toasts = useToasts()

  if (!toasts.length) return null

  return (
    <div className="toast-host" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={
            toast.tone === 'error' ? 'toast toast--error' : 'toast toast--success'
          }
          onClick={() => dismissToast(toast.id)}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
