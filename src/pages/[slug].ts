import type { APIRoute } from 'astro'

export const prerender = false

/**
 * GET /[slugId]
 *
 * This endpoint returns the session client which can be browsed.
 */
export const GET: APIRoute = (context) => {
  const url = new URL(context.request.url)
  console.log('[GET] endpoint hit:', url.href)
  return context.rewrite('/session')
}

/**
 * POST /[slugId]
 *
 * Pipe data to the input.
 *
 */
export const POST: APIRoute = (context) => {
  const url = new URL(context.request.url)
  console.log('[POST] endpoint hit:', url.href)
  const sessionId = url.pathname
  return Response.json({ ok: true, helloWorld: 123, sessionId })
}
