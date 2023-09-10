const server = 'wss://consoledump.io/ws' + window.location.pathname
const stdin = 'https://consoledump.io' + window.location.pathname
const ws = new WebSocket(server)

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

const appendToTable = (message) => {
  const table = document.getElementById('output')
  const tr = document.createElement('tr')
  const td = document.createElement('td')
  const tdate = document.createElement('td')
  tdate.innerText = new Date().toLocaleTimeString()
  td.innerText = message
  tr.appendChild(tdate)
  tr.appendChild(td)
  table.appendChild(tr)
  tr.scrollIntoView(false)
}

ws.addEventListener('open', () => {
  faviconUpdate('connected')
  console.log(`[websocket] connected to ${server}`);
  sendMessage(["Connected to " + stdin])
})

ws.addEventListener('message', ({ data }) => {
  const messages = JSON.parse(data)
  const kind = typeof messages

  switch (kind) {
    case 'number':
    case 'string':
    case 'boolean':
    case 'undefined':
    case 'symbol':
    case 'bigint':
      console.log(messages)
      appendToTable(messages)
      return

    case 'object':
      if (!Array.isArray(messages)) {
        console.log(messages)
        appendToTable(JSON.parse(messages))
        return
      }

    default:
      break;
  }

  messages.forEach((message) => {
    const json = JSON.parse(message)
    if (Array.isArray(json)) {
      console.log(...json)
      appendToTable(...json)
    } else {
      appendToTable(message)
      console.log(json)
    }
  })
})

ws.addEventListener('close', () => {
  console.warn('[websocket] disconnected from the WebSocket server!');
  faviconUpdate('offline')
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
  faviconUpdate('waiting')
  console.log(state, window.location.pathname)
  document.getElementById('execute').addEventListener('click', executeCommand)
  document.getElementById('url').value = window.location.href
  //.getElementById('clear').addEventListener('click', executeCommand)
  if (state === 'ready') {
    sendMessage(["Connecting to " + stdin])
  }
})
