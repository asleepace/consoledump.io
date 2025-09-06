import type { APIRoute } from 'astro'

export const GET: APIRoute = async (ctx) => {
  const endpoint = new URL(`/api/sse?id=${ctx.params.slug}`, ctx.site?.origin)
  return await fetch(endpoint, {
    headers: {
      'content-type': 'text/event-stream',
      'keep-alive': 'no',
      Expires: new Date(Date.now() + 500).toUTCString(),
    },
  })
}
