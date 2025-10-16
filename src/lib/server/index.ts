import { ConsoleDumpSessions } from './session'

/**
 * Application session object which contains all consoledump.io sessions.
 */
export const sessions = new ConsoleDumpSessions({
  maxSessions: 100_000,
})
