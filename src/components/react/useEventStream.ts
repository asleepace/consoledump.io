import { StreamMessage } from '@/lib/client/stream-message'
import { Try } from '@asleepace/try'
import { useEffect, useMemo, useState } from 'react'

export type EventStreamConfig = {
  sessionId?: string | undefined
  logEvents?: boolean
  onMessage?: (event: StreamMessage) => any | Promise<any>
}

async function createStreamSession() {
  const resp = await fetch('/api/sse', { method: 'HEAD' })
  const streamId = resp.headers.get('x-stream-id')
  if (!streamId) throw new Error('Invalid stream id header:' + streamId)
  return { streamId }
}

export interface ClientStream {
  sessionId: string | undefined
  childId: string | undefined
  isConnected: boolean
  isError: boolean
  messages: StreamMessage[]
  getLastMessage: () => undefined | StreamMessage
  clear: () => void
  start: () => Promise<any>
  close: () => void
}

function hasChildId(obj: unknown): obj is { childId: string } {
  if (!obj || typeof obj !== 'object') return false
  const childId = (obj as any)?.childId
  return Boolean(childId && typeof childId === 'string')
}

export function useEventStream(config: EventStreamConfig): ClientStream {
  const [sessionId, setSessionId] = useState<string | undefined>(config.sessionId)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isError, setIsError] = useState(false)
  const [messages, setMessages] = useState<StreamMessage[]>([])
  const [childId, setChildId] = useState<string | undefined>()

  /** a method for creating a new sessionId and reseting state. */
  const initializeStream = async () => {
    if (isInitializing) return
    setIsInitializing(true)
    setIsConnected(false)
    setIsError(false)
    const result = await Try.catch(createStreamSession)
    setIsInitializing(false)
    if (result.isOk()) {
      setSessionId(result.value.streamId)
    }
    return result
  }

  useEffect(() => {
    initializeStream()
  }, [])

  /** whenever the sessionId changes we need to reset state and reconnect. */
  const stream = useMemo(() => {
    if (!sessionId) return undefined

    const eventSource = new EventSource(`/api/sse?id=${sessionId}`, {
      withCredentials: true,
    })

    eventSource.onopen = () => {
      console.log('[event-stream] connected!')
      setIsConnected(true)
    }

    eventSource.onmessage = (ev) => {
      if (config.logEvents) console.log(ev.data)

      const message = new StreamMessage(ev.data)

      if (!childId && hasChildId(message?.json)) {
        setChildId(message.json.childId)
      }

      setMessages((prevMessages) => [...prevMessages, message])
      config.onMessage?.(message)
    }

    eventSource.onerror = (ev) => {
      console.warn(`[event-stream] error:`, ev)
      setIsConnected(false)
      setIsError(true)
    }

    return eventSource
  }, [sessionId])

  return {
    sessionId,
    childId,
    isConnected,
    isError,
    messages,
    getLastMessage: () => {
      return messages.at(-1)
    },
    clear: () => {
      setMessages([])
    },
    start: async () => await initializeStream(),
    close: () => {
      stream?.close()
      setIsError(false)
      setIsConnected(false)
      setSessionId(undefined)
      setMessages([])
    },
  }
}
