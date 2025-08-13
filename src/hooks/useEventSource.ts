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
    return new EventSource(getUrl({ sessionId, tabId }))
  })
}

export function isMessageEvent(ev: Event): ev is MessageEvent {
  return "data" in ev && ev.data != null
}

export function useEventSource({ sessionId, tabId, on }: EventStreamOptions) {
  const [status, setStatus] = useState<EventStreamStatus>("closed")
  const [message, setMessages] = useState<string[]>([])
  const [eventSource, eventError] = useMemo(
    () => getEventSource({ sessionId, tabId }),
    [sessionId, tabId]
  )

  const callbackRef = useRef(on)

  const onEventCallback = useCallback(
    (status: EventStreamStatus, ev: Event) => {
      Try.catch(() => {
        setStatus(status)
        callbackRef.current?.(status, ev)

        if (status === "message" && isMessageEvent(ev)) {
          setMessages((prev) => [...prev, ev.data])
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

  return
}
