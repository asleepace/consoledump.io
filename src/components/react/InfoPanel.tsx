import { X, Code, FileText, Info, ChevronLeft } from 'lucide-react'
import { useCurrentUrl } from '@/hooks/useCurrentUrl'
import { useAppContext } from '@/hooks/useAppContext'

export const InfoPanel = () => {
  const { isInfoPanelOpen, setIsInfoPanelOpen } = useAppContext()

  const url = useCurrentUrl()

  const handleClose = () => setIsInfoPanelOpen(false)
  const handleOpen = () => setIsInfoPanelOpen(true)

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
        className={`fixed right-0 font-mono top-0 h-full w-144 bg-zinc-900 text-gray-200 z-50 transform transition-transform duration-300 ease-in-out ${
          isInfoPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4 mb-3">
            <Info size={24} className="text-blue-400" />
            <h3 className="text-lg font-mono font-semibold">
              Session Information
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-zinc-400 hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto h-[calc(100%-60px)]">
          {/* Info Section */}
          <p className="text-sm text-zinc-400">
            Connected to stream at{' '}
            <a href={url.href} className="text-orange-400">
              http://127.0.0.1:8082/adc9ee
            </a>
          </p>

          {/* Code Snippet Section */}
          <div className="my-6">
            <div className="flex items-center gap-2 mb-3">
              <Code size={18} className="text-green-400" />
              <h3 className="font-semibold">Code Snippets</h3>
            </div>
            <div className="bg-zinc-800 p-3 rounded text-xs font-mono overflow-x-auto">
              <span className="text-purple-400">const</span>{' '}
              <span className="text-blue-300">dump</span>{' '}
              <span className="text-gray-300">=</span>{' '}
              <span className="text-gray-300">(</span>
              <span className="text-orange-300">...args</span>
              <span className="text-gray-300">)</span>{' '}
              <span className="text-purple-400">=&gt;</span>{' '}
              <span className="text-blue-300">fetch</span>
              <span className="text-gray-300">(</span>
              <span className="text-yellow-300">
                'http://127.0.0.1:8082/adc9ee'
              </span>
              <span className="text-gray-300">,</span>{' '}
              <span className="text-gray-300">{'{'}</span> <br />
              <p className="pl-4">
                <span className="text-blue-300">method</span>
                <span className="text-gray-300">:</span>{' '}
                <span className="text-yellow-300">'POST'</span>
                <span className="text-gray-300">,</span> <br />
                <span className="text-blue-300">body</span>
                <span className="text-gray-300">:</span>{' '}
                <span className="text-blue-300">JSON</span>
                <span className="text-gray-300">.</span>
                <span className="text-blue-300">stringify</span>
                <span className="text-gray-300">(</span>
                <span className="text-orange-300">args</span>
                <span className="text-gray-300">)</span>
              </p>{' '}
              <span className="text-gray-300">{'}'}</span>
              <span className="text-gray-300">)</span>
            </div>
          </div>

          {/* Commands Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={18} className="text-orange-400" />
              <h3 className="font-semibold">Example Usage</h3>
            </div>
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
          </div>

          {/* Stats Section */}
          <div>
            <h3 className="font-semibold mb-3">Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Messages:</span>
                <span className="text-zinc-200">34</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Uptime:</span>
                <span className="text-zinc-200">2h 15m</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
