import { createPatternMatcher } from '../src/lib/client/mesage-parser'
import { describe, expect, it } from 'bun:test'

/**
 * Create a JSON encoded message event.
 *
 * @note this is primarily how the api works.
 */
function msg(...args: any[]) {
  return new MessageEvent(JSON.stringify(args))
}

describe(() => {
  it('Should match with basic regex', () => {
    const matcher = createPatternMatcher([
      { match: /(error:)/gi, badgeName: 'error' },
    ])

    const example1 = matcher.parse(
      new MessageEvent('message', { data: 'Error: this is an error.' })
    )
    const example2 = matcher.parse(
      new MessageEvent('message', { data: 'error: this is an error.' })
    )
    const example3 = matcher.parse(
      new MessageEvent('message', {
        data: { error: 'Error: this is an error.' },
      })
    )
    const example4 = matcher.parse(
      new MessageEvent('message', { data: ['Error: this is an error.'] })
    )

    expect(example1.badge.name).toBe('error')
    expect(example2.badge.name).toBe('error')
    expect(example3.badge.name).toBe('error')
    expect(example4.badge.name).toBe('error')
  })
})
