import { cn } from '@/lib/utils'
import {
  codeToHtml,
  type BundledLanguage,
  type BundledTheme,
  type CodeToHastOptions,
} from 'shiki'
import { useAsyncEffect } from './useAsyncEffect'

export type CodeSnippetProps = CodeToHastOptions<
  BundledLanguage,
  BundledTheme
> & {
  className?: string
  children: string
}

/**
 * Displays a code snippet.
 * @param props
 * @returns
 */
export function CodeSnippet({
  children,
  lang = 'typescript',
}: CodeSnippetProps) {
  const codeHtml = useAsyncEffect(async () => {
    return await codeToHtml(children, {
      lang: lang,
      theme: 'github-dark',
    })
  }, [children, lang])

  return (
    <div className={cn('flex flex-col w-full')}>
      <div
        className={cn('[&_*]:!bg-transparent p-3')}
        dangerouslySetInnerHTML={{ __html: codeHtml ?? '' }}
      ></div>
    </div>
  )
}
