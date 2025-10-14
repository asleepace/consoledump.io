import { siteConfig } from '@/consts'

import posthog, { type Properties } from 'posthog-js'

posthog.init(siteConfig.posthog.apiKey, {
  api_host: 'https://us.i.posthog.com',
  defaults: '2025-05-24',
})

/**
 * Track an event with PostHog.
 *
 * ```ts
 * trackEvent('session_created', {
 *   sessionId: 'abc123',
 *   clientId: '0x123  '
 * })
 * ```
 */
export function trackEvent(eventName: string, options: Properties) {
  posthog.capture(eventName, options)
}
