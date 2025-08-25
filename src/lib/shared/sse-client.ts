export const X_STREAM_ID = "X-Stream-ID"

export type SSEClientTaskPayload = {
  url: string | URL
  method?: RequestInit["method"]
  body?: BodyInit
  headers?: HeadersInit
}

export type SSEClientEvent = {
  taskId: string
  status: "started" | "chunk" | "completed" | "error"
  data?: any
  error?: string
}

type SSEventLister = (event: SSEClientEvent) => void

export class Err extends Error {
  static INVALID_STREAM_ID(xStreamId?: string | null) {
    throw new Err(
      "err-x-stream-id",
      "invalid or missing stream on headers",
      xStreamId
    )
  }
  static INVALID_CONNECTION(baseURL: string | URL = "") {
    throw new Err(
      "err-stream-connect",
      "failed to connect to stream:",
      baseURL instanceof URL ? baseURL.href : baseURL
    )
  }

  constructor(name: string, ...message: any[]) {
    super(`${name}: ${message.join(" ")}`)
  }
}

/**
 * Create a new SSE stream on the server and get the stream id.
 */
async function creatEventStream(url: URL | string): Promise<string> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
    },
  })
  if (!response.ok) throw Err.INVALID_CONNECTION(url)
  const streamId = response.headers.get(X_STREAM_ID)
  if (!streamId) throw Err.INVALID_STREAM_ID(streamId)
  return streamId
}

/**
 * # Server Side Event Client
 *
 * This class is used to estabish a server-side event stream from the client
 * to the remote host.
 */
export class SSEClient {
  private eventSource: EventSource | null = null
  private streamId: string | null = null
  private listeners: Map<string, SSEventLister[]> = new Map()
  public isConnected = false

  constructor(private baseURL: string = "/api/sse") {}

  async connect() {
    this.streamId = await creatEventStream(this.baseURL)
    this.eventSource = new EventSource(
      `${this.baseURL}?streamId=${this.streamId}`
    )
    this.eventSource.onopen = (ev) => {
      this.isConnected = true
    }
    this.eventSource.onerror = (ev) => {
      this.disconnect()
    }
  }

  async disconnect() {
    if (!this.isConnected) return
    this.isConnected = false
    this.eventSource?.close()
    this.eventSource = null
  }
}
