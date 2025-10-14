import { useSyncExternalStore } from 'react'
import { urlStore } from '@/lib/shared/url-store'

/**
 * Hook which returns the current href and handles server-side state.
 * 
 * @note make sure to set the current href on the server too!
 * 
 * @link `@/lib/shared/url-store.ts`
 */
export function useCurrentUrl() {
  return useSyncExternalStore(
    urlStore.subscribe,
    urlStore.getSnapshot,
    urlStore.getServerSnapshot
  )
}
