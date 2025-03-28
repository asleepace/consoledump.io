import type { APIRoute } from "astro"
import { Session } from "@/logic/Session"
import { SessionManager } from "@/logic/SessionManager"

export const prerender = false

const sessionManager = new SessionManager()

/**
 * GET /[slugId]
 *
 * This endpoint returns the session client which can be browsed.
 */
export const GET: APIRoute = ({ request, rewrite }) => {
  const url = new URL(request.url)
  const params = url.searchParams
  const tabId = params.get("stream")

  // if no stream id param, return basic html page.
  if (!tabId) {
    return rewrite("/session")
  }

  // otherwise add the stream subscription
  const stream = sessionManager.stream(request)

  // output text event stream
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
    },
  })
}

/**
 * POST /[slugId]
 *
 * Pipe data to the input.
 *
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    sessionManager.post(request)
    return Response.json({ type: "broadcast" })
  } catch (error) {
    const message = (error as Error)?.message
    return Response.json({ type: "error", error: message }, { status: 500 })
  }
}

/**
 * DELETE /[slugId]?stream=[tabId]
 */
export const DELETE: APIRoute = ({ request }) => {
  try {
    console.log("[DELETE] ending session...")
    sessionManager.unsubscribe(request)
    return Response.json({ type: "unsubscribed" })
  } catch (error) {
    const message = (error as Error)?.message
    console.warn("[DELETE] error:", message)
    return Response.json({ type: "error", error: message }, { status: 500 })
  }
}
