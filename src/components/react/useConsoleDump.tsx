import { Try } from '@asleepace/try'
import { useCallback, useEffect, useState } from 'react'

/**
 * Returns the url for the current session.
 * @note client only.
 */
export function getSessionUrl(): URL | undefined {
  if (typeof window === 'undefined') return
  return new URL(window.location.href)
}

export function dump(...args: any[]) {
  return fetch(window.location.href, {
    method: 'POST',
    body: JSON.stringify(args),
  })
}

export function useConsoleDump(params: { sessionId?: string }) {
  const [sessionId, setSessionId] = useState(params.sessionId)
  const [sessionUrl, setSessionUrl] = useState<URL | undefined>(undefined)

  useEffect(() => {
    if (sessionId) return
    const url = getSessionUrl()
    const id = url?.pathname.slice(1)
    if (!id) return
    setSessionId(id)
  }, [])

  useEffect(() => {
    if (!sessionId) return
    const url = new URL(window.location.href)
    const targetUrl = new URL(`/${sessionId}`, url)
    setSessionUrl(targetUrl)
  }, [sessionId])

  return useCallback(
    async (...args: any[]) => {
      if (!sessionUrl) return console.warn('[useConsoleDump] not initialized!')
      await fetch(sessionUrl, { method: 'POST', body: JSON.stringify(args) })
    },
    [sessionUrl]
  )
}
