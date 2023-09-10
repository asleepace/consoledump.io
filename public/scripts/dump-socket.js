const server = 'wss://consoledump.io/stdout'
const stdin = 'https://consoledump.io/stdin'

let ws = new WebSocket(server)
let isConnected = false

const colorForSession = {}

function iconForStatus(status) {
  switch (status) {
    case 'connected':
      return '/public/images/online.svg'
    case 'waiting':
      return '/public/images/waiting.svg'
    default:
      return '/public/images/offline.svg'
  }
}

function faviconUpdate(status) {
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = iconForStatus(status);
}

faviconUpdate('waiting')

const appendToTable = (sessionId, message) => {
  const table = document.getElementById('output')
  const tr = document.createElement('tr')
  const td = document.createElement('td')
  const tdate = document.createElement('td')
  const tsession = document.createElement('td')

  const id = JSON.parse(sessionId)

  const color = colorForSession[id] || generateRandomNeonColor()
  colorForSession[id] = color

  tdate.innerText = new Date().toLocaleTimeString()
  tsession.innerHTML = `<a style="color:${color};" href="/${id}">@${id}</a>`
  td.innerText = message
  tr.appendChild(tdate)
  tr.appendChild(tsession)
  tr.appendChild(td)
  table.appendChild(tr)
  tr.scrollIntoView(false)
}

ws.addEventListener('open', () => {
  console.log(`[websocket] connected to ${server}`);
  sendMessage(["Connected to " + stdin])
  faviconUpdate('connected')
  isConnected = true
})

ws.addEventListener('message', ({ data }) => {
  const messages = JSON.parse(data)
  const kind = typeof messages
  const [sessionId, ...rest] = messages
  const items = JSON.parse(...rest)
  console.log(items)
  appendToTable(sessionId, items)
})

ws.addEventListener('close', () => {
  console.warn('[websocket] disconnected from the WebSocket server!');
  appendToTable('client', 'disconnected')
  faviconUpdate('waiting')
  isConnected = false
})

ws.addEventListener('error', (error) => {
  console.warn('[websocket] error: ', error)
  faviconUpdate('offline')
})

function executeCommand() {
  const rawCode = document.getElementById('code').innerText.trim()
  if (!rawCode) return
  const json = JSON.parse(rawCode)
  sendMessage(json)
}

function sendMessage(json) {
  fetch(stdin, {
    body: JSON.stringify(json),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
  })
}

document.addEventListener('readystatechange', state => {
  if (state === 'ready') {
    sendMessage(["Connecting to " + stdin])
  }
})

function generateRandomNeonColor() {
  const randomChannelValue = () => Math.floor(Math.random() * 256);
  
  // Pick a random channel to maximize (set to 255)
  const maxChannel = Math.floor(Math.random() * 3);

  let r, g, b;
  
  if (maxChannel === 0) {
    r = 255;
    g = randomChannelValue();
    b = randomChannelValue();
  } else if (maxChannel === 1) {
    r = randomChannelValue();
    g = 255;
    b = randomChannelValue();
  } else {
    r = randomChannelValue();
    g = randomChannelValue();
    b = 255;
  }
  
  return `rgba(${r}, ${g}, ${b}, 0.9)`;
}

// reconnect to websocket when visibility changes
document.addEventListener('visibilitychange', () => {
  if (isConnected) return
  ws = new WebSocket(server)
}, false)