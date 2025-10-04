import React, { createContext, useRef, useState, type PropsWithChildren } from 'react'
import type { LogEntry } from './LogEntryItem'

export type AppTheme = {
  mode: 'light' | 'dark'
  bg: string
  card: string
  border: string
  hover: string
  text: string
  textMuted: string
  input: string
  button: string
  code: string
}

const AppThemes: Record<AppTheme['mode'], AppTheme> = {
  dark: {
    mode: 'dark',
    bg: 'bg-gray-950',
    card: 'bg-gray-900',
    border: 'border-gray-900',
    hover: 'hover:bg-gray-800/50',
    text: 'text-gray-100',
    textMuted: 'text-gray-400',
    input: 'bg-gray-800 border-gray-700',
    button: 'bg-gray-800 border-gray-700 hover:border-blue-500',
    code: 'bg-gray-800',
  },
  light: {
    mode: 'light',
    bg: 'bg-gray-50',
    card: 'bg-white',
    border: 'border-gray-200',
    hover: 'hover:bg-gray-100',
    text: 'text-gray-900',
    textMuted: 'text-gray-600',
    input: 'bg-white border-gray-300',
    button: 'bg-white border-gray-300 hover:border-blue-500',
    code: 'bg-gray-100',
  },
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

type SetState<T> = React.Dispatch<React.SetStateAction<T>>

// --- context types ---

export type AppCtx = {
  theme: AppTheme
  logs: LogEntry[]
  copiedId: string | undefined
  searchTerm: string | undefined
  isConnected: boolean
  isDark: boolean
  expandedLogs: Set<string>
  setTheme: (mode: AppTheme['mode']) => void
  setLogs: SetState<LogEntry[]>
  setCopiedId: SetState<string | undefined>
  setSearchTerm: SetState<string | undefined>
  setIsConnected: SetState<boolean>
  setExpandedLogs: SetState<Set<string>>

  /** helpers */
  toggleExpand(id: string): void
  copyToClipboard(logEntry: { content: string; id: string }): void
}

// --- default app context ---

export const AppContext = createContext<AppCtx>({
  theme: AppThemes.dark,
  logs: [],
  copiedId: undefined,
  searchTerm: undefined,
  isConnected: false,
  isDark: false,
  expandedLogs: new Set(),
  setTheme() {},
  setLogs() {},
  setCopiedId() {},
  setSearchTerm() {},
  setIsConnected() {},
  setExpandedLogs() {},
  toggleExpand() {},
  copyToClipboard() {},
})

// --- app context provider ---

export function AppContextProvider({ children }: PropsWithChildren<{}>) {
  const [theme, setTheme] = useState(AppThemes.dark)
  const [logs, setLogs] = useState(mockLogs)
  const [copiedId, setCopiedId] = useState<string | undefined>()
  const [searchTerm, setSearchTerm] = useState<string | undefined>()
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())

  const isDark = theme.mode === 'dark'

  return (
    <AppContext.Provider
      value={{
        theme,
        logs,
        copiedId,
        searchTerm,
        isConnected,
        isDark,
        expandedLogs,
        setTheme: (mode) => setTheme(AppThemes[mode]),
        setLogs,
        setCopiedId,
        setSearchTerm,
        setIsConnected,
        setExpandedLogs,
        toggleExpand: (id: string) => {
          console.log('[AppContext] toggle expand:', id)
          const next = new Set(expandedLogs)
          if (next.has(id)) {
            next.delete(id)
          } else {
            next.add(id)
          }
          setExpandedLogs(next)
        },
        copyToClipboard(logEntry) {
          navigator.clipboard.writeText(logEntry.content)
          setCopiedId(logEntry.id)
          setTimeout(() => setCopiedId(undefined), 2000)
        },
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

// --- hoc wrapper ---

export function withAppProvider<T extends {}>(Elem: (props: T) => React.ReactElement<T>) {
  return (props: T) => (
    <AppContextProvider>
      <Elem {...props} />
    </AppContextProvider>
  )
}
