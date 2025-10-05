import { StreamMessage } from '@/lib/client/stream-message'
import { Try } from '@asleepace/try'
import { useMemo, useState } from 'react'
import { useClient } from './useClient'

export type EventStreamConfig = {
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

function getSessionIdFromPath(path: string | undefined): string | undefined {
  if (!path || path === '/') return undefined
  const maybeSessionId = path.slice(1)?.trim()
  return maybeSessionId
}

function hasChildId(obj: unknown): obj is { childId: string } {
  if (!obj || typeof obj !== 'object') return false
  const childId = (obj as any)?.childId
  return Boolean(childId && typeof childId === 'string')
}

export function useEventStream(config: EventStreamConfig): ClientStream {
  const [isInitializing, setIsInitializing] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isError, setIsError] = useState(false)
  const [messages, setMessages] = useState<StreamMessage[]>([])
  const [childId, setChildId] = useState<string | undefined>()

  /** extracts the sessionId from current url. */
  const client = useClient()

  /** a method for creating a new sessionId and reseting state. */
  const initializeStream = async () => {
    if (isInitializing) return
    console.log('[useEventStream] initializing...')
    setIsInitializing(true)
    setIsConnected(false)
    setIsError(false)
    const result = await Try.catch(createStreamSession)
    setIsInitializing(false)
    if (result.isOk()) {
      client.redirectTo(`/${result.value.streamId}`)
    }
    return result
  }

  /** whenever the sessionId changes we need to reset state and reconnect. */
  const stream = useMemo(() => {
    if (!client.sessionId) return undefined

    const eventSource = new EventSource(`/api/sse?id=${client.sessionId}`, {
      withCredentials: true,
    })

    eventSource.onopen = () => {
      console.log('[event-stream] connected!')
      setIsConnected(true)
    }

    eventSource.onmessage = (ev) => {
      // @note log events
      console.log(ev.data)

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
  }, [client.sessionId])

  return {
    sessionId: client.sessionId,
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
      setMessages([])
    },
  }
}
