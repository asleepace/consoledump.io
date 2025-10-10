/**
 * Format a date to a HH:MM:SS timestamp.
 */
export function formatTimestamp(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0')
  const mins = date.getMinutes().toString().padStart(2, '0')
  const secs = date.getSeconds().toString().padStart(2, '0')
  return [hours, mins, secs].join(':')
}