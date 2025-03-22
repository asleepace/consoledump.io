import { useCallback, useEffect, useState } from 'react'
import type { ConsoleMessage } from './ConsoleContainer'

export function useConsoleDump(sessionId: string) {
  const [messages, setMessages] = useState<ConsoleMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)

  const addMessage = useCallback((message: string) => {
    setMessages((prev) => [...prev, { createdAt: new Date(), message }])
  }, [])

  useEffect(() => {
    const eventSource = new EventSource(`/api/${sessionId}`)

    eventSource.onerror = (e) => {
      console.warn('[useConsoleDump] onError:', e)
      setIsConnected(false)
      addMessage(`error: ${e}`)
    }

    eventSource.onopen = (e) => {
      console.log('[useConsoleDump] onOpen:', e)
      setIsConnected(true)
      addMessage('connected!')
    }

    eventSource.onmessage = (e) => {
      console.log('[useConsoleDump] onMessage:', e)
      addMessage(e.data)
    }

    return () => {
      eventSource.close()
    }
  }, [])

  return {
    isConnected,
    messages,
  }
}
