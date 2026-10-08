/**
 * Toast queue.
 *
 * Deliberately a module-level store rather than React state: the things that
 * raise toasts (`usePlayerContent`'s polling failure, the save handler) live
 * below the component that renders them, and threading a callback through would
 * couple the API layer to the view.
 *
 * Kept framework-free so it can be unit-tested and imported from anywhere; the
 * React binding is `hooks/useToasts.ts`.
 */

export type ToastTone = 'success' | 'error'

export type Toast = {
  id: number
  message: string
  tone: ToastTone
}

/** How long a toast stays up before it dismisses itself. */
export const TOAST_DURATION_MS = 4000

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()

function emit() {
  for (const listener of Array.from(listeners)) listener()
}

/**
 * `getSnapshot` must return a stable reference while nothing has changed, or
 * `useSyncExternalStore` re-renders forever — hence replacing the array only on
 * a real change.
 */
export const getToasts = (): Toast[] => toasts

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function pushToast(
  message: string,
  tone: ToastTone = 'success',
  durationMs: number = TOAST_DURATION_MS,
): number {
  const id = nextId
  nextId += 1
  toasts = toasts.concat({ id, message, tone })
  emit()

  if (durationMs > 0) {
    window.setTimeout(() => dismissToast(id), durationMs)
  }

  return id
}

export function dismissToast(id: number): void {
  const next = toasts.filter((toast) => toast.id !== id)
  if (next.length === toasts.length) return
  toasts = next
  emit()
}
