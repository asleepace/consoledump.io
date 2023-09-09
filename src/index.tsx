import { Elysia, t, ws } from 'elysia'
import { html } from '@elysiajs/html'
import { staticPlugin } from '@elysiajs/static'

const openConnections: any[]  = []

function encode(data: any[]) {
  return JSON.stringify(
    data.map(item => JSON.stringify(item))
  )
}

const app = new Elysia()
  .use(html())
  .use(ws())
  .use(staticPlugin())
  .onRequest((context) => {
    console.log('[server] onRquest message!')
    //context.publish('123', 'hello')
  })
  // Simple WebSocket
  .ws('/stdin', {
    open(ws) {
      console.log('[server] websocket opened!')
      openConnections.push(ws)
      ws.subscribe('123')
    },
    message(ws, message) {
      console.log('[server] received websocket message!')
      ws.send('123')
    },
    close(ws) {
      console.log('[server] websocket closed!')
    }
  })
  .get('/*', ({ set, path, publish }) => {
    console.log('[server] GET */ received get!')

    // openConnections.forEach((ws) => {
    //   console.log('[server] send message to all clients!')
    //   ws.send(encode([['hello'], ['world']]))
    // })

    return {
      status: 200,
      body: 'OK'
    }
  })
  .post('/*', ({ body }) => {
    // console.log('[server] POST */ received message:', body)
    openConnections.forEach((ws) => {
      console.log('[server] send message to all clients!')
      ws.send([JSON.stringify(body)])
    })
    return {
      status: 200,
      body: 'OK'
    }
  })
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

