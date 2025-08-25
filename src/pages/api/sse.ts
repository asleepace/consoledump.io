import type { APIRoute } from 'astro'
import { Stream2 } from '@/lib/server/stream'

export const prerender = false

const HEADERS = (stream: Stream2, headersInit: HeadersInit = {}) => ({
  ...headersInit,
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
export const HEAD: APIRoute = () => {
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
export const GET: APIRoute = ({ url }) => {
  const id = url.searchParams.get('id')

  if (!Stream2.has(id)) {
    const stream = Stream2.use(id)
    return stream.toReqponse()
  }

  const stream = Stream2.get(id)

  if (!stream || stream.isClosed) {
    return new Response(null, {
      status: 500,
      statusText: `Failed to find stream with id: ${id}`,
    })
  }

  stream.json({ status: 'client-connected', streamId: id })

  return stream.toReqponse()
}

/**
 * POST /api/sse?streamId="<string_id>"
 *
 * This route enables posting data to the MultiplexStream with streamID
 * and the data will be piped to the event stream returned by the GET.
 */
export const POST: APIRoute = async ({ url, request }) => {
  const id = url.searchParams.get('id')
  const stream = Stream2.get(id)

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
