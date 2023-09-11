const IS_DEVELOPMENT = false
const MAX_RECONNECTS = 100

// Data Parsing
//
// Eecursively parse JSON strings and each element of an array,
// or value of an object, and return the parsed data.
//
function deepParse(data) {
  // handle edge cases
  if (data === undefined)
    return undefined;
  if (data === null)
    return null;
  if (Number.isNaN(data))
    return NaN;
  // handle case where data is string or json
  if (typeof data === 'string') {
    try {
      const json = JSON.parse(data);
      return deepParse(json);
    }
    catch (error) {
      return data;
    }
  }
  // handle array of values
  if (Array.isArray(data))
    return data.map(deepParse);
  // handle object
  if (typeof data === 'object') {
    return Object.entries(data).reduce((output, [key, value]) => {
      output[key] = deepParse(value);
      return output;
    }, {});
  }
  // otherwise return data "as is"
  return data;
}

// establich websocket connection and handle various lifecycle events.
// returns an object which can be used to check if the connection is open.
function connect() {
  const session = 'sdtin'
  const stdin = window.location.href
  const stdout = IS_DEVELOPMENT ?
    'ws://localhost:8082/stdout' :
    'wss://consoledump.io/stdout'

  let ws;
  let isConnected = false
  let numberOfReconnects = 0

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
    if (numberOfReconnects >= MAX_RECONNECTS) {
      console.warn('[client] max number of reconnects reached!')
      faviconUpdate('offline')
      return
    }
    ws = new WebSocket(stdout)
    ws.onopen = () => {
      if (numberOfReconnects === 0) {
        post(["[client] connected to " + session])
      }
      faviconUpdate('connected')
      numberOfReconnects++
      isConnected = true
    }
    ws.onmessage = ({ data }) => {
      const messages = JSON.parse(data)
      const kind = typeof messages
      const [sessionId, ...rest] = messages
      const items = deepParse(...rest)
      if (Array.isArray(items)) {
        appendToTable(sessionId, ...items)
        console.log(...items)
      } else {
        appendToTable(sessionId, items)
        console.log(items)
      }
      faviconUpdate('connected')
    }
    ws.onclose = () => {
      console.warn('[client] disconnected from the WebSocket server!');
      faviconUpdate('waiting')
      isConnected = false
    }
    ws.onerror = (error) => {
      console.warn('[client] error: ', error)
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
  if (state === 'ready') {
    client.post(["[client] connecting to " + client.stdin])
  }
})

window.addEventListener('focus', () => {
  client.reconnect()
})

/* * * HTML * * */

function generateRandomNeonColor() {
  const randomChannelValue = () => Math.floor(Math.random() * 256);
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