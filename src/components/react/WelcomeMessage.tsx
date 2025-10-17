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

const snippetPython = (url: URL | string) =>
  `import requests, json

def dump(*args):
  return requests.post(
    '${url}', 
    data=json.dumps(args)
  )
`.trim()

const snippetRuby = (url: URL | string) =>
  `require 'net/http'
require 'json'

def dump(*args)
  Net::HTTP.post(
    URI('${url}'), 
    args.to_json, 
    'Content-Type' => 'application/json'
  )
end
`.trim()

const snippetBash = (url: URL | string) => `curl -d "hello world" ${url}`

export function WelcomeMessage({ url }: Props) {
  const [copied, setCopied] = useState(false)
  const [lang, setLang] = useState('javascript')

  const supportedLanguages = [
    'Javascript',
    'Typescript',
    'Python',
    'Ruby',
    'Bash',
  ]

  const codeMessage = useMemo(() => {
    switch (lang) {
      case 'ruby':
        return snippetRuby(url)
      case 'python':
        return snippetPython(url)
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
    <>
      <div className="min-h-screen w-full inset-0 -z-10 absolute overflow-hidden bg-gradient-radial from-transparent via-neutral-600 to-neutral-950 to-100%">
        <iframe
          className="bg-transparent pb-64"
          src="https://my.spline.design/particles-e60429f4a3023dfeecd4752aea2c7cef/"
          frameBorder="0"
          width="140%"
          height="120%"
        ></iframe>
      </div>
      <div className="w-full min-h-screen flex z-10 items-center justify-center from-black/0 bg-radial to-black/100 to-100% px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:pb-32">
        <div className="max-w-6xl w-full">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left side - Content */}
            <div className="flex flex-col gap-4 sm:gap-6 lg:-mt-20">
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 w-fit backdrop-blur-sm">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-orange-400" />
                <span className="text-xs sm:text-sm text-neutral-300 font-medium">
                  Fast • Simple • Free
                </span>
              </div>

              <h1 className="font-black text-4xl sm:text-5xl lg:text-6xl text-white leading-tight tracking-tight">
                Welcome to{' '}
                <span className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
                  ConsoleDump
                </span>
              </h1>

              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed">
                Start streaming your logs in seconds. Copy the snippet, paste it
                in your code, and watch your data flow in real-time.
              </p>

              <div className="flex flex-col gap-2.5 sm:gap-3 my-2 sm:my-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-orange-400 font-semibold shrink-0 mt-0.5">
                    1
                  </div>
                  <p className="text-sm sm:text-base text-neutral-300">
                    Copy the code snippet below
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-orange-400 font-semibold shrink-0 mt-0.5">
                    2
                  </div>
                  <p className="text-sm sm:text-base text-neutral-300">
                    Paste it in your project
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-orange-400 font-semibold shrink-0 mt-0.5">
                    3
                  </div>
                  <p className="text-sm sm:text-base text-neutral-300">
                    Start sending logs instantly
                  </p>
                </div>
              </div>

              <a
                className="text-sm sm:text-base text-neutral-400 hover:text-orange-400 hover:underline underline-offset-4 transition-colors w-fit"
                href="/docs/about"
              >
                Read full documentation →
              </a>
            </div>

            {/* Right side - Code snippet */}
            <div className="relative mt-8 lg:mt-0">
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-xl blur opacity-30"></div>
              <div className="relative bg-neutral-900/50 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-white/10 bg-white/5">
                  <span className="text-xs sm:text-sm font-medium text-neutral-400 font-mono">
                    {lang === 'typescript'
                      ? 'index.ts'
                      : lang === 'javascript'
                      ? 'index.js'
                      : lang === 'bash'
                      ? 'index.sh'
                      : lang === 'ruby'
                      ? 'index.rb'
                      : lang === 'python'
                      ? 'index.py'
                      : 'example'}
                  </span>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm bg-white/5 hover:bg-white/10 border border-white/20 hover:border-white/30 text-neutral-200 rounded-lg transition-all active:scale-95"
                  >
                    {copied ? (
                      <>
                        <CheckCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <CodeSnippet
                  lang={lang}
                  className="p-3 sm:p-4 lg:p-6 overflow-x-auto min-h-[200px] sm:min-h-[220px] lg:aspect-[5/2]"
                >
                  {codeMessage}
                </CodeSnippet>
                <div className="bg-black/30 border-t border-white/10 flex flex-wrap gap-1.5 sm:gap-2 p-2.5 sm:p-3 lg:p-4">
                  {supportedLanguages.map((language) => {
                    return (
                      <button
                        className={cn(
                          'px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs rounded-lg tracking-wide font-medium border transition-all',
                          lang === language.toLowerCase()
                            ? 'bg-orange-400 text-black border-orange-400'
                            : 'bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20'
                        )}
                        onClick={() => setLang(language.toLowerCase())}
                        key={language}
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
    </>
  )
}
