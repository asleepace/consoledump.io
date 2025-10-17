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
  Database,
  Download,
  Upload,
  Trash2,
} from 'lucide-react'
import { useAppContext } from '@/hooks/useAppContext'
import { cn } from '@/lib/utils'
import type { PatternMatcher } from '@/lib/client/message'

import { messageParser } from '@/lib/client/message'
import { Try } from '@asleepace/try'
import { useSettings, type AppSettings } from '@/hooks/useSettings'

const PatternMatcher = (props: {
  initialPattern?: PatternMatcher
  onRegisterPattern: (pattern: PatternMatcher) => void
  onDelete?: (pattern: PatternMatcher) => void // Add delete handler
}) => {
  'use client'

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
    <div className="flex flex-col rounded-lg overflow-hidden border border-white/10 bg-gradient-to-br from-neutral-900/40 to-neutral-900/20 backdrop-blur-sm shadow-lg">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          'group bg-neutral-900/60 text-neutral-200 flex justify-between items-center backdrop-blur-sm',
          'font-medium text-sm p-3',
          'hover:bg-neutral-900/80 transition-all',
          !isCollapsed && 'border-b border-white/10'
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'px-2 py-0.5 rounded text-xs font-semibold',
              props.initialPattern?.className || 'text-neutral-400'
            )}
          >
            {props.initialPattern?.badgeName ?? 'New Pattern'}
          </span>
          {props.initialPattern?.disabled && (
            <span className="text-xs text-neutral-500 italic">disabled</span>
          )}
        </div>
        <ChevronRight
          size={16}
          className={cn(
            'text-neutral-400 group-hover:text-neutral-200 transition-all',
            !isCollapsed && 'rotate-90'
          )}
        />
      </button>

      {/* Content */}
      <div
        className={cn(
          'flex flex-col w-full text-neutral-400 bg-white/5 backdrop-blur-sm transition-all overflow-hidden',
          isCollapsed ? 'h-0' : 'h-auto p-3.5'
        )}
      >
        {/* Inputs */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
            <p className="text-red-400 text-xs px-1 -mt-2">
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
          <div className="flex items-center justify-between pt-1">
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
          </div>

          {/* Actions */}
          <div className="flex gap-x-2 pt-2 border-t border-white/10">
            {props.initialPattern && (
              <button
                onClick={onDelete}
                className={cn(
                  'flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/30',
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-all active:scale-95'
                )}
              >
                Delete
              </button>
            )}
            <button
              onClick={onSave}
              disabled={!isValidRegex}
              className={cn(
                'flex-1 bg-orange-400 hover:bg-orange-500 text-black',
                'rounded-lg px-3 py-1.5 text-sm font-semibold transition-all active:scale-95',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-orange-400'
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

interface Props {
  app: AppSettings
}

export const SettingsPanel = ({ app }: Props) => {
  const { isSettingsOpen, setIsSettingsOpen } = useAppContext()
  const handleClose = () => setIsSettingsOpen(false)
  const handleOpen = () => setIsSettingsOpen(true)

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
      header={
        <>
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400/20 to-orange-600/20 border border-orange-400/30 flex items-center justify-center">
            <Settings size={20} className="text-orange-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white tracking-tight mb-1">
              Settings
            </h2>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Customize your console output and create custom patterns.
            </p>
          </div>
        </>
      }
    >
      {/* Settings Header */}

      <div className="flex flex-col gap-y-6">
        {/* Display Options */}
        <PanelSection
          headerTitle="Display Options"
          icon={<Settings2 className="text-blue-400" size={24} />}
        >
          <div className="space-y-2">
            {[
              {
                label: 'HTML Content',
                checked: app.settings.enableHtml,
                toggle: app.toggleEnableHtml,
              },
              {
                label: 'Show Timestamps',
                checked: app.settings.showTimestamp,
                toggle: app.toggleTimestamp,
              },
              {
                label: 'Show Badges',
                checked: app.settings.showBadges,
                toggle: app.toggleBadges,
              },
              {
                label: 'Show Dividers',
                checked: app.settings.showDividers,
                toggle: app.toggleDividers,
              },
              {
                label: 'Auto Scroll',
                checked: app.settings.autoScroll,
                toggle: app.toggleAutoScroll,
              },
              {
                label: 'Save Locally',
                checked: app.settings.saveLocally,
                toggle: app.toggleSaveLocally,
              },
            ].map(({ label, checked, toggle }) => (
              <button
                key={label}
                onClick={toggle}
                className="group w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
              >
                <span className="text-sm font-medium text-neutral-200 group-hover:text-white transition-colors">
                  {label}
                </span>
                <div
                  className={cn(
                    'w-11 h-6 rounded-full transition-all relative',
                    checked ? 'bg-orange-400' : 'bg-neutral-700'
                  )}
                >
                  <div
                    className={cn(
                      'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-lg transition-all',
                      checked ? 'left-[22px]' : 'left-0.5'
                    )}
                  />
                </div>
              </button>
            ))}
          </div>
        </PanelSection>

        {/* Custom Patterns */}
        <PanelSection
          headerTitle="Custom Patterns"
          icon={<WandSparkles className="text-purple-400" size={24} />}
        >
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-purple-400/5 border border-purple-400/20">
              <WandSparkles
                className="text-purple-400 flex-shrink-0 mt-0.5"
                size={16}
              />
              <p className="text-sm text-neutral-300 leading-relaxed">
                Create custom regex patterns to automatically highlight and
                style specific log messages with colors, badges, and custom CSS
                classes.
              </p>
            </div>

            <div className="flex flex-col gap-y-2.5">
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
                    'group flex w-full bg-white/5 hover:bg-white/10',
                    'rounded-xl p-3.5 items-center justify-center gap-2.5',
                    'text-neutral-400 hover:text-white transition-all',
                    'border border-dashed border-white/20 hover:border-orange-400/50',
                    'relative overflow-hidden'
                  )}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-400/0 via-orange-400/5 to-orange-400/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Plus size={18} className="relative z-10" />
                  <span className="text-sm font-semibold relative z-10">
                    Add New Pattern
                  </span>
                </button>
              )}
            </div>
          </div>
        </PanelSection>

        {/* Storage Management */}
        {app.settings.saveLocally && <StorageSection />}
      </div>
    </Panel>
  )
}

