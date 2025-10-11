import { cn } from '@/lib/utils'
import {
  codeToHtml,
  type BundledLanguage,
  type BundledTheme,
  type CodeToHastOptions,
} from 'shiki'
import { useAsyncEffect } from './useAsyncEffect'

type CodeOptions = Omit<
  CodeToHastOptions<BundledLanguage, BundledTheme>,
  'themes'
>

export type CodeSnippetProps = CodeOptions & {
  className?: string
  children: string
}

/**
 * Displays a code snippet.
 */
export function CodeSnippet({
  children,
  lang = 'typescript',
  ...props
}: CodeSnippetProps) {
  const codeHtml = useAsyncEffect(async () => {
    return await codeToHtml(children, {
      lang: lang,
      theme: 'github-dark',
      ...props,
    })
  }, [children, lang])

  return (
    <div className={cn('flex flex-col shrink w-full', props.className)}>
      <div
        className={cn('[&_*]:!bg-transparent')}
        dangerouslySetInnerHTML={{ __html: codeHtml ?? '' }}
      ></div>
    </div>
  )
}
