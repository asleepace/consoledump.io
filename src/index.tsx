import { Elysia, t, ws } from 'elysia'
import { html } from '@elysiajs/html'
import { staticPlugin } from '@elysiajs/static'
import { ElysiaWS, ElysiaWSContext, WSTypedSchema } from 'elysia/dist/ws'
import { WebSocketConnections } from './api/server-sockets'
import { cors } from '@elysiajs/cors'

// status
const Status = {
  OK: {
    status: 200,
    body: 'OK'
  },
  NOT_FOUND: {
    status: 404,
    body: 'Not Found'
  },
  INTERNAL_SERVER_ERROR: {
    status: 500,
    body: 'Internal Server Error'
  }
}

// a dictionary of all active connections for a given path, use this object
// to store connections and broadcast messages to all active connections.
const connections = new WebSocketConnections()

const app = new Elysia()
  .use(html())
  .use(ws())
  .use(cors({ origin: true }))
  .use(staticPlugin())
  // .onRequest((context) => {

  // })
  // handle websocket connection from the client, we want to do some
  // bookkeeping here to keep track of all active connections. When opened
  // we will save the ws to connections with the corresponding path and
  // remove when closed.
  .ws('/stdout', {
    open(ws) {
      connections.addDump(ws)
    },
    close(ws) {
      connections.closeDump(ws)
    }
  })
  .ws('/ws/*', {
    open(ws) {
      connections.add(ws)
    },
    message(ws, message) {
      console.warn('[server] received websocket message!')
      ws.send('123')
    },
    close(ws) {
      connections.close(ws)
    }
  })
  .get('/', conext => {
    return Bun.file("./src/html/homepage.html").text()
  })
  .post('/', ({ body }) => {
    console.log('[server] received message:', body)
    connections.dump('stdin', JSON.stringify(body))
    return Status.OK
  })
  .post('/stdin', ({ body }) => {
    console.log('[server] received message:', body)
    connections.dump('stdin', JSON.stringify(body))
    return Status.OK
  })
  // handle POST requests to the server, we will broadcast the message to all
  // active connections for the given path.
  .post('/*', ({ body, path }) => {
    try {
      connections.broadcast(path, body)
      return Status.OK
    } catch (error) {
      console.error('[server] error broadcasting message:', error)
      return Status.INTERNAL_SERVER_ERROR
    }
  })
  .get('/*', ({ html, path }) => {
    return Bun.file("./src/html/index.html").text()
  })
  .get('/editor', ({ html }) => {
    return Bun.file("./src/html/editor.html").text()
  })
  .get('/test', ({ html }) => {
    return Bun.file("./src/html/test.html").text()
  })
  .get('/logo', ({ html }) => {
    return Bun.file("./src/html/logo.html").text()
  })
  .listen(8082)

console.log(`\n🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}\n`)

