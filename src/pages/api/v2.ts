import { ApiError } from '@/lib/server/v2/api-error'
import { getStreamContext } from '@/lib/server/v2/event-stream'
import type { APIRoute } from 'astro'

/**
 *  OPTIONS /api/v2
 *
 *  Handle CORS response.
 */
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    },
  })
}

/**
 *  GET /api/v2?id=<stream_id>
 *
 *  Returns current stream for the specified id.
 */
export const GET: APIRoute = async ({ url }) => {
  const streamId = url.searchParams.get('id')
  if (!streamId) {
    return new ApiError('Missing required parameter "id".').toResponse({ status: 400 })
  }
  return getStreamContext().getStreamResponse(streamId)
}

export const POST: APIRoute = async ({ url, request }) => {
  const streamId = url.searchParams.get('id')
  if (!streamId) {
    return new ApiError('Missing required parameter "id".').toResponse({ status: 400 })
  }
  if (!request.body || request.bodyUsed) {
    return new ApiError('Missing or invalid request body.').toResponse({ status: 400 })
  }
  const stream = getStreamContext().getStream(streamId)
  if (!stream) {
    return new ApiError('Stream not found.', { method: 'POST', streamId }).toResponse({ status: 404 })
  }
  if (stream.isClosed) {
    return new ApiError('Stream is closed.', { method: 'POST' }).toResponse({ status: 410 })
  }
  stream.push(request.body).catch((err) => {
    console.warn('[v2] error pushing stream:', err)
  })
  return Response.json({ ok: true })
}
