import { defineMiddleware } from "astro:middleware"

/**
 *  ## Middleware
 *
 *  This is the middleware handler for the application where we can specify
 *  if a page exists or not.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url)
  const method = context.request.method
  const path = url.pathname
  context.locals.sessions ??= new Map()
  context.locals.sessions.set(path, {})
  // Add basic caching for static assets and HTML; avoid caching SSE
  return next()
    .then((response) => {
      const isAsset =
        /\.(css|js|mjs|png|jpg|jpeg|webp|svg|ico|woff2?|ttf)$/i.test(path)
      const newHeaders = new Headers(response.headers)
      const contentType = newHeaders.get("Content-Type") || ""
      const isEventStream = contentType.includes("text/event-stream")

      if (isEventStream) {
        newHeaders.set("Cache-Control", "no-store")
      } else if (isAsset) {
        newHeaders.set("Cache-Control", "public, max-age=31536000, immutable")
      } else {
        newHeaders.set("Cache-Control", "public, max-age=60")
      }

      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      })
    })
    .catch((err) => {
      console.warn("[middleware] error:", err)
      throw err
    })
})
