import { createPatternMatcher, type PatternMatcher } from '@/lib/client/message'
import { useMemo } from 'react'

export function usePatternMatcher(patterns: PatternMatcher[]) {
  return useMemo(() => createPatternMatcher(patterns), [patterns])
}
