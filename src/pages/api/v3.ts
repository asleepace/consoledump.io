import { createFileBasedStream } from '@/lib/server/v3/file-stream'
import type { APIRoute } from 'astro'

const fileStream = createFileBasedStream({ streamId: 'abc123' })

export const GET: APIRoute = async () => {
  return fileStream
    .then((stream) => stream.subscribe())
    .catch((e) => {
      console.warn('[GET] error subscribing:', e)
      return Response.json({ error: e?.message }, { status: 500 })
    })
}

export const POST: APIRoute = async ({ request }) => {
  const stream = await fileStream
  if (!request.body) return Response.json({ error: 'Missing request body!' }, { status: 400 })
  stream.publish(request.body)
  return Response.json({ ok: true })
}
