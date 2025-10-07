import { getStreamContext } from '@/lib/server/v2/event-stream'
import type { APIRoute } from 'astro'

const HEADERS_WITH_CORS: HeadersInit = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

function errorResponse(options: { status: number; statusText: string }) {
  return Response.json(
    {
      error: options.statusText,
      status: options.status,
    },
    { status: options.status ?? 500, statusText: options.statusText }
  )
}

export const GET: APIRoute = (ctx) => {
  const streamId = ctx.url.searchParams.get('id')
  console.log('[v2] GET streamId:', streamId)
  if (!streamId) return errorResponse({ status: 405, statusText: 'Missing streamId.' })

  const session = getStreamContext()

  if (!session.hasStream(streamId)) {
    session.newStream(streamId)
  }

  const stream = session.getStream(streamId)
  if (!stream) return errorResponse({ status: 404, statusText: 'Stream not found.' })

  return new Response(stream.pull(), {
    headers: {
      'Content-Type': 'text/event-stream',
      'X-Accel-Buffering': 'no',
    },
  })
}

export const POST: APIRoute = async (ctx) => {
  const streamId = ctx.url.searchParams.get('id')
  console.log('[v2] POST streamId:', streamId)
  if (!streamId) return errorResponse({ status: 405, statusText: 'Missing streamId.' })
  if (!ctx.request.body) return errorResponse({ status: 500, statusText: 'Missing POST body.' })

  const session = getStreamContext()
  const stream = session.getStream(streamId)
  if (!stream) return errorResponse({ status: 404, statusText: 'Stream not found.' })

  await stream.push(ctx.request.body)
  return new Response(null, {
    status: 200,
  })
}

export const OPTIONS: APIRoute = async () => {
  console.log('[v2] OPTIONS called!')
  return new Response(null, {
    headers: HEADERS_WITH_CORS,
  })
}
