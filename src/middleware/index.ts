import { defineMiddleware } from 'astro:middleware'

/**
 *  ## Middleware
 *
 *  This is the middleware handler for the application where we can specify
 *  if a page exists or not.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  try {
    return await next()
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    console.log('[middleware] error:', err.message)
    return Response.json({ error: true, message: err.message }, { status: 500 })
  }
})
