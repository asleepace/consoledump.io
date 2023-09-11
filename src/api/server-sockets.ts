import { ElysiaWS, ElysiaWSContext, WSTypedSchema } from 'elysia/dist/ws'

type WebSocket = ElysiaWS<ElysiaWSContext<WSTypedSchema<never>>>
type SessionId = string
type SocketConnections = Record<SessionId, WebSocket[]>

const MAX_CONNECTIONS_PER_SESSION = 10
const SESSION_ID_LENGTH = 12
const CLIENT_PREFIX = '/ws/'

export class WebSocketConnections {

  constructor(
    private connections: SocketConnections = {},
    private numberOfConnections = 0,
  ) { }

  public createSession(): SessionId {
    let loopCount = 0
    let sessionId = this.generateSessionId()
    while (this.checkIfExists(sessionId) && loopCount++ < 100) {
      sessionId = this.generateSessionId()
    }
    return sessionId
  }

  public generateSessionId(): SessionId {
    let session = "";
    let possible = "abcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < 8; i++)
      session += possible.charAt(Math.floor(Math.random() * possible.length));
    return session;
  }

  public checkIfExists(sessionId: string): boolean {
    return !!this.connections[sessionId]
  }

  public addDump(socket: WebSocket) {
    this.connections['dump'] ??= []
    this.connections['dump'].push(socket)
  }

  public closeDump(socket: WebSocket) {
    const socketId = socket.data.id
    this.connections['dump'] = this.connections['dump'].filter(({ data }) => data.id !== socketId)
    socket.close()
  }

  public sessionId({ data }: WebSocket): SessionId {
    console.log(data.path)
    const isReadWebsocket = data.path.startsWith(CLIENT_PREFIX)
    const isCorrectLength = data.path.length === SESSION_ID_LENGTH
    console.log({ isReadWebsocket, isCorrectLength })

    if (!isReadWebsocket || !isCorrectLength) {
      throw new Error(`Invalid session id "${data.path}".`)
    }

    const sessionId = data.path.slice(CLIENT_PREFIX.length)
    console.log(`[server-socket] session id ${sessionId}`)
    return sessionId
  }

  public add(socket: WebSocket) {
    const sessionId = this.sessionId(socket)
    const socketId = socket.data.id
    console.log(`[server-socket] adding socket ${sessionId}`)
    this.connections[sessionId] ??= []
    this.connections[sessionId].push(socket)
    const sessions = this.connections[sessionId]
    if (sessions.length > MAX_CONNECTIONS_PER_SESSION) {
      throw new Error(`Number of max connections for sessions reached (${sessions.length}).`)
    }
    const isAlreadyConnected = sessions.some(({ data }) => data.id === socketId)
    if (isAlreadyConnected) {
      console.log(`[server-socket] socket ${socket.data.id} already connected`)
      return
    }
    sessions.push(socket)
  }

  public close(socket: WebSocket) {
    const sessionId = this.sessionId(socket)
    console.log(`[server-socket] removing socket ${sessionId}`)
    const sessions = this.connections[sessionId]
    const socketId = socket.data.id
    this.connections[sessionId] = sessions.filter(({ data }) => data.id !== socketId)
    socket.close()
  }

  public broadcast(path: string, message: any) {
    const sessionId = path.slice(1)
    const sessions = this.connections[sessionId]
    const data = JSON.stringify(message)
    this.dump(sessionId, data) // dump to stdin
    if (!sessions) {
      throw new Error(`Session "${sessionId}" not found for broadcast`)
    }
    sessions.forEach(socket => socket.send([data]))
    console.log(`[server-socket] message sent to ${sessions.length} sockets`)
  }

  public dump(sender: string, json: string) {
    this.connections['dump']?.forEach(socket => socket.send([JSON.stringify(sender), json]))
  }

}
