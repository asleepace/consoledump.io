import { siteConfig } from '@/consts'
import path from 'node:path'
import { publicDir } from 'astro:config/server'
import { exists } from 'node:fs/promises'

/** Get timestamp in format `YYY-MM-DD-HH` */
export function getIsoTimestamp() {
  return new Date().toISOString().slice(0, 13).replace(/:/g, '-')
}

/**
 * Creates a file name formatted as:
 *
 * ```ts
 * // YYY-MM-DD-HH-sessionId.log
 * const fileName = "2025-10-09-14-abc123.log"
 * ```
 */
export function makeFileName(sessionId: SessionId): string {
  return `${getIsoTimestamp()}-${sessionId}.log`
}

/**
 * Get log files output directory.
 */
function getOutputDir() {
  return siteConfig.logFiles.outputDir
}

/**
 * Maps over files in `public/dumps/*.log`
 */
export async function fileIterator<T>(
  callbackFn: (file: Bun.BunFile) => Promise<T> | T
): Promise<T[]> {
  const files = new Bun.Glob('*.log')
  const callbackResults = new Array<T>()

  const pubDir = publicDir.toString()
  const dumps = path.join(pubDir, 'dumps').replace('file:', '')
  const doesExist = await exists(dumps)
  console.log('[dumps] info', { publicDir, filePath: dumps, doesExist })

  for await (const filePath of files.scan({
    cwd: dumps,
  })) {
    try {
      const output = await callbackFn(Bun.file(filePath))
      callbackResults.push(output)
    } catch (e) {
      console.warn('[file-utils] iterator error:', e)
    }
  }

  return callbackResults
}

export function getAgeInHours(ms: number) {
  return (Date.now() - ms) / 3_600_000
}

export const fileUtils = {
  makeFileName,
  getOutputDir,
  fileIterator,
  getAgeInHours,
}
