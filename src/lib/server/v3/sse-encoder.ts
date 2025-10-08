/**
 * Creates a server-side event encoder which is used to re-encode
 * arbitrary bytes as sse messages.
 *
 * Also includes several helper methods for encoding different types
 * of text data like comments, json, plain.
 */
export function createServerSideEventEncoder() {
  const textEncoder = new TextEncoder()
  let eventId = 0
  return {
    encode(message: { data: Uint8Array; id: number; event?: string }): Uint8Array<ArrayBuffer> {
      const evnt = message.event ? `\nevent: ${message.event}` : ''
      const head = textEncoder.encode(`id: ${message.id}${evnt}\ndata: `)
      const tail = textEncoder.encode(`\n\n`)
      const headLength = head.length
      const tailLength = tail.length
      const dataLength = message.data.length
      const buffer = new Uint8Array(headLength + tailLength + dataLength)
      buffer.set(head, 0)
      buffer.set(message.data, headLength)
      buffer.set(tail, headLength + dataLength)
      return buffer
    },
    json(jsonData: object): Uint8Array<ArrayBuffer> {
      return this.text(JSON.stringify(jsonData))
    },
    text(textData: string): Uint8Array<ArrayBuffer> {
      return textEncoder.encode(textData)
    },
    comment(comment: `: ${string}`): Uint8Array<ArrayBuffer> {
      return textEncoder.encode(comment + '\n\n')
    },
    transformToServerSideEvent() {
      return new TransformStream<Uint8Array>({
        transform: (data, controller) => {
          const sse = this.encode({ data, id: eventId++ })
          controller.enqueue(sse)
        },
      })
    },
  }
}
