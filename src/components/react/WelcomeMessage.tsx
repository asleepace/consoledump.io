import { Zap, Copy, CheckCheck } from 'lucide-react'
import React, { useState } from 'react'
import { CodeSnippet } from './CodeSnippet'

// function CodeSnippet({
//   children,
//   className = '',
// }: React.PropsWithChildren<{ className?: string }>) {

//     return (
//         <CodeSnippet >{children}</CodeSnippet>
//     )

//   return (
//     <pre className={className}>
//       <code className="text-sm text-zinc-300">{children}</code>
//     </pre>
//   )
// }

export function WelcomeMessage({
  url = 'https://dump.example.com/stream/abc123',
}) {
  const [copied, setCopied] = useState(false)

  const codeMessage = `function dump(...args) {
  return fetch('${url}', {
    method: 'POST',
    body: JSON.stringify(args)
  })
}`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeMessage)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-8">
      <div className="max-w-6xl w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Content */}
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 bg-zinc-800/50 border border-zinc-700 rounded-full px-4 py-2 w-fit">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-zinc-300 font-medium">
                Fast • Simple • Reliable
              </span>
            </div>

            <h1 className="font-black text-6xl bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent leading-tight">
              Welcome to dump!
            </h1>

            <p className="text-lg text-zinc-400 leading-relaxed">
              Start streaming your logs in seconds. Copy the snippet, paste it
              in your code, and watch your data flow in real-time.
            </p>

            <div className="flex flex-col gap-3 mt-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-zinc-400 shrink-0 mt-0.5">
                  1
                </div>
                <p className="text-zinc-300">Copy the code snippet</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-zinc-400 shrink-0 mt-0.5">
                  2
                </div>
                <p className="text-zinc-300">Paste it in your project</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-zinc-400 shrink-0 mt-0.5">
                  3
                </div>
                <p className="text-zinc-300">Start sending logs</p>
              </div>
            </div>
          </div>

          {/* Right side - Code snippet */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-zinc-600 to-zinc-700 rounded-lg blur opacity-25"></div>
            <div className="relative bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-800/50">
                <span className="text-sm font-medium text-zinc-400">
                  index.js
                </span>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckCheck className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <CodeSnippet lang={'typescript'} className="p-6 overflow-x-auto">
                {codeMessage}
              </CodeSnippet>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
