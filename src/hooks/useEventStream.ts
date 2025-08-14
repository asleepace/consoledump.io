import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Try } from "@asleepace/try"

type EventStreamStatus = "open" | "closed" | "error" | "message"

export interface EventStreamConfig {
  sessionId: string
  tabId: string
}

export interface EventStreamOptions extends EventStreamConfig {
  on?(type: EventStreamStatus, ev: Event): void
  onMessageHook?(message: string): string
}

export const getUrl = ({ sessionId, tabId }: EventStreamConfig) => {
  const endpoint = new URL(`/api/${sessionId}`, window.location.origin)
  endpoint.searchParams.set("tabId", tabId)
  return endpoint
}

export const getEventSource = ({ sessionId, tabId }: EventStreamConfig) => {
  return Try.catch(() => {
    return new EventSource(getUrl({ sessionId, tabId }), {
      withCredentials: true,
    })
  })
}

export function isMessageEvent(ev: Event): ev is MessageEvent {
  return "data" in ev && ev.data != null
}

export function safeEncode(data: unknown): string {
  try {
    if (!data) return String(data)
    if (typeof data === "number") return String(data)
    if (typeof data === "boolean") return String(data ? "true" : "false")
    if (typeof data === "function") return String(`[Function ${data.name}]`)
    if (Array.isArray(data)) {
      return JSON.stringify(data.map(safeEncode), null, 2)
    } else if (typeof data === "object") {
      const [json, err1] = Try.catch(() => JSON.stringify(data, null, 2))
      if (json) return json
    }
    if (typeof data === "object" && "toString" in data) return data.toString()
    return String(data)
  } catch (e) {
    if (typeof data === "function") return `[Function unknown]`
    if (Array.isArray(data)) {
      return `[${data.join(",")}]`
    }
    return String(data)
  }
}

const mapToStream = (...args: any[]): string => {
  const [msg1, err1] = Try.catch(() => {
    return JSON.stringify(args, null, 2)
  })
  if (!err1) return msg1
  const [msg2, err2] = Try.catch(() => safeEncode(args))
  return msg2 ?? String(err2 || err1)
}

/**
 * # useEventStream({ sessionId, tabId, on? })
 *
 * Estaslishes a connection to the specified data stream and allows for two-way
 * communication via the publish method. Returns an object with messages, status
 * and several lifecycle methods.
 */
export function useEventStream({ sessionId, tabId, on }: EventStreamOptions) {
  const [resetKey, setResetKey] = useState(0)
  const [createdAt, setCreatedAt] = useState(new Date())
  const [updatedAt, setUpdatedAt] = useState(new Date())
  const [status, setStatus] = useState<EventStreamStatus>("closed")
  const [messages, setMessages] = useState<string[]>([])
  const [eventSource, eventError] = useMemo(
    () => getEventSource({ sessionId, tabId }),
    [sessionId, tabId]
  )

  const publishHref = useMemo(
    () => getUrl({ sessionId, tabId }),
    [sessionId, tabId]
  )
  const callbackRef = useRef(on)

  const resetStream = useCallback(() => {
    setStatus("closed")
    setCreatedAt(new Date())
    setUpdatedAt(new Date())
    setMessages([])
    setResetKey((prev) => prev + 1)
    eventSource?.close()
  }, [eventSource])

  const publish = useCallback(
    (...args: any[]) => {
      return fetch(publishHref, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Encoding": "json[]",
        },
        body: JSON.stringify([safeEncode(args)]),
      })
    },
    [publishHref]
  )

  const onEventCallback = useCallback(
    (status: EventStreamStatus, ev: Event) => {
      Try.catch(() => {
        setUpdatedAt(new Date())
        setStatus(status)
        if (status === "message" && isMessageEvent(ev)) {
          setMessages((prev) => [...prev, ev.data])
          callbackRef.current?.(status, ev)
        } else {
          callbackRef.current?.(status, ev)
        }
      })
    },
    []
  )

  useEffect(() => {
    if (!eventSource) return
    eventSource.onopen = (ev) => onEventCallback("open", ev)
    eventSource.onerror = (ev) => onEventCallback("error", ev)
    eventSource.onmessage = (ev) => onEventCallback("message", ev)
  }, [eventSource, onEventCallback])

  return useMemo(
    () => ({
      messages,
      updatedAt,
      createdAt,
      resetStream,
      publish,
      status,
    }),
    [messages]
  )
}
