import { useCallback, useEffect, useMemo, useState } from 'react'

export type Client = {
  sessionId: string | undefined
  window: Window | undefined
  url: URL | undefined
  redirectTo: (path: string) => void
}

/**
 * Hook which returns client specific data like the window,
 * current url, sessionId, etc.
 *
 * @note client-only
 */
export function useClient() {
  const [client, setClient] = useState<Client>({
    window: undefined,
    url: undefined,
    sessionId: undefined,
    redirectTo: () => {},
  })

  /** set window, url and sessionId on mount. */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const sessionId = url.pathname.slice(1)
    setClient({
      window: window,
      url,
      sessionId,
      redirectTo(path) {
        window.location.pathname = path
      },
    })
  }, [])

  return client
}
