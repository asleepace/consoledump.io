import type { APIRoute } from 'astro'

export const GET: APIRoute = async (ctx) => {
  const rawFile = Bun.file(`./public/dumps/${ctx.params.slug}.log`)

  if (!await rawFile.exists()) return Response.json({ error: 'File not found!' }, { status: 500 })

  return await fetch(await rawFile.text(), {
    headers: {
      'content-type': 'plain/text',
    },
  })
}
