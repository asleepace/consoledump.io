import { defineMiddleware } from "astro:middleware"

/**
 *  ## Middleware
 *
 *  This is the middleware handler for the application where we can specify
 *  if a page exists or not.
 */
export const onRequest = defineMiddleware((context, next) => {
  const url = new URL(context.request.url)
  const method = context.request.method
  const path = url.pathname
  context.locals.sessions ??= new Map()
  context.locals.sessions.set(path, {})
  return next()
})
