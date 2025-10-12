import { memo, useCallback, useMemo, useRef, useState, type Ref } from 'react'
import { CloseButton, Panel, PanelSection } from './Panel'
import { LabeledCheckbox } from './LabeledCheckbox'

import {
  ArrowBigDown,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  Plus,
  PlusCircle,
  Settings,
} from 'lucide-react'
import { useAppContext } from '@/hooks/useAppContext'
import { cn } from '@/lib/utils'
import type { PatternMatcher } from '@/lib/client/message'

import { messageParser } from '@/lib/client/message'
import { Try } from '@asleepace/try'

interface Props {}

const LabeledInput = (props: {
  ref: Ref<HTMLInputElement>
  label: string
  className?: string
  placeholder?: string
  defaultValue?: string
  onChange?: (text: string) => void
}) => {
  return (
    <div className={'flex w-full flex-col shrink'}>
      <label className="px-1">{props.label}</label>
      <input
        defaultValue={props.defaultValue}
        onChange={(ev) => {
          props.onChange?.(ev.target.value)
        }}
        placeholder={props.placeholder}
        className={cn(
          'w-full h-8 bg-zinc-700 p-2 text-zinc-100 font-mono tracking-wider rounded mb-2 focus:ring-0',
          props.className
        )}
        type="text"
        ref={props.ref}
      ></input>
    </div>
  )
}

const PatternMatcher = (props: {
  initialPattern?: PatternMatcher
  onRegisterPattern: (pattern: PatternMatcher) => void
}) => {
  const inputRegexRef = useRef<HTMLInputElement>(null)
  const inputBadgeRef = useRef<HTMLInputElement>(null)
  const inputClassnameRef = useRef<HTMLInputElement>(null)
  const [isValidRegex, setIsValid] = useState(true)
  const [isEnabled, setIsEnabled] = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(!!props.initialPattern)

  const onTestRegex = useCallback((value: string) => {
    const res = Try.catch(() => new RegExp(value))
    setIsValid(res.ok)
  }, [])

  const onClick = useCallback(() => {
    const classNames = inputClassnameRef.current?.value
    const matcher = inputRegexRef.current?.value
    if (!classNames || !matcher) return
    props.onRegisterPattern({
      className: classNames,
      match: new RegExp(matcher),
    })
  }, [])

  const initialRegex = useMemo(() => {
    const pattern = props.initialPattern?.match

    if (pattern instanceof RegExp) {
      return pattern.source
    } else {
      return undefined
    }
  }, [props.initialPattern?.match])

  return (
    <div className="flex flex-col rounded-lg overflow-hidden *:transition-all">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="bg-zinc-950 text-zinc-200 flex justify-between flex-row font-bold tracking-wider text-xs uppercase p-3"
      >
        <span className={cn('px-1', props.initialPattern?.className)}>
          {props.initialPattern?.badgeName ?? 'Custom'}
        </span>
        {isCollapsed ? (
          <ChevronRight className="" size={16} />
        ) : (
          <ChevronDown className="right-0" size={16} />
        )}
      </button>
      <div
        className={cn(
          'flex flex-col w-full text-zinc-400 p-2 font-mono *:focus:ring-0 **:*:outline-none bg-zinc-800',
          isCollapsed ? 'h-0 py-0' : 'h-auto'
        )}
      >
        <div className="flex gap-x-2">
          <LabeledInput
            ref={inputRegexRef}
            label={'Regex'}
            defaultValue={initialRegex}
            placeholder="(custom:)"
            onChange={onTestRegex}
            className={
              isValidRegex || !inputBadgeRef.current?.value
                ? ''
                : 'border-red-500 border-2'
            }
          />
          <LabeledInput
            ref={inputBadgeRef}
            label={'Name'}
            defaultValue={props.initialPattern?.badgeName}
          />
        </div>
        <LabeledInput
          defaultValue={props.initialPattern?.className}
          ref={inputClassnameRef}
          label="Class"
          placeholder="text-blue-500 font-mono"
        />
        <div className="flex items-center justify-between pt-2.5">
          <div className="flex gap-x-2">
            <LabeledCheckbox
              label="Enabled"
              checked={isEnabled}
              onChange={() => setIsEnabled((prev) => !prev)}
            />
            <LabeledCheckbox
              label="Case Insensitive"
              checked={isEnabled}
              onChange={() => {}}
            />
          </div>

          <div className="flex shrink gap-x-2">
            <button
              onClick={onClick}
              className="bg-zinc-700 hover:bg-red-500 text-red-100 rounded px-4 py-1"
            >
              Delete
            </button>
            <button
              onClick={onClick}
              className="bg-zinc-700 hover:bg-blue-400 text-blue-100 rounded px-4 py-1"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const SettingsPanel = ({}: Props) => {
  const { isSettingsOpen, setIsSettingsOpen, ...app } = useAppContext()
  const handleClose = () => setIsSettingsOpen(false)
  const handleOpen = () => setIsSettingsOpen(true)

  const [renderCount, setRenderCount] = useState(0)

  const onRegisterPattern = useCallback((pattern: PatternMatcher) => {
    console.log(pattern)
    messageParser.register(pattern)
    setRenderCount((prev) => prev + 1)
  }, [])

  const basicPatterns = useMemo(() => {
    return messageParser
      .getPatterns()
      .filter((pattern) => pattern.match instanceof RegExp)
  }, [renderCount])

  return (
    <Panel
      isOpen={isSettingsOpen}
      handleClose={handleClose}
      handleOpen={handleOpen}
    >
      <PanelSection
        icon={<Settings size={32} className="text-orange-400 mr-1" />}
        headerTitle={<p className="text-2xl font-semibold">Settings</p>}
        headerRight={<CloseButton handleClose={handleClose} />}
        className="sticky left-0 right-0 top-0"
      >
        <p>Configure various settings and configurations here.</p>
        <div className="h-[1px] w-full mx-auto my-4 bg-zinc-800"></div>
      </PanelSection>

      {/* Message Renders Here */}
      <PanelSection headerTitle={'Pattern Matching'}>
        <div className="flex flex-col gap-y-4 rounded">
          {basicPatterns.map((pattern) => {
            return (
              <PatternMatcher
                initialPattern={pattern}
                onRegisterPattern={onRegisterPattern}
                key={pattern.badgeName}
              />
            )
          })}
          <PatternMatcher onRegisterPattern={onRegisterPattern} />
          <button className="flex w-full bg-zinc-800 hover:bg-zinc-700 rounded-lg p-3 items-center justify-center">
            <Plus className="font-black" size={16} />
          </button>
        </div>
      </PanelSection>
    </Panel>
  )
}
