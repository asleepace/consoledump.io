import type { APIRoute } from 'astro'

/**
 * GET /sh
 *
 * This endpoint returns a shell script which can be executed on the users
 * local machine.
 *
 */
export const GET: APIRoute = async () => {
  const shellScript = await Bun.file('public/install.sh').text()

  console.log('[consoledump] loaded client script:', shellScript)

  return new Response(shellScript, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache',
    },
  })
}
