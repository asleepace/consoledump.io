

export type FileType = 'application/json' | 'text/plain' | 'text/csv'

/**
 * Download text data as a file in the browser.
 *
 * ```ts
 * downloadFile({
 *   fileName: 'output.json',
 *   fileType: 'application/json',
 *   fileData: JSON.stringify({ data: 123 }),
 * })
 * ```
 */
export function downloadFile(options: { fileData: string; fileName: string; fileType: FileType }) {
  const blob = new Blob([options.fileData], { type: options.fileType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.download = options.fileName
  a.href = url
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
