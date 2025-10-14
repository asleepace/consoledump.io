import { type ByteChunk } from './stream'

/**
 * Encodes a server-side event message.
 *
 * Takes a callback which is triggered when broadcast is called,
 *
 */
export class ServerSideEventEncoder {
  private textEncoder = new TextEncoder()
  private trailer = this.textEncoder.encode('\n\n')
  public lastEventId = 0

  constructor(public onBroadcastEvent: (chunk: ByteChunk) => void) {}

  /**
   * Sends a server-side event with type `"system"` and optional JSON data.
   *
   * @param {string} eventName description of event added.
   * @param {object} eventData optional event data.
   *
   * NOTE: this does not include an `"id"` field and will not show up as part
   * of the text/event-stream.
   *
   * ```ts
   * const eventSource = new EventSource('/abc123')
   *
   * eventSource.addEventListener('system', (ev) => {
   *   const systemMsg = JSON.parse(ev.data)
   *   console.log(systemMsg.eventName)
   *   console.log(systemMsg.eventData.childId)
   * })
   * ```
   */
  public sendSystemEvent(eventName: string, eventData?: object) {
    this.onBroadcastEvent(
      this.encode({
        type: 'system',
        data: JSON.stringify({ eventName, eventData }),
      })
    )
  }

  /** encodes data into sse format and triggers `onBroadcastEvent` callback. */
  public broadcastEvent(type: string): void
  public broadcastEvent(type: string, data: object): void
  public broadcastEvent(data: object): void
  public broadcastEvent(typeOrData: string | object, data?: object): void {
    const id = this.lastEventId++
    if (typeof typeOrData === 'object') {
      this.onBroadcastEvent(
        this.encode({ id, data: JSON.stringify(typeOrData) })
      )
      return
    }
    if (typeof typeOrData === 'string' && !data) {
      this.onBroadcastEvent(this.encode({ id, type: typeOrData }))
    }

    this.onBroadcastEvent(
      this.encode({ id, type: typeOrData, data: JSON.stringify(data) })
    )
  }

  /** encode data as a server-side event. */
  public encode(ev: {
    id?: string | number
    type?: string
    data?: string | ByteChunk
  }) {
    const msgId = ev.id ? `id: ${ev.id}\n` : ''
    const msgType = ev.type ? `event: ${ev.type}\n` : ''

    if (typeof ev.data === 'string') {
      return this.textEncoder.encode(`${msgId}${msgType}data: ${ev.data}\n\n`)
    }

    if (!ev.data) {
      return this.textEncoder.encode(`${msgId}${msgType}\n`)
    }

    // Binary path: wrap Uint8Array with SSE formatting
    const header = this.textEncoder.encode(`${msgId}${msgType}data: `)
    const envelope = new Uint8Array(
      header.length + ev.data.length + this.trailer.length
    )
    envelope.set(header)
    envelope.set(ev.data, header.length)
    envelope.set(this.trailer, header.length + ev.data.length)
    return envelope
  }

  /** fast transform used in transformer */
  public fastEncode(id: number, data: Uint8Array) {
    const header = this.textEncoder.encode(`id: ${id}\ndata: `)
    const envelope = new Uint8Array(
      header.length + data.length + this.trailer.length
    )
    envelope.set(header)
    envelope.set(data, header.length)
    envelope.set(this.trailer, header.length + data.length)
    return envelope
  }

  /** get a transform stream which formats chunks to sse format. */
  public getServerSideEventTransformer() {
    return new TransformStream({
      transform: (chunk, cntrl) => {
        cntrl.enqueue(this.fastEncode(this.lastEventId++, chunk))
      },
    })
  }
}
