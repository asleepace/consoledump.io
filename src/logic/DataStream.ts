import { isValidSessionId } from "@/lib/server/generateSessionId"

type DataStreamArgs = {
  sessionId: string
  tabId: string
}

export class ErrorInvalidStream extends Error {
  public readonly name = "ERR_INVALID_STREAM_ID"
  constructor(streamId: string, ...args: any[]) {
    super(`Invalid stream id: "${streamId}" ${args.join(" ")}`)
  }
}

/**
 * # Data Stream
 *
 * This is the custom class which handles the text-event/stream from the client
 * to the backend.
 *
 * @param {String} sessionId - the idea of the session to connect.
 * @param {String} tabId - unique id of tab user is on.
 *
 */
export class DataStream {
  public readonly createdAt = new Date()
  public updatedAt = new Date()

  #status: "init" | "open" | "error" | "closed" = "init"
  #url: URL
  #eventSource: EventSource | undefined
  #headers: HeadersInit = Object.freeze({
    "Content-Type": "text/event-stream",
  })
  #messages = []
  #callbacks = {
    onStart: () => {},
    onClose: () => {},
    onEvent: (message: string) => {},
    onError: () => {},
  }

  constructor({ sessionId, tabId }: DataStreamArgs) {
    if (!isValidSessionId(sessionId)) {
      throw new ErrorInvalidStream(sessionId, "on DataStream")
    }
    const url = new URL(`/api/${sessionId}`, window.location.origin)
    url.searchParams.set("stream", String(tabId))
    this.#url = url
  }

  private handleEvent(ev: MessageEvent): any {
    console.log("[DataStream] event:", ev.data)
    this.#callbacks.onEvent(ev.data)
  }

  private handleStart(ev: Event): any {
    console.log("[DataStream] connected!")
    this.#callbacks.onStart()
  }

  private handleError(ev: Event): any {
    console.warn("[DataStream] error:", ev)
    this.#callbacks.onError()
  }

  // lifecycle methods

  start() {
    console.log("[DataStream] starting:", this.#url.href)
    this.#eventSource = new EventSource(this.#url)
    this.#eventSource.onopen = (e) => {
      this.#status = "open"
      this.updatedAt = new Date()
      console.log("[DataStream] on open!")
      this.handleStart(e)
    }
    this.#eventSource.onerror = (e) => {
      this.updatedAt = new Date()
      this.#status = "error"
      console.log("[DataStream] error:", e)
      this.handleError(e)
    }
    this.#eventSource.onmessage = (e) => {
      this.updatedAt = new Date()
      this.handleEvent(e)
    }
  }

  isOpen() {
    if (!this.#eventSource) return false
    return this.#eventSource.readyState === this.#eventSource.OPEN
  }

  getStatus() {
    return this.#status
  }

  async close() {
    if (!this.isOpen()) return
    console.log("[DataStream] closing!")
    this.#eventSource?.close()
    return fetch(this.#url, { method: "DELETE", headers: this.#headers })
      .then((res) => {
        console.log(
          "[DataStream] deleted remote session:",
          res.status,
          this.#url
        )
      })
      .catch((err) => {
        console.warn(
          "[DataStream] error deleting remote sesison:",
          this.#url,
          err
        )
      })
      .finally(() => {
        this.#eventSource = undefined
        this.#callbacks.onClose()
        this.#status = "closed"
      })
  }

  // special setters

  onStart(callback: () => void) {
    this.#callbacks.onStart = callback
  }

  onEvent(callback: (message: string) => void) {
    this.#callbacks.onEvent = callback
  }

  onError(callback: () => void) {
    this.#callbacks.onError = callback
  }
}
