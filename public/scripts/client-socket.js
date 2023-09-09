const server = 'ws://localhost:3000/stdin'
const ws = new WebSocket('ws://localhost:3000/stdin')

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
  console.log(`[websocket] connected to ${server}`);
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
})

ws.addEventListener('error', (error) => {
  console.warn('[websocket] error: ', error)
})

function executeCommand() {
  const rawCode = document.getElementById('code').innerText.trim()
  if (!rawCode) return
  const json = JSON.parse(rawCode)
  fetch('http://localhost:3000/123', {
    body: JSON.stringify(json),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
  })
}

document.addEventListener('readystatechange', state => {
  document.getElementById('execute').addEventListener('click', executeCommand)
})