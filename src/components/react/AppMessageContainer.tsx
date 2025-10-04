import { useState } from 'react'

interface LogEntry {
  timestamp: string
  type: 'connected' | 'system' | 'message' | 'error'
  content: string
  id: string
  isCode?: boolean
}

const mockLogs: LogEntry[] = [
  {
    timestamp: '17:32:07',
    type: 'connected',
    content: 'client joined stream https://consoledump.io/8bc91716',
    id: '1',
  },
  {
    timestamp: '17:32:07',
    type: 'system',
    content: 'curl -d "hello world" https://consoledump.io/8bc91716',
    id: '2',
    isCode: true,
  },
  {
    timestamp: '17:32:07',
    type: 'system',
    content:
      "const dump = (...args) => fetch('https://consoledump.io/8bc91716',{method:'POST', body:JSON.stringify(args)})",
    id: '3',
    isCode: true,
  },
  { timestamp: '17:32:07', type: 'system', content: 'client (1) connected!', id: '4' },
  { timestamp: '17:32:30', type: 'message', content: 'message: 0 80db114e-ee17-4cc0-a120-164fb86a89a1', id: '5' },
  { timestamp: '17:32:30', type: 'message', content: 'message: 1 66b06213-031e-45d4-88f1-38b0679f113e', id: '6' },
  { timestamp: '17:32:30', type: 'message', content: 'message: 2 5c9cc8f8-4b48-4f97-84b9-52e609412a61', id: '7' },
  { timestamp: '17:32:30', type: 'message', content: 'message: 3 238d5ccd-c882-45e4-a42d-44456c28392a', id: '8' },
]

export function AppMessageContainer() {
  const [messages, setMessages] = useState(mockLogs)

  return (
    <main className="flex-1 flex flex-col p-2">
      {messages.map((logMessage) => {
        return <div></div>
      })}
    </main>
  )
}
