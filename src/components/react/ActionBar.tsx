import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown, SendIcon, Code, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppBackdropLayer } from './AppBackdropLayer'

export type ModeType = 'search' | 'message' | 'execute'

type ActionIcon = typeof SendIcon | typeof Code | typeof Search

export type ActionBarProps = {
  defaultValue?: string
  className?: string
}

export type ActionBarMode = {
  icon: ActionIcon
  type: ModeType
  label: string
  placeholder: string
}

const actionBarModes: ActionBarMode[] = [
  { icon: Search, type: 'search', label: 'Search and filter messages', placeholder: '' },
  { icon: SendIcon, type: 'message', label: 'Send a text message', placeholder: 'Sends text like a chat message ...' },
  { icon: Code, type: 'execute', label: 'Run code snippet', placeholder: 'e.g. console.log("hello, world!")' },
]

export function ActionBar(props: ActionBarProps) {
  const [currentValue, setCurrentValue] = useState(props.defaultValue)
  const [mode, setMode] = useState<ActionBarMode>(actionBarModes[0])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const inputRef = useRef<{
    value: string
    timeoutId: number | Timer | undefined
  }>({
    value: '',
    timeoutId: undefined,
  })

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      <AppBackdropLayer hidden={!isDropdownOpen} onClick={() => setIsDropdownOpen} />
      <div className="relative flex-1 z-10" ref={dropdownRef}>
        <div className="relative flex w-full flex-1 bg-zinc-900 text-gray-300 rounded-lg overflow-hidden">
          <button
            className="left-0 top-0 bottom-0 flex bg-zinc-800/50 hover:bg-zinc-800 px-3 items-center gap-0.5 text-gray-500 hover:text-blue-500 transition-colors z-10"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <mode.icon size={16} />
          </button>
          <input
            type="text"
            className={cn(
              'px-3.5 py-2 text-sm focus:outline-none focus:ring-0 transition-all min-w-64 w-full',
              mode.type === 'execute' && 'font-mono'
            )}
            placeholder={mode.label}
            defaultValue={currentValue}
            onChange={(e) => {
              clearTimeout(inputRef.current.timeoutId)
              inputRef.current.value = e.target.value
              inputRef.current.timeoutId = setTimeout(() => {
                setCurrentValue(inputRef.current.value)
              }, 500)
            }}
          />
          <button className="right-0 top-0 bottom-0 flex items-center justify-center hover:bg-green-500 px-2">
            <Play size={14} />
          </button>
        </div>

        {isDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 shrink bg-gray-800 border-gray-700 rounded-lg shadow-lg overflow-hidden z-20">
            {actionBarModes.map(({ type, icon: ActionIcon, label }) => (
              <button
                key={type}
                className={cn(
                  'w-full text-left px-4 py-2 text-sm border-b-[0.5px] border-b-blue-100/10',
                  mode.type === type ? 'bg-blue-500 text-blue-100' : 'text-blue-100/80 hover:bg-blue-400/30'
                )}
                onClick={() => {
                  setMode(actionBarModes.find((m) => m.type === type)!)
                  setIsDropdownOpen(false)
                }}
              >
                <span className="text-xs flex gap-x-4 items-center">
                  <ActionIcon className="font-black" size={14} />
                  {label}...
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
