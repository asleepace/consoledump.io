import { Zap, Copy, CheckCheck } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { CodeSnippet } from './CodeSnippet'
import { cn } from '@/lib/utils'

interface Props {
  url: URL | string
}

const snippetJs = (url: URL | string) =>
  `function dump(...args) {
  return fetch('${url}', {
    method: 'POST',
    body: JSON.stringify(args)
  })
}`.trim()

const snippetTs = (url: URL | string) =>
  `
function dump(...args: any[]): Promise<Response> {
  return fetch('${url}', {
    method: 'POST',
    body: JSON.stringify(args)
  })
}`.trim()

const snippetBash = (url: URL | string) => `curl -d "hello world" ${url}`

export function WelcomeMessage({ url }: Props) {
  const [copied, setCopied] = useState(false)
  const [lang, setLang] = useState('javascript')

  const supportedLanguages = ['Javascript', 'Typescript', 'Bash']

  const codeMessage = useMemo(() => {
    switch (lang) {
      case 'bash':
        return snippetBash(url)
      case 'typescript':
        return snippetTs(url)
      default:
        return snippetJs(url)
    }
  }, [url, lang])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeMessage)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 pb-32">
      <div className="max-w-6xl w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Content */}
          <div className="flex flex-col gap-6 -mt-20">
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

            <div className="flex flex-col gap-3 my-4">
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

            <a className="text-zinc-500 hover:underline" href="/docs">
              Read documentation
            </a>
          </div>

          {/* Right side - Code snippet */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-zinc-600 to-zinc-700 rounded-lg blur opacity-25"></div>
            <div className="relative bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-800/50">
                <span className="text-sm font-medium text-zinc-400">
                  {lang === 'typescript'
                    ? 'index.ts'
                    : lang === 'javascript'
                    ? 'index.js'
                    : lang === 'bash'
                    ? 'index.sh'
                    : 'example'}
                </span>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors"
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
              <CodeSnippet
                lang={lang}
                className="p-6 overflow-x-auto aspect-[5/2]"
              >
                {codeMessage}
              </CodeSnippet>
              <div className="bg-zinc-950/50 border-t border-t-zinc-800/50 flex gap-x-2 p-4">
                {supportedLanguages.map((language) => {
                  return (
                    <button
                      className={cn(
                        'px-3 py-1 text-xs rounded-full tracking-wide font-semibold text-zinc-500 border border-zinc-700',
                        lang === language.toLowerCase()
                          ? 'bg-yellow-500 text-zinc-950s'
                          : 'bg-zinc-800 hover:bg-zinc-700'
                      )}
                      onClick={() => setLang(language.toLowerCase())}
                    >
                      {language}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
