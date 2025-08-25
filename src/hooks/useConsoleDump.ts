import { useCallback, useEffect, useState } from "react"
import type { ConsoleMessage } from "../components/client/ConsoleContainer"
import { useTabId } from "./useTabId"

export function useConsoleDump(sessionId: string) {
  const [messages, setMessages] = useState<ConsoleMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)

  const addMessage = useCallback((message: string) => {
    console.log("[useConsoleDump] ", message)
    setMessages((prev) => [...prev, { createdAt: new Date(), message }])
  }, [])

  // create a unique for the current tab
  const tabId = useTabId()

  // create event source for tab id
  useEffect(() => {
    if (!tabId) return

    const sessionWithTabId = `/api/${sessionId}?stream=${tabId}`
    addMessage(`connecting to ${sessionWithTabId}`)

    const eventSource = new EventSource(sessionWithTabId)

    eventSource.onerror = (e) => {
      console.warn("[useConsoleDump] error:", e)
      setIsConnected(false)
      addMessage(`an error occured, connection closed...`)
    }

    eventSource.onopen = () => {
      console.log("[useConsoleDump] connected!")
      setIsConnected(true)
    }

    eventSource.onmessage = (e) => {
      addMessage(e.data)
    }

    return () => {
      eventSource.close()
    }
  }, [tabId])

  return {
    isConnected,
    messages,
  }
}
