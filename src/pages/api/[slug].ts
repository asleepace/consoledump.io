import type { APIRoute } from 'astro'

export const prerender = false

const subscriptions = new Map<string, (data: string) => void>()

/**
 * Handle POST messages to this route.
 */
export const GET: APIRoute = async (context) => {
  const url = new URL(context.request.url)
  const sessionId = url.pathname
  console.log('[api] starting sessionId:', sessionId)

  const stream = new ReadableStream({
    start(controller) {
      console.log('[api] controller started!')

      const encoder = new TextEncoder()
      let lastEventId = 0

      const pipeToStream = (data: string) => {
        controller.enqueue(
          encoder.encode(`id: ${lastEventId++}\ndata: ${data}\n\n`)
        )
      }

      subscriptions.set(sessionId, pipeToStream)
      pipeToStream(`connected to ${sessionId}`)
    },
    cancel() {
      console.log('[api] deleting session!')
      subscriptions.delete(sessionId)
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
    status: 200,
  })
}

/**
 * Handle POST messages to this route.
 */
export const POST: APIRoute = async (context) => {
  console.log('[api] slug:', context)
  const url = new URL(context.request.url)
  const sessionId = url.pathname

  const pipeToStream = subscriptions.get(sessionId)

  if (!pipeToStream)
    return Response.json({ error: 'Stream not found!' }, { status: 404 })

  const text = await context.request.text()
  pipeToStream(text)

  return Response.json({ success: true })
}
