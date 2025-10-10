import { useCurrentUrl } from '@/hooks/useCurrentUrl'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'

export type CodeSnippetProps = {
  lang?: string
  theme?: string
  children: string
  className?: string
}

/**
 * Displays a code snippet.
 * @param props
 * @returns
 */
export function CodeSnippet(props: CodeSnippetProps) {
  const url = useCurrentUrl()
  const href = useMemo(() => {
    const encoded = new URL('/docs/snippet', url)
    if (props.lang) {
      encoded.searchParams.set('lang', props.lang)
    }
    if (props.theme) {
      encoded.searchParams.set('theme', props.theme)
    }

    encoded.searchParams.set('code', props.children)
    return encoded.href
  }, [url])

  return (
    <iframe
      className={cn('flex flex-col w-full min-h-44', props.className)}
      sandbox="allow-same-origin allow-scripts"
      src={href}
    />
  )
}