// Storage management component
function StorageSection() {
  const { storage } = useAppContext()
  const [storageInfo, setStorageInfo] = useState(storage.getStorageInfo())

  const refreshStorage = () => {
    setStorageInfo(storage.getStorageInfo())
  }

  const handleExport = () => {
    const data = storage.exportData()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `consoledump-backup-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        const success = storage.importData(data)
        if (success) {
          alert('Data imported successfully! Reload the page to see changes.')
          refreshStorage()
        } else {
          alert('Failed to import data')
        }
      } catch (error) {
        alert('Invalid backup file: ' + error)
      }
    }
    reader.readAsText(file)
  }

  const handleClearMessages = () => {
    if (confirm('Clear all saved messages? Settings will be kept.')) {
      storage.clearMessages()
      refreshStorage()
    }
  }

  const handleClearAll = () => {
    if (
      confirm('Clear ALL saved data including settings? This cannot be undone.')
    ) {
      storage.clearAll()
      refreshStorage()
    }
  }

  return (
    <PanelSection
      headerTitle="Storage Management"
      icon={<Database className="text-cyan-400" size={24} />}
    >
      <div className="space-y-3">
        {/* Storage usage */}
        <div className="p-3 rounded-lg bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-neutral-300">
              Storage Used
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              {(storageInfo.used / 1024).toFixed(1)} KB
            </span>
          </div>
          <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
            <div
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                storageInfo.percentage > 80
                  ? 'bg-red-400'
                  : storageInfo.percentage > 60
                  ? 'bg-orange-400'
                  : 'bg-cyan-400'
              )}
              style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            {storageInfo.percentage.toFixed(1)}% of estimated storage
          </p>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/30 text-neutral-300 hover:text-cyan-400 transition-all text-sm"
          >
            <Download size={16} />
            <span>Export</span>
          </button>
          <label className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/30 text-neutral-300 hover:text-cyan-400 transition-all text-sm cursor-pointer">
            <Upload size={16} />
            <span>Import</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          <button
            onClick={handleClearMessages}
            className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 hover:border-orange-500/30 text-orange-400 transition-all text-sm"
          >
            <Trash2 size={16} />
            <span>Clear Messages</span>
          </button>
          <button
            onClick={handleClearAll}
            className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-400 transition-all text-sm"
          >
            <Trash2 size={16} />
            <span>Clear All</span>
          </button>
        </div>
      </div>
    </PanelSection>
  )
}
