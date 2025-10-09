import { type ByteChunk } from "./file-stream"

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

  /** encodes data into sse format and triggers `onBroadcastEvent` callback. */
  public broadcast(data: string | object | ByteChunk, {
    type = 'system'
  }: { type?: string }) {
    if (!data) return
    const id = this.lastEventId++
    if (typeof data === 'string' || data instanceof Uint8Array) {
      this.onBroadcastEvent(this.encode({ data, id }))
    } else {
      this.onBroadcastEvent(this.encode({ data: JSON.stringify(data), id }))
    }
  }

  /** encode data as a server-side event. */
  public encode(ev: { id?: string | number, type?: string, data?: string | ByteChunk }) {
      const msgId = ev.id ? `id: ${ev.id}\n` : ""
      const msgType = ev.type ? `event: ${ev.type}\n` : ""
  
      if (typeof ev.data === 'string') {
          return this.textEncoder.encode(`${msgId}${msgType}data: ${ev.data}\n\n`)
      }
  
      if (!ev.data) {
          return this.textEncoder.encode(`${msgId}${msgType}\n`)
      }
  
      // Binary path: wrap Uint8Array with SSE formatting
      const header = this.textEncoder.encode(`${msgId}${msgType}data: `)
      const envelope = new Uint8Array(header.length + ev.data.length + this.trailer.length)
      envelope.set(header)
      envelope.set(ev.data, header.length)
      envelope.set(this.trailer, header.length + ev.data.length)
      return envelope
  }
  
  /** fast transform used in transformer */
  public fastEncode(id: number, data: Uint8Array) {
      const header = this.textEncoder.encode(`id: ${id}\ndata: `)
      const envelope = new Uint8Array(header.length + data.length + this.trailer.length)
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
          }
      })
  }
}
