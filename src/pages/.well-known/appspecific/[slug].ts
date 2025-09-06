import { APIRoute } from 'astro'

export const GET: APIRoute = (ctx) => {
  switch (ctx.params.slug) {
    case 'com.chrome.devtools.json':
      return Response.json({})
    default:
      return new Response(null)
  }
}
