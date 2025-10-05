import type { APIRoute } from 'astro'
import { Stream2 } from '@/lib/server/stream'

export const prerender = false

/**
 * Detect when a request closes and call garbage collection on the stream,
 * and/or stream store.
 */
const registry = new FinalizationRegistry((childId: string) => {
  console.warn('[!] cleanup called on:', childId)
  const [streamId] = childId.split('-')
  const stream = Stream2.store.get(streamId)
  if (!stream) return Stream2.cleanup()
  stream.onChildClosed(childId)
  Stream2.cleanup()
})

const HEADERS = (stream: Stream2, headersInit: HeadersInit = {}) => ({
  ...headersInit,
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'HEAD, GET, POST, PUT, DELETE, OPTIONS',
  'content-type': 'text/event-stream',
  'transfer-encoding': 'chunked',
  'x-accel-buffering': 'no',
  'x-stream-id': stream.id,
})

/**
 * HEAD /api/see
 *
 * Creats a new stream and returns the stream id in the request headers,
 * this stream can later be accessed with this id.
 */
export const HEAD: APIRoute = (ctx) => {
  console.log(ctx.request.headers)

  const stream = Stream2.new()

  return new Response(null, {
    headers: HEADERS(stream),
  })
}

/**
 * GET /api/see?id="<stream_id>"
 *
 * This route returns the current stream with the specified `id`
 * as a text/event-event stream.
 */
export const GET: APIRoute = ({ url, ...ctx }) => {
  const id = url.searchParams.get('id')

  if (!id) {
    return new Response(null, {
      status: 500,
      statusText: 'Missing or invalid stream id:' + id,
    })
  }

  const stream = Stream2.get(id) ?? Stream2.use(id)

  if (!stream || stream.isClosed) {
    return new Response(null, {
      status: 500,
      statusText: `Failed to find stream with id: ${id}`,
    })
  }

  const childStream = stream.pull()
  registry.register(ctx.request, childStream.tagName)
  return childStream.toResponse()
}

/**
 * POST /api/sse?streamId="<string_id>"
 *
 * This route enables posting data to the MultiplexStream with streamID
 * and the data will be piped to the event stream returned by the GET.
 */
export const POST: APIRoute = async ({ url, request }) => {
  Stream2.cleanup()

  const id = url.searchParams.get('id')
  const stream = Stream2.get(id)

  console.log('/api/see incoming:', id, stream)

  if (!request.body || request.bodyUsed) {
    return new Response(null, {
      status: 500,
      statusText: `Invalid request request body`,
    })
  }

  if (!stream || stream.isClosed) {
    return new Response(null, {
      status: 500,
      statusText: `Failed to find stream with id: ${id}`,
    })
  }

  stream.push(request.body).catch((error) => {
    console.warn('[sse] stream push error:', error)
  })

  return new Response(null, {
    status: 200,
    statusText: 'Ok',
    headers: HEADERS(stream),
  })
}

export const DELETE: APIRoute = async ({ url }) => {
  const childId = url.searchParams.get('id')
  console.log('[sse] DELETE:', childId)
  if (!childId) {
    return new Response(null)
  }
  const [streamId] = childId?.split('-')
  const stream = Stream2.get(streamId)
  stream?.onChildClosed(childId)
  Stream2.cleanup()
  return new Response(null)
}
