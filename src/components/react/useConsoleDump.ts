import { ConsoleDumpSource } from '@/lib/client/console-dump-source'
import { useEffect, useMemo, useRef } from 'react'
import { useClient } from './useClient'

function getSessionId() {
  if (typeof window === 'undefined') return undefined
  return window?.location.pathname.slice(1).split('/').at(0)
}

export function useConsoleDump() {
  const client = useClient()

  useEffect(() => {
    if (!client.sessionId) return
    new ConsoleDumpSource({
      sessionId: client.sessionId,
      onMessage: (ev) {},
    })
  }, [client.sessionId])
}
