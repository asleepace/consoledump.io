
/**
 * Callback triggered when the store changes. 
 */
export type CurrentUrlChangedCallback = (href: string) => void | Promise<void>

/**
 * NOTE: This should be set by the backend when first creating a stream.
 * This is then passed to the client.
 */
let sharedCurrentUrl = new URL(import.meta.env.SITE)

/**
 * Shared url store for client & server.
 *
 * @link `src/hooks/useCurrentUrl`
 */
export const urlStore = {
  setCurrentHref(sessionId: SessionId) {
    if (!sessionId) return
    const url = new URL(`/${sessionId}`, import.meta.env.SITE)
    console.log('[url-store] href (server):', url.href)
    sharedCurrentUrl = url
  },
  /**
   * Gets the url on the server from the `sessionIdCache`
   *
   * @note this method is backend only.
   */
  getServerSnapshot() {
    return sharedCurrentUrl // must use cached ref!
  },
  getSnapshot() {
    return sharedCurrentUrl
  },
  subscribe(callback: () => void) {
    window.addEventListener('popstate', callback)
    window.addEventListener('pushstate', callback)
    window.addEventListener('replacestate', callback)
    return () => {
      window.removeEventListener('popstate', callback)
      window.removeEventListener('pushstate', callback)
      window.removeEventListener('replacestate', callback)
    }
  },
}
