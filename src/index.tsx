import { Elysia, t, ws } from 'elysia'
import { html } from '@elysiajs/html'
import { staticPlugin } from '@elysiajs/static'
import { ElysiaWS, ElysiaWSContext, WSTypedSchema } from 'elysia/dist/ws'

type WebSocket = ElysiaWS<ElysiaWSContext<WSTypedSchema<never>>>
type SessionId = string
type SocketConnections = Record<SessionId, WebSocket[]>

// a dictionary of all active connections for a given path, use this object
// to store connections and broadcast messages to all active connections.
const connections: SocketConnections = {}

// extract the session id from the websocket path, the sessionId appears  after
// the /ws/ part of the path and should be ten characters long.
function getSessionId(ws: WebSocket): SessionId | undefined {
  const { path } = ws.data
  if (!path.startsWith('/ws/')) {
    console.warn('[server] invalid path:', path)
    return
  }
  const sessionId = path.slice(4)
  return sessionId as SessionId
}

function addConnection(ws: WebSocket) {
  const sessionId = getSessionId(ws)
  if (!sessionId) {
    console.warn('[server] invalid sessionId:', sessionId)
    return
  }
  console.log('[server] adding connection:', sessionId)
  connections[sessionId] ??= []
  const isAlreadyOpen = connections[sessionId].some((socket) => ws.data.id === socket.data.id)
  if (isAlreadyOpen) {
    console.log('[server] connection already open, skipping!')
  } else {
    connections[sessionId].push(ws)
  }
  console.log('[server] number of connections for', sessionId, connections[sessionId].length)
  ws.subscribe(sessionId)
}

function endConnection(ws: WebSocket) {
  const sessionId = getSessionId(ws)
  if (!sessionId) {
    console.warn('[server] invalid sessionId:', sessionId)
    return
  }
  console.log('[server] ending connection:', sessionId)
  if (!connections[sessionId]) {
    console.log('[server] no connections found, skipping!')
    return
  }
  connections[sessionId] = connections[sessionId].filter((socket) => ws.data.id !== socket.data.id)
  console.log('[server] number of connections for', sessionId, connections[sessionId].length)
  ws.close()
}


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
  // handle websocket connection from the client, we want to do some
  // bookkeeping here to keep track of all active connections. When opened
  // we will save the ws to connections with the corresponding path and
  // remove when closed.
  .ws('/ws/*', {
    open(ws) {
      addConnection(ws)
    },
    message(ws, message) {
      console.log('[server] received websocket message!')
      ws.send('123')
    },
    close(ws) {
      endConnection(ws)
    }
  })

  // handle POST requests to the server, we will broadcast the message to all
  // active connections for the given path.
  .post('/*', ({ body, path }) => {

    const sessionId = path.slice(1)
    console.log('[server] POST */ received message:', sessionId)

    if (!connections[sessionId]) {
      console.log('[server] connection not found for:', sessionId)
      return {
        body: 'Not Found',
        status: 404,
      }
    }

    // load all active connections for path
    const sessions = connections[sessionId]
    if (!sessions) {
      console.warn('[server] no connections found for:', sessionId)
      return
    }

    // console.log('[server] POST */ received message:', body)
    sessions.forEach((ws) => {
      console.log('[server] send message to all clients!')
      ws.send([JSON.stringify(body)])
    })

    return {
      status: 200,
      body: 'OK'
    }
  })
  .get('/*', ({ html, path }) => {
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

