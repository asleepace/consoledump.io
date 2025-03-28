type DataStreamArgs = {
  sessionId: string
  tabId: string
}

export class DataStream {
  public sessionId: string
  public tabId: string
  public apiPath: string
  public eventSource: EventSource | undefined

  private callbacks = {
    onStart: () => {},
    onClose: () => {},
    onEvent: (message: string) => {},
    onError: () => {},
  }

  constructor({ sessionId, tabId }: DataStreamArgs) {
    this.sessionId = sessionId
    this.tabId = tabId
    this.apiPath = `/${this.sessionId}?stream=${this.tabId}`
  }

  private handleEvent(ev: MessageEvent): any {
    console.log("[DataStream] event:", ev.data)
    this.callbacks.onEvent(ev.data)
  }

  private handleStart(ev: Event): any {
    console.log("[DataStream] connected!")
    this.callbacks.onStart()
  }

  private handleError(ev: Event): any {
    console.warn("[DataStream] error!")
    this.callbacks.onError()
  }

  // lifecycle methods

  start() {
    console.log("[DataStream] starting:", this.apiPath)
    this.eventSource = new EventSource(this.apiPath)
    this.eventSource.onopen = (e) => {
      console.log("[DataStream] on open!")
      this.handleStart(e)
    }
    this.eventSource.onerror = (e) => {
      this.handleError(e)
    }
    this.eventSource.onmessage = (e) => {
      this.handleEvent(e)
    }
  }

  isOpen() {
    if (!this.eventSource) return false
    return this.eventSource.readyState === this.eventSource.OPEN
  }

  async close() {
    if (!this.isOpen()) return
    console.log("[DataStream] closing!")
    this.eventSource?.close()
    return fetch(this.apiPath, { method: "DELETE" })
      .then((res) => {
        console.log("[DataStream] deleted remote session:", res.status)
      })
      .catch((err) => {
        console.warn("[DataStream] error deleting remote sesison:", err)
      })
      .finally(() => {
        this.eventSource = undefined
        this.callbacks.onClose()
      })
  }

  // special setters

  onStart(callback: () => void) {
    this.callbacks.onStart = callback
  }

  onEvent(callback: (message: string) => void) {
    this.callbacks.onEvent = callback
  }

  onError(callback: () => void) {
    this.callbacks.onError = callback
  }
}
