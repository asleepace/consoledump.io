/**
 * ## SiteConfig
 *
 * This represents the default configuration of the consoledump website.
 */
export const siteConfig = {
  url: import.meta.env.DEV
    ? 'http://127.0.0.1:8082/'
    : 'https://consoledump.io/',
  title: 'Consoledump',
  description:
    'Easily debug in low visibility environments remotely for free with consoledump.io!',
  coverImage: 'https://consoledump.io/images/cover.png',
  keywords:
    'remote, debug, debugging, logging, free, software, programming, engineering, asleepace',
  themeColor: '#171717',
  author: '@asleepace',
  robots: 'index, follow',
  viewport: 'width=device-width, initial-scale=1.0',
  favicon: {
    svg: '/favicon.svg',
    ico: '/favicon.ico',
    png32: '/favicon-32x32.png',
    png16: '/favicon-16x16.png',
    png180: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  type: 'website',
  /**
   * Specific configuration for log files.
   */
  logFiles: {
    outputDir: 'public/dump',
    maxAgeHours: 24,
    maxSizeInMb: 5,
  },
} as const

/**
 * Export as type as well.
 */
export type SiteConfig = typeof siteConfig
