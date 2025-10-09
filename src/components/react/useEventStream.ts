import { Try } from '@asleepace/try'
import { useEffect, useMemo, useState } from 'react'
import { useClient } from './useClient'

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
  events: MessageEvent<string>[]
  meta: Record<string, any>
  clear: () => void
  start: () => Promise<any>
  close: () => void
}


export function useEventStream(): ClientStream {
  const [isInitializing, setIsInitializing] = useState(false)
  const [isConnected, setIsConnected] = useState(true) // start as true
  const [isError, setIsError] = useState(false)
  const [childId, setChildId] = useState<string | undefined>()

  const [events, setEvents] = useState<MessageEvent<string>[]>([])
  const [meta, setMeta] = useState<Record<string, any>>({})

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

  useEffect(() => {
    if (events.length === 0) return
    if (Object.keys(meta).length !== 0) return
    const maybeMeta = Try.catch(() => JSON.parse(events[0].data))
    if (!maybeMeta.ok) return
    console.log('[meta] stream:', maybeMeta.value)
    setMeta(maybeMeta.value)
  }, [events, meta])

  /** whenever the sessionId changes we need to reset state and reconnect. */
  const stream = useMemo(() => {
    if (!client.sessionId) return undefined

    const eventSource = new EventSource(`/api/sse?id=${client.sessionId}`, {
      withCredentials: true,
    })

    /** 
     * subscribe to custom "system" events send by backend.
     * @see ServerSideEventEncoder
     */
    eventSource.addEventListener('system', (ev) => {
      console.warn('[event-stream] system:', ev.data)
      setEvents((prev) => [...prev, ev])
    })

    eventSource.onopen = () => {
      console.log('[event-stream] connected!')
      setIsConnected(true)
    }

    let currentId = 0

    eventSource.onmessage = (ev) => {
      // NOTE: important the firs message should contain metadata
      // about the stream and client.
      if (currentId++ === 0) {
        const metaEvent = new MessageEvent('client', {
          data: JSON.parse(ev.data)
        })
        setEvents((prev) => [metaEvent])
        setMeta(metaEvent)
      } else {
        setEvents((prev) => [...prev, ev])
      }

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
    events,
    meta,
    clear: () => {
      setEvents([])
    },
    start: async () => await initializeStream(),
    close: () => {
      stream?.close()
      setIsError(false)
      setIsConnected(false)
      setEvents([])
    },
  }
}
