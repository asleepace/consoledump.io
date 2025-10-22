import { Try } from '@asleepace/try'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useClient } from './useClient'
import { z } from 'astro/zod'

async function createStreamSession() {
  const resp = await fetch('/api/sse', { method: 'HEAD' })
  const streamId = resp.headers.get('x-stream-id')
  if (!streamId) throw new Error('Invalid stream id header:' + streamId)
  return { streamId }
}

const SessionMetaSchema = z
  .object({
    clientId: z.string(),
    streamId: z.string(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    clients: z.number(),
  })
  .passthrough()

const parseSessionMetadata = z.string().transform((str) => {
  const json = JSON.parse(str)
  return SessionMetaSchema.parse(json)
})

const FLAG_DISABLE_CLEANUP = true

export type SessionMeta = z.infer<typeof SessionMetaSchema>

export interface ClientStream {
  sessionId: string | undefined
  isConnected: boolean
  isError: boolean
  events: MessageEvent<string>[]
  meta: SessionMeta | undefined
  clear: () => void
  start: () => Promise<any>
  close: () => void
}

export function useEventStream(): ClientStream {
  const [isInitializing, setIsInitializing] = useState(false)
  const [isConnected, setIsConnected] = useState(true) // start as true
  const [isError, setIsError] = useState(false)

  const [events, setEvents] = useState<MessageEvent<string>[]>([])
  const [meta, setMeta] = useState<SessionMeta | undefined>()

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
    if (!meta) return
    if (FLAG_DISABLE_CLEANUP) return
    window.addEventListener('beforeunload', () => {
      const cleanupCallbackUrl = new URL('/api/sse', window.location.origin)
      cleanupCallbackUrl.searchParams.set('id', meta.streamId)
      cleanupCallbackUrl.searchParams.set('client', meta.clientId)
      console.log('[session] cleanup called:', cleanupCallbackUrl.href)

      fetch(cleanupCallbackUrl, { method: 'DELETE' })
        .then(() => '[cleanup] called!')
        .catch((e) => console.warn('[cleanup] err:', e))
    })
  }, [meta])

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
      console.log('[console-dump] system:', ev.data)
      setEvents((prev) => [...prev, ev])
    })

    eventSource.onopen = () => {
      setIsConnected(true)
    }

    let currentId = 0

    function parseSessionMeta(ev: MessageEvent<string>) {
      try {
        const json = JSON.parse(ev.data)
        const data = SessionMetaSchema.parse(json)
        setMeta(data)
      } catch (e) {
        console.warn('[session] failed to parse metadata:', e)
      }
    }

    eventSource.onmessage = (ev) => {
      // NOTE: important the firs message should contain metadata
      // about the stream and client.
      if (currentId++ === 0) {
        parseSessionMeta(ev)
      } else {
        setEvents((prev) => [...prev, ev])
      }
    }

    eventSource.onerror = (ev: any) => {
      console.warn(`[event-stream] error:`, ev)
      setIsConnected(false)
      setIsError(true)
    }

    return eventSource
  }, [client.sessionId])

  return {
    sessionId: client.sessionId,
    isConnected,
    isError,
    events,
    meta,
    clear: useCallback(() => {
      setEvents([])
    }, []),
    start: async () => await initializeStream(),
    close: useCallback(() => {
      stream?.close()
      setIsError(false)
      setIsConnected(false)
      setEvents([])
    }, []),
  }
}
