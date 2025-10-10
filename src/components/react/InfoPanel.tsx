import {
  X,
  Code,
  FileText,
  Info,
  ChevronLeft,
  Globe,
  ChartArea,
  ChartNoAxesColumn,
} from 'lucide-react'
import { useCurrentUrl } from '@/hooks/useCurrentUrl'
import { useAppContext } from '@/hooks/useAppContext'
import { CodeSnippet } from './CodeSnippet'
import { cn } from '@/lib/utils'
import { useMemo, type JSX } from 'react'
import { ids } from '@/lib/shared/ids'
import { safe } from '@/lib/shared/safe-utils'

export interface InfoPanelProps {
  className?: string
  url: URL
}

const getCodeSnippet = (href: string) =>
  `
const dump = (...args) => {
  return fetch('${href}', {
    method: 'POST',
    body: JSON.stringify(args)
  })
}
`.trim()

type PanelProps = {
  className?: string
  icon?: JSX.Element
  headerTitle: string
  headerRight?: JSX.Element
}

const PanelSection = (props: React.PropsWithChildren<PanelProps>) => {
  return (
    <div>
      <div className={cn('flex items-center gap-2 mb-3', props.className)}>
        {props.icon}
        <h3 className="text-lg text-zinc-200 font-semibold flex-1">
          {props.headerTitle}
        </h3>
        {props.headerRight}
      </div>
      <div className="flex flex-col shrink">{props.children}</div>
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
    <>
      {/* Toggle button when closed */}
      {!isInfoPanelOpen && (
        <button
          onClick={handleOpen}
          className="fixed right-0 top-1/2 -translate-y-1/2 bg-zinc-800 text-gray-300 p-2 rounded-l-md hover:bg-zinc-700 transition-colors z-40"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {/* Overlay */}
      {isInfoPanelOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={handleClose}
        />
      )}

      {/* Side panel */}
      <div
        className={cn(
          `fixed right-0 font-mono top-0 h-full max-h-screen w-full md:w-144 bg-zinc-900 text-gray-200 z-50 transform transition-transform duration-300 ease-in-out`,
          isInfoPanelOpen ? 'translate-x-0' : 'translate-x-full',
          className
        )}
      >
        {/* Content */}
        <div className="p-4 *:text-sm *:text-zinc-400 flex flex-col overflow-y-auto gap-y-8 min-h-full]">
          {/* Info Section */}

          <PanelSection
            headerTitle={`Session #${sessionId}`}
            icon={<Globe size={24} className="text-orange-400" />}
            headerRight={
              <button
                onClick={handleClose}
                className="text-zinc-400 bg-zinc-800 p-2 rounded-full hover:text-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            }
          >
            <p className="text-sm p-1 text-zinc-500">Connected to stream at:</p>
            <div className="bg-zinc-800 rounded-sm p-2">
              <a href={url.href} className="text-orange-400 ">
                {url.href}
              </a>
            </div>
          </PanelSection>

          {/* Code Snippet Section */}
          <PanelSection
            headerTitle={'Code Snippet'}
            icon={<Code size={24} className="text-green-400" />}
          >
            <div className="rounded flex shrink min-h-0 flex-col gap-y-2 text-xs font-mono overflow-x-auto">
              <p>{'Example usage (JS/TS):'}</p>
              <div className="bg-zinc-800">
                <CodeSnippet className="p-3 flex shrink">
                  {getCodeSnippet(url.href)}
                </CodeSnippet>
              </div>
              <p>{'Example usage (Bash):'}</p>
              <div className="bg-zinc-800">
                <CodeSnippet className="p-3 flex shrink" lang={'bash'}>
                  {`curl -d "hello world" ${url.href}`}
                </CodeSnippet>
              </div>
            </div>
          </PanelSection>

          <PanelSection headerTitle="Example Usage">
            <div className="space-y-2">
              {[
                'dump("Hello, world!")',
                'dump({ data: 123 })',
                'dump([1, 2, 3, 4, 5])',
              ].map((cmd) => (
                <button
                  key={cmd}
                  className="w-full text-left px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm transition-colors"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </PanelSection>

          {/* Stats Section */}
          <PanelSection
            headerTitle="Statistics"
            icon={<ChartNoAxesColumn size={24} />}
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
                  <span
                    className={isConnected ? 'text-green-400' : 'text-red-400'}
                  >
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
        </div>
      </div>
    </>
  )
}
