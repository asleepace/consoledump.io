import { X, Code, FileText, Globe, ChartNoAxesColumn } from 'lucide-react'
import { useAppContext } from '@/hooks/useAppContext'
import { CodeSnippet } from './CodeSnippet'
import { cn } from '@/lib/utils'
import { useMemo, type JSX } from 'react'
import { safe } from '@/lib/shared/safe-utils'
import { Panel } from './Panel'

export interface InfoPanelProps {
  className?: string
  url: URL
}

const getCodeSnippet = (href: string) =>
  `
function dump(...args) {
  return fetch('${href}', {
    method: 'POST',
    body: JSON.stringify(args)
  })
}
`.trim()

type PanelProps = {
  className?: string
  icon?: JSX.Element
  headerTitle: string | JSX.Element
  headerRight?: JSX.Element
}

const PanelSection = (props: React.PropsWithChildren<PanelProps>) => {
  return (
    <div>
      <div className={cn('flex items-center gap-3 mb-6', props.className)}>
        {props.icon}
        <div className="text-xl text-white font-semibold tracking-tight flex-1">
          {props.headerTitle}
        </div>
        {props.headerRight}
      </div>
      <div className="flex flex-col shrink">{props.children}</div>
    </div>
  )
}

const ICON_SIZE = 24

const NumberedItem = (props: { number: string | number; children: string }) => {
  return (
    <div className="flex items-center gap-x-2.5">
      <div className="aspect-square flex items-center justify-center rounded-full bg-white/5 border border-white/10 w-6 h-6">
        <span className="font-bold text-xs font-mono text-orange-400">
          {props.number}
        </span>
      </div>
      <p className="text-sm text-neutral-300">{props.children}</p>
    </div>
  )
}

