import { Elysia, t, ws } from 'elysia'
import { html } from '@elysiajs/html'
import { staticPlugin } from '@elysiajs/static'
import { ElysiaWS, ElysiaWSContext, WSTypedSchema } from 'elysia/dist/ws'
import ReactDOMServer from "react-dom/server";
import { WebSocketConnections } from './src/server-sockets'
import { cors } from '@elysiajs/cors'
import { renderToReadableStream } from "react-dom/server";
import { App } from './src/react/App'
import React, { createElement } from 'react';

// bundle react code
await Bun.build({
  entrypoints: ['./src/react/index.tsx'],
  outdir: './public/',
})

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
  .state('ip', 'localhost')
  .state('consoleDumpEncoding', 'no')
  .derive(({ request: { headers }, store }) => {
    return {
      consoleDumpEncoding: headers.get('X-Console-Dump-Encoding') || headers.get('x-console-dump-encoding') || store.consoleDumpEncoding,
      authorization: headers.get('Authorization'),
      ip: headers.get('X-Forwarded-For') || headers.get('x-forwarded-for') || store.ip,
    }
  })
  .onParse(({ request }, contentTye) => {
    const consoleDumpEncoding = request.headers.get('x-console-dump-encoding') === 'yes'
    return request.text()
      .then(text => {
        console.log('[server] onParse text:', text.length, { consoleDumpEncoding, })
        if (consoleDumpEncoding) {
          const [decoded] = JSON.parse(text)
          return decoded
        } else {
          return text
        }
      })
  })
  // static routes go here so that they won't be overriden by the wildcard, same
  // goes for the websocket routes.
  .get('/create', ({ set, ip }) => {
    const sessionId = connections.createSession()
    connections.dump(ip, JSON.stringify(`created session ${sessionId}`))
    set.redirect = `/${sessionId}`
    set.status = 302
    return "redirecting..."
  })
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
  .get('/react-stream', async context => {
    const reactApp = createElement(App)
    const stream = await renderToReadableStream(reactApp, {
      bootstrapScripts: ['/public/bundle.js']
    })
    return new Response(stream, {
      headers: { 'content-type': 'text/html' },
    })
  })
  .get('/react', async context => {
    const reactAppElement = createElement(App)
    const renderedString = ReactDOMServer.renderToString(reactAppElement)
    return Bun.file("./public/index.html").text()
      .then(indexHtml => {
        return indexHtml.replace(
          '<div id="root"></div>',
          `<div id="root">${renderedString}</div>`
        )
      })
  })
  .post('/', ({ body, ip }) => {
    console.log('[server] received message:', body)
    // un-comment this line to broadcast all messages to stdin
    //connections.dump(ip, JSON.stringify(body))
    return Status.OK
  })
  .post('/stdin', ({ body, ip }) => {
    console.log('[server] received message:', body)
    connections.dump(ip, JSON.stringify(body))
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

