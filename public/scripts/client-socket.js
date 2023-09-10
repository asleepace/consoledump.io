const IS_DEVELOPMENT = false

function handleArray(json) {
  json.forEach(item => {
    console.log(json, item, typeof item)
    if (Array.isArray(item)) {
      appendToTable(...json)
      console.log(...item)
    } else if (typeof item === 'object') {
      appendToTable(JSON.stringify(item))
      console.log(item)
    } else {
      try {
        parse(item)
      } catch (error) {
        appendToTable(item)
        console.log(item)
      }
    }
  })
}

function parse(message) {
  const json = JSON.parse(message)
  // handle array elements recursively
  if (Array.isArray(json)) {
    return handleArray(json)
  }
  // handle element is an object
  if (typeof json === 'object') {
    appendToTable(JSON.parse(json))
    console.log(json)
    return
  }
  // handle everything else
  appendToTable(json)
  console.log(json)
}

// establich websocket connection and handle various lifecycle events.
// returns an object which can be used to check if the connection is open.
function connect() {
  const session = window.location.pathname.slice(1)
  const stdin = window.location.href
  const stdout = IS_DEVELOPMENT ?
    'ws://localhost:8082/ws' + window.location.pathname :
    'wss://consoledump.io/ws' + window.location.pathname

  let ws;
  let isConnected = false

  function post(message) {
    fetch(stdin, {
      body: JSON.stringify(message),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
    })
  }

  function reconnect() {
    if (isConnected) return
    ws = new WebSocket(stdout)
    ws.onopen = () => {
      post(["[client] connected to " + stdin])
      faviconUpdate('connected')
      isConnected = true
    }
    ws.onmessage = ({ data }) => {
      faviconUpdate('connected')
      parse(data)
    }
    ws.onclose = () => {
      console.warn('[client] disconnected from the WebSocket server!');
      faviconUpdate('waiting')
      isConnected = false
    }
    ws.onerror = (error) => {
      console.warn('[client] error: ', error)
      faviconUpdate('offline')
      parse(JSON.stringify(error))
    }
  }

  // make sure to call this
  reconnect()

  return ({
    socket: ws,
    isConnected,
    session,
    reconnect,
    stdout,
    stdin,
    post,
  })
}

// connect the client websocket
const client = connect()


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


function execute() {
  const code = document.getElementById('code')
  const text = code.innerText.trim()
  try {
    client.post(JSON.parse(text))
  } catch (error) {
    client.post(text)
  }
}


document.addEventListener('readystatechange', state => {
  document.getElementById('execute').addEventListener('click', execute)
  document.getElementById('url').innerHTML = `POST @ <a href="${client.stdin}">${client.stdin}</a> (json)`
  if (state === 'ready') {
    client.post(["[client] connecting to " + client.stdin])
  }
})

// reconnect on focus changes
document.addEventListener('focus', () => {
  client.reconnect()
})