export const InfoPanel = ({ className, url }: InfoPanelProps) => {
  const { isInfoPanelOpen, setIsInfoPanelOpen, ...app } = useAppContext()
  const handleClose = () => setIsInfoPanelOpen(false)
  const handleOpen = () => setIsInfoPanelOpen(true)

  const isConnected = useMemo(() => {
    return app.stream?.isConnected ?? false
  }, [app])

  const { sessionId, clientId } = useMemo(() => {
    return safe.getIdsFromUrl(url)
  }, [url])

  return (
    <Panel
      handleOpen={handleOpen}
      handleClose={handleClose}
      isOpen={isInfoPanelOpen}
      showTab={true}
      header={
        <>
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400/20 to-orange-600/20 border border-orange-400/30 flex items-center justify-center">
            <Globe size={20} className="text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-0.5">
              Session ID
            </h2>
            <a
              className="text-base font-mono font-semibold text-orange-400 hover:text-orange-300 transition-colors break-all"
              href={sessionId}
            >
              {sessionId}
            </a>
            <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
              Active session • Ready to receive logs
            </p>
          </div>
        </>
      }
    >
      {/* API Endpoint Section */}
      <PanelSection
        headerTitle="API Endpoint"
        icon={<Code size={ICON_SIZE} className="text-emerald-400" />}
      >
        <div className="flex flex-col gap-y-3">
          <p className="text-sm text-neutral-400 leading-relaxed">
            Send data to your session using HTTP POST requests:
          </p>
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400/20 to-orange-600/20 rounded-xl opacity-0 group-hover:opacity-100 blur transition-opacity" />
            <div className="relative bg-neutral-900/80 backdrop-blur-sm border border-white/10 group-hover:border-orange-400/30 font-mono rounded-xl p-3 flex gap-x-2.5 items-center transition-all">
              <span className="font-bold tracking-wide text-emerald-400 text-xs px-2 py-0.5 bg-emerald-400/10 rounded border border-emerald-400/20">
                POST
              </span>
              <div className="flex-1 min-w-0">
                <a
                  href={url.href}
                  className="text-orange-400 hover:text-orange-300 font-mono text-sm break-all transition-colors"
                >
                  {url.href}
                </a>
              </div>
            </div>
          </div>

          {/* Quick Start Steps */}
          <div className="mt-1">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Quick Start
            </h3>
            <div className="flex flex-col sm:flex-row border border-white/10 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm p-3.5 gap-3 shadow-lg">
              <NumberedItem number={1}>Copy code snippet</NumberedItem>
              <NumberedItem number={2}>Send your logs</NumberedItem>
              <NumberedItem number={3}>View real-time</NumberedItem>
            </div>
          </div>
        </div>
      </PanelSection>

      {/* Code Examples Section */}
      <PanelSection
        headerTitle="Code Examples"
        icon={<FileText size={ICON_SIZE} className="text-blue-400" />}
      >
        <div className="flex flex-col gap-y-4">
          {/* TypeScript/JavaScript */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                JavaScript / TypeScript
              </h3>
              <span className="text-xs text-neutral-500 font-mono px-2 py-0.5 bg-white/5 rounded border border-white/10">
                .js / .ts
              </span>
            </div>
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400/10 to-blue-600/10 rounded-xl opacity-0 group-hover:opacity-100 blur transition-opacity" />
              <div className="relative">
                <CodeSnippet
                  lang={'typescript'}
                  className="p-3 rounded-lg bg-neutral-900/80 backdrop-blur-sm border border-white/10 group-hover:border-blue-400/30 transition-all shadow-lg"
                >
                  {getCodeSnippet(url.href)}
                </CodeSnippet>
              </div>
            </div>
          </div>

          {/* Bash / cURL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Bash / cURL
              </h3>
              <span className="text-xs text-neutral-500 font-mono px-2 py-0.5 bg-white/5 rounded border border-white/10">
                .sh
              </span>
            </div>
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400/10 to-emerald-600/10 rounded-xl opacity-0 group-hover:opacity-100 blur transition-opacity" />
              <div className="relative">
                <CodeSnippet
                  lang="bash"
                  className="p-3 rounded-lg bg-neutral-900/80 backdrop-blur-sm border border-white/10 group-hover:border-emerald-400/30 transition-all shadow-lg"
                >
                  {`curl -d "hello world" ${url.href}`}
                </CodeSnippet>
              </div>
            </div>
          </div>

          {/* Documentation Link */}
          <a
            href="/docs/about"
            className="flex items-center justify-center gap-2 text-sm text-neutral-400 hover:text-orange-400 transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10"
          >
            <span>View full documentation</span>
            <span>→</span>
          </a>
        </div>
      </PanelSection>

      {/* Interactive Test Section */}
      <PanelSection
        headerTitle="Test It Live"
        icon={<Code size={ICON_SIZE} className="text-purple-400" />}
      >
        <div className="space-y-3">
          <p className="text-sm text-neutral-400 leading-relaxed">
            Click any example below to instantly send a test log to your
            session:
          </p>

          <div className="space-y-2">
            {[
              { cmd: 'dump("Hello, world!")', label: 'Simple string' },
              { cmd: 'dump({ data: 123 })', label: 'JSON object' },
              { cmd: 'dump([1, 2, 3, 4, 5])', label: 'Array data' },
              {
                cmd: 'dump("[error] demo:", { message: "Testing!" })',
                label: 'Error log',
              },
            ].map(({ cmd, label }) => (
              <button
                key={cmd}
                onClick={() => eval(cmd)}
                className="group w-full text-left px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/30 rounded-lg text-sm transition-all active:scale-[0.98] relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-purple-400/5 to-purple-400/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center justify-between gap-3">
                  <CodeSnippet lang={'typescript'} className="flex-1 min-w-0">
                    {cmd}
                  </CodeSnippet>
                  <span className="text-xs text-neutral-500 group-hover:text-purple-400 transition-colors flex-shrink-0">
                    {label}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </PanelSection>

      {/* Session Statistics */}
      <PanelSection
        headerTitle="Session Info"
        icon={<ChartNoAxesColumn size={ICON_SIZE} className="text-cyan-400" />}
      >
        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl p-3.5 shadow-lg">
          <div className="space-y-3">
            {/* Status */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/10">
              <span className="text-sm font-medium text-neutral-400">
                Status
              </span>
              <span
                className={cn(
                  'flex items-center gap-2 text-sm font-semibold',
                  isConnected ? 'text-emerald-400' : 'text-red-400'
                )}
              >
                <span
                  className={cn(
                    'w-2 h-2 rounded-full shadow-lg',
                    isConnected
                      ? 'bg-emerald-400 shadow-emerald-400/50 animate-pulse'
                      : 'bg-red-400 shadow-red-400/50'
                  )}
                />
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Session ID</span>
                <span className="text-orange-400 font-mono text-xs font-semibold">
                  {sessionId}
                </span>
              </div>
              {clientId ? (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Client ID</span>
                  <span className="text-blue-400 font-mono text-xs font-semibold">
                    {clientId}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Messages Received</span>
                <span className="text-white font-bold text-base tabular-nums">
                  {app.stream?.events.length ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Session Uptime</span>
                <span className="text-neutral-200 font-mono text-xs">
                  2h 15m
                </span>
              </div>
            </div>
          </div>
        </div>
      </PanelSection>
    </Panel>
  )
}
