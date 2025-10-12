import { memo, useCallback, useMemo, useRef, useState, type Ref } from 'react'
import { CloseButton, Panel, PanelSection } from './Panel'
import { LabeledCheckbox } from './LabeledCheckbox'
import { LabeledInput } from './LabeledInput'

import {
  ArrowBigDown,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  Plus,
  PlusCircle,
  Settings,
  Settings2,
  WandSparkles,
} from 'lucide-react'
import { useAppContext } from '@/hooks/useAppContext'
import { cn } from '@/lib/utils'
import type { PatternMatcher } from '@/lib/client/message'

import { messageParser } from '@/lib/client/message'
import { Try } from '@asleepace/try'

const PatternMatcher = (props: {
  initialPattern?: PatternMatcher
  onRegisterPattern: (pattern: PatternMatcher) => void
  onDelete?: (pattern: PatternMatcher) => void // Add delete handler
}) => {
  const inputRegexRef = useRef<HTMLInputElement>(null)
  const inputBadgeRef = useRef<HTMLInputElement>(null)
  const inputClassnameRef = useRef<HTMLInputElement>(null)

  const [isValidRegex, setIsValid] = useState(true)
  const [isEnabled, setIsEnabled] = useState(!props.initialPattern?.disabled)
  const [isCaseInsensitive, setIsCaseInsensitive] = useState(
    // Extract 'i' flag from regex
    props.initialPattern?.match instanceof RegExp
      ? props.initialPattern.match.flags.includes('i')
      : false
  )
  const [isCollapsed, setIsCollapsed] = useState(!!props.initialPattern)

  const onTestRegex = useCallback((value: string) => {
    if (!value) {
      setIsValid(true)
      return
    }
    const res = Try.catch(() => new RegExp(value))
    setIsValid(res.ok)
  }, [])

  const onSave = useCallback(() => {
    const classNames = inputClassnameRef.current?.value
    const matcher = inputRegexRef.current?.value
    const badgeName = inputBadgeRef.current?.value

    if (!classNames || !matcher) {
      // Show error toast or validation
      return
    }

    if (!isValidRegex) {
      // Show error for invalid regex
      return
    }

    const flags = isCaseInsensitive ? 'gi' : 'g'

    props.onRegisterPattern({
      className: classNames,
      badgeName: badgeName || undefined,
      match: new RegExp(matcher, flags),
      disabled: !isEnabled,
    })
  }, [isValidRegex, isCaseInsensitive, isEnabled])

  const onDelete = useCallback(() => {
    if (props.initialPattern && props.onDelete) {
      props.onDelete(props.initialPattern)
    }
  }, [props.initialPattern, props.onDelete])

  const initialRegex = useMemo(() => {
    const pattern = props.initialPattern?.match
    if (pattern instanceof RegExp) {
      return pattern.source
    }
    return undefined
  }, [props.initialPattern?.match])

  return (
    <div className="flex flex-col rounded-lg overflow-hidden border border-zinc-700">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          'bg-zinc-900 text-zinc-200 flex justify-between items-center',
          'font-bold tracking-wider text-xs uppercase p-3',
          'hover:bg-indigo-500 hover:*:text-indigo-50 transition-colors'
        )}
      >
        <span className={cn('px-1', props.initialPattern?.className)}>
          {props.initialPattern?.badgeName ?? 'New Pattern'}
        </span>
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Content */}
      <div
        className={cn(
          'flex flex-col w-full text-zinc-400 bg-zinc-800 transition-all overflow-hidden',
          isCollapsed ? 'h-0' : 'h-auto p-3'
        )}
      >
        {/* Inputs */}
        <div className="flex gap-x-2">
          <LabeledInput
            ref={inputRegexRef}
            label="Regex Pattern"
            defaultValue={initialRegex}
            placeholder="(error:|warn:)"
            onChange={onTestRegex}
            className={cn(!isValidRegex && 'border-2 border-red-500')}
          />
          <LabeledInput
            ref={inputBadgeRef}
            label="Badge Name"
            defaultValue={props.initialPattern?.badgeName}
            placeholder="error"
          />
        </div>

        {!isValidRegex && (
          <p className="text-red-400 text-xs px-1 -mt-1 mb-2">
            Invalid regex pattern
          </p>
        )}

        <LabeledInput
          ref={inputClassnameRef}
          label="CSS Classes"
          defaultValue={props.initialPattern?.className}
          placeholder="text-red-500 font-bold"
        />

        {/* Options */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-x-3">
            <LabeledCheckbox
              label="Enabled"
              checked={isEnabled}
              onChange={setIsEnabled}
            />
            <LabeledCheckbox
              label="Case Insensitive"
              checked={isCaseInsensitive}
              onChange={setIsCaseInsensitive}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-x-2">
            {props.initialPattern && (
              <button
                onClick={onDelete}
                className={cn(
                  'bg-zinc-700 hover:bg-red-600 text-red-100',
                  'rounded px-4 py-1.5 text-sm font-medium transition-colors'
                )}
              >
                Delete
              </button>
            )}
            <button
              onClick={onSave}
              disabled={!isValidRegex}
              className={cn(
                'bg-indigo-600 hover:bg-indigo-500 text-white',
                'rounded px-4 py-1.5 text-sm font-medium transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {props.initialPattern ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface Props {}

export const SettingsPanel = ({}: Props) => {
  const { isSettingsOpen, setIsSettingsOpen } = useAppContext()
  const handleClose = () => setIsSettingsOpen(false)
  const handleOpen = () => setIsSettingsOpen(true)

  const [showTimestamp, setShowTimestamp] = useState(true)
  const [showBagdes, setShowBadges] = useState(true)
  const [autoScroll, setAutoScroll] = useState(true)
  const [showDividers, setShowDividers] = useState(true)
  const [saveLocally, setSaveLocally] = useState(true)
  const [enableHtml, setEnableHtml] = useState(true)

  const [patterns, setPatterns] = useState(() =>
    messageParser.getPatterns().filter((p) => p.match instanceof RegExp)
  )
  const [showNewPattern, setShowNewPattern] = useState(false)

  const onRegisterPattern = useCallback((pattern: PatternMatcher) => {
    messageParser.register(pattern)
    setPatterns(
      messageParser.getPatterns().filter((p) => p.match instanceof RegExp)
    )
    setShowNewPattern(false)
  }, [])

  const onDeletePattern = useCallback((pattern: PatternMatcher) => {
    // Add delete method to messageParser
    messageParser.unregister(pattern)
    setPatterns(
      messageParser.getPatterns().filter((p) => p.match instanceof RegExp)
    )
  }, [])

  return (
    <Panel
      isOpen={isSettingsOpen}
      handleClose={handleClose}
      handleOpen={handleOpen}
    >
      <div className="sticky left-0 right-0 w-full top-0 bg-zinc-900 z-10">
        <PanelSection
          icon={<Settings size={32} className="text-zinc-500 mr-1" />}
          headerTitle={<p className="text-2xl font-semibold">Settings</p>}
          headerRight={<CloseButton handleClose={handleClose} />}
          className="bg-zinc-900"
        >
          <p className="text-sm text-zinc-400">
            Configure message patterns and display settings.
          </p>
          <div className="h-[1px] w-full mx-auto mt-4 bg-zinc-800 drop-shadow-2xl" />
        </PanelSection>
      </div>

      <div className="flex flex-col gap-y-8">
        {/* General settings */}
        <PanelSection hideHeader>
          <div className="grid grid-cols-2 grid-rows-3 gap-4 p-2 border-zinc-700">
            <LabeledCheckbox
              label="HTML Content"
              className="flex-row-reverse items-start flex justify-end"
              checked={enableHtml}
              onChange={() => setEnableHtml(!enableHtml)}
            />
            <LabeledCheckbox
              label="Show timestamps"
              className="flex-row-reverse items-start flex justify-end"
              checked={showTimestamp}
              onChange={() => setShowTimestamp(!showTimestamp)}
            />
            <LabeledCheckbox
              label="Show badges"
              className="flex-row-reverse items-start flex justify-end"
              checked={showBagdes}
              onChange={() => setShowBadges(!showBagdes)}
            />
            <LabeledCheckbox
              label="Show divider"
              className="flex-row-reverse items-start flex justify-end"
              checked={showDividers}
              onChange={() => setShowDividers(!showDividers)}
            />
            <LabeledCheckbox
              label="Autoscroll"
              className="flex-row-reverse items-start flex justify-end"
              checked={autoScroll}
              onChange={() => setAutoScroll(!autoScroll)}
            />
            <LabeledCheckbox
              label="Save locally"
              className="flex-row-reverse items-start flex justify-end"
              checked={saveLocally}
              onChange={() => setSaveLocally(!saveLocally)}
            />
          </div>
        </PanelSection>

        {/* Customize Themes */}
        <PanelSection
          className="px-1"
          headerTitle="Customize Theme"
          icon={<WandSparkles className="mr-1" size={26} />}
        >
          <p className="text-xs text-zinc-500 mb-4">
            Create custom patterns to highlight and style specific log messages.
          </p>

          <div className="flex flex-col gap-y-3">
            {/* Existing patterns */}
            {patterns.map((pattern, index) => (
              <PatternMatcher
                key={`${pattern.badgeName}-${index}`}
                initialPattern={pattern}
                onRegisterPattern={onRegisterPattern}
                onDelete={onDeletePattern}
              />
            ))}

            {/* New pattern form */}
            {showNewPattern && (
              <PatternMatcher
                onRegisterPattern={onRegisterPattern}
                onDelete={() => setShowNewPattern(false)}
              />
            )}

            {/* Add button */}
            {!showNewPattern && (
              <button
                onClick={() => setShowNewPattern(true)}
                className={cn(
                  'flex w-full bg-zinc-800 hover:bg-zinc-700',
                  'rounded-lg p-3 items-center justify-center gap-2',
                  'text-zinc-400 hover:text-zinc-200 transition-colors',
                  'border border-dashed border-zinc-700 hover:border-zinc-600'
                )}
              >
                <Plus size={16} />
                <span className="text-sm font-medium">Add Pattern</span>
              </button>
            )}
          </div>
        </PanelSection>
      </div>
    </Panel>
  )
}
