const IS_DEVELOPMENT = window.location.hostname === 'localhost'
const IS_HOMEPAGE = window.location.pathname === '/'
const MAX_RECONNECTS = 100

const colorForSession = {}

console.log({
  IS_DEVELOPMENT,
  IS_HOMEPAGE,
  MAX_RECONNECTS
})

const FAVICONS = {
  connected: '/public/images/online.svg',
  waiting: '/public/images/waiting.svg',
  offline: '/public/images/offline.svg',
}

// Data Parsing
// Eecursively parse JSON strings and each element of an array,
// or value of an object, and return the parsed data.
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

// current session id and the endpoints to connect to stdin and stdout.
function getSession() {
  const session = window.location.pathname.slice(1) || 'stdout'
  const endpoint = IS_HOMEPAGE ? 'stdout' : `ws/${session}`

  return {
    session: session,
    stdin: window.location.href,
    stdout: IS_DEVELOPMENT ?
      `ws://localhost:8082/${endpoint}` :
      `wss://consoledump.io/${endpoint}`
  }
}


// establich websocket connection and handle various lifecycle events.
// returns an object which can be used to check if the connection is open.
function connect() {
  const { session, stdin, stdout } = getSession()

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
    console.log('[client] connecting to ', stdout)
    if (isConnected) return
    if (numberOfReconnects > MAX_RECONNECTS) {
      console.warn('[client] max reconnects reached, aborting!')
      setFavicon('offline')
      return
    }
    ws = new WebSocket(stdout)
    ws.onopen = () => {
      if (numberOfReconnects === 0) {
        if (IS_HOMEPAGE) {
          post(["connected!"])
        } else {
          post(["started!"])
        }
      }
      setFavicon('connected')
      numberOfReconnects++
      isConnected = true
    }
    ws.onmessage = ({ data }) => {
      console.log(data)
      setFavicon('connected')
      if (IS_HOMEPAGE) {
        const [sessionId, messages] = JSON.parse(data)
        const output = deepParse(messages)
        renderTableRowHomepage(sessionId, output)
      } else {
        renderTableRow(deepParse(data))
      }
    }
    ws.onclose = () => {
      console.warn('[client] disconnected from the WebSocket server!');
      setFavicon('waiting')
      if (isConnected) {
        reconnect()
      }
      isConnected = false
    }
    ws.onerror = (error) => {
      console.warn('[client] error: ', error)
      deepParse(JSON.stringify(error))
      setFavicon('offline')
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

// update the current favicon based on the state
function setFavicon(status) {
  function getFavicon() {
    const element = document.querySelector("link[rel~='icon']")
    if (element) return element
    element = document.createElement('link')
    element.rel = 'icon'
    document.head.appendChild(element)
    return element
  }
  const favicon = getFavicon()
  favicon.href = FAVICONS[status]
}

function renderTableRow(message) {
  const table = document.getElementById('output')
  const tr = document.createElement('tr')
  const td = document.createElement('td')
  const tdate = document.createElement('td')
  tdate.innerText = new Date().toLocaleTimeString()
  td.innerText = String(message)
  tr.appendChild(tdate)
  tr.appendChild(td)
  table.appendChild(tr)
  tr.scrollIntoView(false)
}

function renderTableRowHomepage(sessionId, message) {
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
  if (!IS_HOMEPAGE) {
    document.getElementById('execute')?.addEventListener('click', execute)
    document.getElementById('url').innerHTML = `POST @ <a href="${client.stdin}">${client.stdin}</a> (json)`
  }
})

// reconnect on focus changes
window.addEventListener('focus', () => {
  client.reconnect()
})

// use to generate a random color
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