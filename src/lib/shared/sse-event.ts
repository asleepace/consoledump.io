export class SSEStream {
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null
  private textEncoder = new TextEncoder()
  private eventId = 0
  public isConnected = false

  public readonly response: Response

  constructor(private eventType?: string) {
    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.controller = controller
        this.isConnected = true
      },
      cancel: () => {
        this.cleanup()
      },
    })

    this.response = new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    })
  }

  sendEvent(data: any): void {
    if (!this.isConnected || !this.controller) return
    const eventType = this.eventType ? `event: ${this.eventType}\n` : ""
    const eventId = `id: ${this.eventId++}\n`
    const eventData = `data: ${JSON.stringify(data)}\n\n`
    const fullEvent = eventType + eventId + eventData
    this.controller.enqueue(this.textEncoder.encode(fullEvent))
  }

  close(): void {
    if (this.controller && this.isConnected) {
      this.controller.close()
    }
    this.cleanup()
  }

  private cleanup(): void {
    this.isConnected = false
    this.controller = null
  }
}
