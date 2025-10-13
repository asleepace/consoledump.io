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
      <div className={cn('flex items-center gap-2 mb-4', props.className)}>
        {props.icon}
        <div className="text-lg text-zinc-200 font-semibold tracking-wide flex-1">
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
    <div className="flex items-center gap-x-2">
      <div className="aspect-square flex items-center justify-center rounded-full bg-zinc-800 w-6">
        <span className="font-black text-xs font-mono tracking-wide text-zinc-500">
          {props.number}
        </span>
      </div>
      <p className="text-[13px] tracking-wide">{props.children}</p>
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
    >
      <PanelSection
        className={'align-baseline'}
        headerTitle={
          <h1 className="text-2xl -space-y-1">
            <span className="text-2xl">Session ID:</span>
            <a className="text-indigo-400 font-mono px-1" href={sessionId}>
              {sessionId}
            </a>
          </h1>
        }
        icon={<Globe size={36} className="text-indigo-400" />}
        headerRight={
          <button
            onClick={handleClose}
            className="text-zinc-400 bg-zinc-800 hover:bg-zinc-700 p-2 rounded-full hover:text-gray-200 transition-colors"
          >
            <X size={18} />
          </button>
        }
      >
        <div className="flex flex-col gap-y-2">
          <p className="text-sm tracking-wide font-sans p-1 pb-2 text-zinc-500">
            Make HTTP requests to the following endpoint:
          </p>
          <div className="bg-zinc-800 font-mono rounded-sm p-2 flex gap-x-2">
            <span className="font-semibold pl-1 tracking-wide text-zinc-400">
              POST
            </span>
            <span className="text-zinc-600">{'@'}</span>
            <a href={url.href} className="text-orange-400 font-mono text-sm]">
              {url.href}
            </a>
          </div>
          <div className="flex flex-col py-4 gap-y-2">
            <div className="flex flex-row border-[2px] rounded-lg border-zinc-700/30 p-2 items-start gap-y-2 justify-evenly px-1 gap-x-4">
              <NumberedItem number={1}>Copy code</NumberedItem>
              <NumberedItem number={2}>Send Logs</NumberedItem>
              <NumberedItem number={3}>View in real time</NumberedItem>
            </div>
          </div>
          <a
            href="/docs"
            className="text-center text-xs text-zinc-700 hover:underline"
          >
            Click to view docs
          </a>
        </div>
      </PanelSection>

      {/* Code Snippet Section */}
      <PanelSection
        headerTitle={'Code Snippet'}
        icon={<Code size={ICON_SIZE} className="text-green-400" />}
      >
        <div className="rounded flex shrink min-h-0 flex-col gap-y-2 text-sm font-mono overflow-x-auto">
          <>
            <p className="font-sans tracking-wide px-1">
              Example usage (JS/TS):
            </p>
            <CodeSnippet
              lang={'typescript'}
              className="p-3 flex shrink rounded-sm bg-zinc-800"
            >
              {getCodeSnippet(url.href)}
            </CodeSnippet>
          </>
          <>
            <p className="pt-4 px-1 tracking-wide font-sans">
              Example usage (Bash):
            </p>
            <CodeSnippet
              lang="bash"
              className="p-3 flex shrink bg-zinc-800 rounded-sm"
            >
              {`curl -d "hello world" ${url.href}`}
            </CodeSnippet>
          </>
        </div>
      </PanelSection>

      {/* Example Usage Section */}
      <PanelSection
        className="mt-6"
        headerTitle="Example Usage"
        icon={<FileText size={ICON_SIZE} />}
      >
        <p className="text-sm tracking-wide font-sans px-1 pb-2">
          Click the following examples to see a live preview in the browser!
        </p>
        <div className="space-y-2 flex flex-col gap-y-2">
          {[
            'dump("Hello, world!")',
            'dump({ data: 123 })',
            'dump([1, 2, 3, 4, 5])',
            'dump("[error] demo:", { message: "Testing!" })',
          ].map((cmd) => (
            <button
              key={cmd}
              onClick={() => eval(cmd)}
              className="w-full text-left px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm transition-colors"
            >
              <CodeSnippet lang={'typescript'}>{cmd}</CodeSnippet>
            </button>
          ))}
        </div>
      </PanelSection>

      {/* Stats Section */}
      <PanelSection
        className="mt-6"
        headerTitle="Statistics"
        icon={<ChartNoAxesColumn size={ICON_SIZE} />}
      >
        <div className="px-0.5">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Session ID:</span>
              <span className="text-blue-300">{sessionId}</span>
            </div>
            {clientId ? (
              <div className="flex justify-between">
                <span className="text-zinc-400">Client ID:</span>
                <span className="text-blue-300">{clientId}</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-zinc-400">Status:</span>
              <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                {isConnected ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Messages:</span>
              <span className="text-zinc-200">
                {app.stream?.events.length ?? 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Uptime:</span>
              <span className="text-zinc-200">2h 15m</span>
            </div>
          </div>
        </div>
      </PanelSection>
    </Panel>
  )
}
