const allowedCharacters =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

const validCharacters = new Set(allowedCharacters.split(""))
const totalLength = allowedCharacters.length

function getRandomChar() {
  const index = Math.floor((totalLength + 1) * Math.random())
  return allowedCharacters.at(index)
}

export type SesssionId = string
export const SESSION_ID_LENGTH = 6

/**
 * Generate a new random session ID of the specified length, defaults to 6 alphanumeric characters.
 *
 * @param {Number} length (optional) length of string.
 */
export function generateSessionId(): SesssionId {
  const sessionId = Array(6).fill(0).map(getRandomChar).join("")
  console.log("[generateSessionId] created: ", sessionId)
  return String(sessionId)
}

/**
 * Check if a provided session id is a valid session id.
 */
export function isValidSessionId(
  sessionId: SesssionId | string | null | undefined
): sessionId is SesssionId {
  if (!sessionId) return false
  const chars = sessionId.at(0) === "/" ? sessionId.slice(1) : sessionId
  if (chars.length !== SESSION_ID_LENGTH) return false
  return chars.split("").every((char) => validCharacters.has(char))
}
