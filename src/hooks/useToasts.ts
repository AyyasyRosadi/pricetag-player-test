import { useSyncExternalStore } from 'react'
import {
  getToasts,
  subscribeToasts,
  type Toast,
} from '@/infra/toast/store'

/**
 * Subscribes a component to the toast queue.
 *
 * `useSyncExternalStore` is a React 18 API, not a browser one, so there is no
 * Chromium 47 concern here — it is plain JavaScript by the time it ships.
 */
export function useToasts(): Toast[] {
  return useSyncExternalStore(subscribeToasts, getToasts, getToasts)
}
