/**
 * Copies data to the users clipboard.
 */
export async function copyToClipboard(text: string) {
  await window.navigator.clipboard.writeText(text)
}
