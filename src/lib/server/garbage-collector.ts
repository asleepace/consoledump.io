import { fileUtils } from '@/lib/server/file-utils'
import { resolve } from 'bun'

const KB = 1024
const MB = 1024 * KB
const GB = 1024 * MB

function round(num: number): number {
  return Math.round(num * 10_000) / 10_000
}

/**
 * Garbage collection utilities.
 */
export const gc = {
  DUMPS_DIR: 'public/dumps',
  MAX_AGE_HOURS: 24,
  MAX_FILE_SIZE_MB: 5,
  MAX_DISK_SPACE_GB: 2,

  get hasMemoryWarning() {
    return this.shouldRunCleanup || this.diskUsagePercentage >= 0.8
  },

  get maxFileSizeBytes() {
    return this.MAX_FILE_SIZE_MB * MB
  },

  get maxDiskSpaceBytes() {
    return this.MAX_DISK_SPACE_GB * GB
  },

  get maxAgeInMs() {
    return this.MAX_AGE_HOURS * 3_600_000
  },

  get diskUsagePercentage(): number {
    return round(this.totalBytesOnDisk / this.maxDiskSpaceBytes)
  },

  get lastRanInMinutes(): number {
    return (Date.now() - this.lastRanAt) / 60_000
  },

  shouldRunCleanup: true, // cleanup on start
  lastRanAt: Date.now(),
  totalBytesOnDisk: 0,
  totalFiles: 0,

  runGarbageCollection,
  deleteFile,
  bulkDeletion,
}

console.log('[gc] dumps dir:', gc.DUMPS_DIR)

async function deleteFile(file: Bun.BunFile) {
  try {
    console.log('[gc] deleting:', file.name)
    if (!(await file.exists()))
      return console.log('[gc] file not found:', file.name)
    await file.unlink()
    gc.totalBytesOnDisk -= file.size
    gc.totalFiles -= 1
  } catch (e) {
    console.warn('[gc] delete error:', e)
  }
}

async function bulkDeletion(files: Bun.BunFile[]) {
  await Promise.allSettled(
    files.map(async (logFile) => {
      console.log('[gc] bulk deleting:', logFile)
      return await deleteFile(logFile)
    })
  )
}

/**
 * ## Garbage collection
 *
 * iterates over persisted `*.log` files in `public/dumps` and determines
 * if the total usage is above our disk space threshold. If above
 * it will perform the following:
 *
 *  1. Cleanup older files (> 24 hours)
 *  2. Cleanup and/or reset large files (> 5 MB)
 *  3. Cleanup and delete everything
 *
 * Since persistence is a nice feature to have, if we are under the memory limits
 * then there is no need to cause a GC event.
 *
 * TODO: add compression & archives.
 *
 * @note add defensive mode against spam.
 */
export async function runGarbageCollection({ force = false } = {}) {
  try {
    // run only every ~10 mins if no memory warning (or not flagged)
    // or called with `force: true`
    //if (!force && gc.lastRanInMinutes <= 10 && !gc.hasMemoryWarning) return

    gc.shouldRunCleanup = false
    gc.lastRanAt = Date.now()
    gc.totalBytesOnDisk = 0
    gc.totalFiles = 0

    // single pass to collect metrics
    const logFiles = await fileUtils.fileIterator((file) => {
      gc.totalBytesOnDisk += file.size
      gc.totalFiles += 1
      return file
    })

    // do nothing if we are under 80% usage
    // if (!gc.hasMemoryWarning) return

    console.log('[gc] triggered:', {
      totalBytes: gc.totalBytesOnDisk,
      diskUsage: gc.diskUsagePercentage,
      totalFiles: gc.totalFiles,
    })

    // otherwie cleanup files over 24 hours
    await bulkDeletion(
      logFiles.filter((log) => Date.now() - log.lastModified >= gc.maxAgeInMs)
    )

    if (!gc.hasMemoryWarning) return

    // otherwise start deleting bulk files
    await bulkDeletion(
      logFiles.filter((log) => log.size >= gc.maxFileSizeBytes)
    )

    if (!gc.hasMemoryWarning) return

    // if we are above memory (> 100%) usage clear everything!
    await bulkDeletion(logFiles)
  } catch (e) {
    console.warn('[gc] collection failed:', e)
  }
}
