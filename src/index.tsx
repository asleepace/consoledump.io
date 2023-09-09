import { Elysia, t, ws } from 'elysia'
import { html } from '@elysiajs/html'
import { staticPlugin } from '@elysiajs/static'

const app = new Elysia()
  .use(html())
  .use(staticPlugin())
  .get('/', ({ html }) => {

    return Bun.file("./src/html/index.html").text()
  })
  .get('/editor', ({ html }) => {
    return Bun.file("./src/html/editor.html").text()
  })
  .get('/logo', ({ html }) => {
    return Bun.file("./src/html/logo.html").text()
  })
  .listen(3000)

console.log(`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`)

