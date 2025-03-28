import { DataStream } from "@/logic/DataStream"
import { useEffect, useMemo, useRef, useState } from "react"
import { useTabId } from "./useTabId"
import { type ConsoleMessage } from "@/components/client/ConsoleContainer"

const toMessage = (data: string): ConsoleMessage => ({
  createdAt: new Date(),
  message: data,
})

/**
 * Hook which connects to a remote data stream for events.
 * @param sessionId
 */
export function useDataStream(sessionId: string) {
  const [messages, setMessages] = useState<ConsoleMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const tabId = useTabId()

  const isAlreadyConnecting = useRef(false)

  useEffect(() => {
    if (!sessionId || !tabId) {
      return
    }

    if (isAlreadyConnecting.current) {
      return
    } else {
      isAlreadyConnecting.current = true
    }

    console.log("[client] connecting to:", { sessionId, tabId })
    const stream = new DataStream({ sessionId, tabId })
    // handle started
    stream.onStart(() => {
      setIsConnected(true)
    })
    // handle events
    stream.onEvent((data) => {
      setMessages((prev) => [...prev, toMessage(data)])
    })
    // handler errors
    stream.onError(() => {
      setIsConnected(false)
    })
    // start the stream
    stream.start()
    return () => {
      console.log("[client] cleanup called!")
      stream.close()
    }
  }, [sessionId, tabId])

  return { messages, isConnected }
}
