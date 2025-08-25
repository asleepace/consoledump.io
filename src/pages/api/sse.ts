import type { APIRoute } from 'astro'
import { MultiplexStream } from '@/lib/shared/sse-multiplex'

export const prerender = false

class Streams {
  static manager = new Streams()
  private instances = new Map<MultiplexStream['streamId'], MultiplexStream>()

  public createStream() {
    const streamId = crypto.randomUUID().replaceAll('-', '').slice(8)
    const stream = new MultiplexStream(streamId)
    this.instances.set(stream.streamId, stream)
    return stream
  }

  public getStreamForId(streamId: string) {
    return this.instances.get(streamId)
  }

  public getStreamFor(request: Request) {
    const streamId = new URL(request.url).searchParams.get('streamId')
    if (!streamId) {
      console.log(request)
      throw new Error(`Missing streamId on ${request.method}: ${request.url}`)
    }
    const stream = this.instances.get(streamId)
    if (!stream) throw new Error(`No stream found for streamId: "${streamId}"`)
    return stream
  }
}

/**
 * HEAD /api/sse
 *
 * This route create a new MultiplexStream instance and returns the
 * streamId in the headers as `"X-Stream-ID"`
 */
export const HEAD: APIRoute = ({ request }) => {
  const stream = Streams.manager.createStream()
  return new Response(null, {
    status: 200,
    headers: {
      'X-Stream-ID': stream.streamId,
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

/**
 * GET /api/see?streamId="<stream_id>"
 *
 * This route returns the current stream with the specified streamId
 * as a text/event-event stream.
 */
export const GET: APIRoute = (ctx) => {
  console.log('GET /api/sse:', ctx.request.url)
  const stream = Streams.manager.getStreamFor(ctx.request)
  return stream.toResponse()
}

/**
 * POST /api/sse?streamId="<string_id>"
 *
 * This route enables posting data to the MultiplexStream with streamID
 * and the data will be piped to the event stream returned by the GET.
 */
export const POST: APIRoute = ({ request }) => {
  console.log('[POST] href:', request.url)
  const stream = Streams.manager.getStreamFor(request)
  const taskId = crypto.randomUUID()

  stream.pipeRequest(request)

  return Response.json({ taskId })
}
