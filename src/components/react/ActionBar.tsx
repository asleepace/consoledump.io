import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, SendHorizonal, Code, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppBackdropLayer } from './AppBackdropLayer'
import { useKeydown } from '@/hooks/useKeydown'

export type ModeType = 'search' | 'message' | 'execute'

type ActionIcon = typeof SendHorizonal | typeof Code | typeof Search

export type ActionBarEvent = {
  type: ModeType
  value: string
  reset: () => void
}

export type ActionBarProps = {
  defaultValue?: string
  className?: string
  onSubmit: (ev: ActionBarEvent) => any
}

export type ActionBarMode = {
  icon: ActionIcon
  type: ModeType
  label: string
}

const actionBarModes: ActionBarMode[] = [
  { icon: Search, type: 'search', label: 'Search and filter messages.' },
  {
    icon: SendHorizonal,
    type: 'message',
    label: 'Send a text message to the stream.',
  },
  { icon: Code, type: 'execute', label: 'Execute a code in the browser.' },
]

const makeAction = (props: ActionBarEvent) => ({
  ...props,
})

export function ActionBar(props: ActionBarProps) {
  const [mode, setMode] = useState<ActionBarMode>(actionBarModes[0])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const [selectedAction, setSelectedAction] = useState<ActionBarEvent | undefined>()

  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const historyRef = useRef({
    actions: [] as ActionBarEvent[],
    idx: 0,
    insert(action: ActionBarEvent) {
      this.idx += 1
      this.actions = [...this.actions, action]
      setSelectedAction(undefined)
    },
    moveUp() {
      this.idx -= 1
      if (this.idx < 0) this.idx = 0
      setSelectedAction(this.actions.at(this.idx))
    },
    moveDown() {
      if (++this.idx > this.actions.length) {
        this.idx = this.actions.length
      }
      setSelectedAction(this.actions.at(this.idx))
    },
  })

  const selectModeType = (modeType: ModeType) => {
    const selectedMode = actionBarModes.find((actionMode) => modeType === actionMode.type)
    if (!selectedMode) throw new Error(`Invalid mode: ${modeType}`)
    console.log('[action-bar] selected mode:', `"${modeType}"`)
    setMode({ ...selectedMode })
    setIsDropdownOpen(false)
  }

  const onSubmitInput = useCallback(() => {
    const currentValue = inputRef.current?.value
    if (!currentValue) return

    const reset = () => {
      if (!inputRef.current) return
      console.log('reset!')
      inputRef.current.value = ''
    }

    const actionEvent = makeAction({ value: currentValue, type: mode.type, reset })
    historyRef.current.insert(actionEvent)
    props.onSubmit(actionEvent)
    // inputRef.current?.blur()
  }, [mode, mode.type])

  useKeydown(
    (key) => {
      if (key.code !== 'Enter') return
      onSubmitInput()
    },
    [onSubmitInput]
  )

  useKeydown(
    (key) => {
      if (!isFocused) return
      if (key.code === 'ArrowUp') historyRef.current.moveUp()
      if (key.code === 'ArrowDown') historyRef.current.moveDown()
    },
    [isFocused]
  )

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
        <div className="relative flex w-full flex-1 bg-zinc-900 text-zinc-300 rounded-lg overflow-hidden">
          <button
            className="left-0 top-0 bottom-0 flex bg-zinc-800/50 hover:bg-zinc-800 px-3 items-center gap-0.5 text-zinc-500 hover:text-blue-500 transition-colors z-10"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <mode.icon size={16} />
          </button>
          <input
            type="text"
            key={selectedAction?.value}
            ref={inputRef}
            className={cn(
              'px-3.5 py-2 text-xs font-mono focus:outline-none focus:ring-0 transition-all min-w-64 w-full',
              isFocused ? 'opacity-100' : 'opacity-60'
            )}
            placeholder={`${mode.label}..`}
            defaultValue={selectedAction?.value ?? props.defaultValue}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onSubmit={onSubmitInput}
          />
          <button className="right-0 top-0 bottom-0 px-3 flex items-center justify-center text-zinc-500 hover:bg-zinc-800">
            <ChevronRight size={16} />
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
                  selectModeType(type)
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
