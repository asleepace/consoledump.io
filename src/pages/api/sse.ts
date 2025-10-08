import type { APIRoute } from 'astro'
import { Stream2 } from '@/lib/server/stream'
import { sessions } from '@/lib/server/v3'
import { ApiError } from '@/lib/server/v2/api-error'

export const prerender = false

/**
 * HEAD /api/see
 *
 * Creats a new stream and returns the stream id in the request headers,
 * this stream can later be accessed with this id.
 */
export const HEAD: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id')

  if (!id) return new ApiError('Missing required param :id', { id }).toResponse()

  await sessions.getOrCreate(id)

  return new Response(null, {
    status: 200,
    headers: {
      'x-stream-id': String(id),
    },
  })
}

/**
 * GET /api/see?id="<stream_id>"
 *
 * This route returns the current stream with the specified `id`
 * as a text/event-event stream.
 */
export const GET: APIRoute = async ({ url, request }) => {
  const id = url.searchParams.get('id')

  if (!id) return new ApiError('Missing required param :id', { id }).toResponse()

  const stream = await sessions.getOrCreate(id)

  return stream.subscribe()
}

/**
 * POST /api/sse?streamId="<string_id>"
 *
 * This route enables posting data to the MultiplexStream with streamID
 * and the data will be piped to the event stream returned by the GET.
 */
export const POST: APIRoute = async ({ url, request }) => {
  const id = url.searchParams.get('id')
  if (!id) {
    return new ApiError('Missing required param :id', { id }).toResponse()
  }
  if (!request.body) {
    return new ApiError('Missing request body!').toResponse()
  }
  if (request.bodyUsed) {
    return new ApiError('Body already consumed!').toResponse()
  }
  const stream = await sessions.getOrCreate(id)
  stream.publish(request.body)
  return Response.json({ ok: true })
}

export const DELETE: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id')
  if (!id) {
    return new ApiError('Missing required param :id', { id }).toResponse()
  }

  const stream = await sessions.getOrCreate(id)
  await stream.delete()

  return Response.json({ ok: true })
}
