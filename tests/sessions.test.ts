/**
 * Sessions must not leak: one that is only viewed holds no file, idle ones are
 * evicted, and a dump that already exists on disk survives its session being
 * recreated (it used to be truncated).
 */
import { afterAll, describe, expect, mock, test } from 'bun:test'
import { rm } from 'node:fs/promises'

// Astro's virtual config module only exists inside an Astro build.
mock.module('astro:config/server', () => ({ publicDir: new URL('../public/', import.meta.url) }))

const { BufferedFile } = await import('../src/lib/server/buffered-file')
const { ConsoleDumpSessions, IDLE_SESSION_MS } = await import('../src/lib/server/session')

const ids: string[] = []
const newId = () => {
  const id = `test-${crypto.randomUUID().slice(0, 8)}`
  ids.push(id)
  return id
}
const pathFor = (id: string) => `${BufferedFile.outDir}/${id}.log`

afterAll(async () => {
  await Promise.all(ids.map((id) => rm(pathFor(id), { force: true })))
})

describe('sessions', () => {
  test('a session nobody writes to creates no file', async () => {
    const sessions = new ConsoleDumpSessions({ maxSessions: 10, sweep: false })
    const id = newId()
    await sessions.createSession(id)
    expect(await Bun.file(pathFor(id)).exists()).toBe(false)
  })

  test('an existing dump is kept when its session is recreated and written to', async () => {
    const id = newId()
    await Bun.write(pathFor(id), 'data: earlier\n\n')
    const sessions = new ConsoleDumpSessions({ maxSessions: 10, sweep: false })
    const session = await sessions.createSession(id)
    await session.publish(new Response('later').body!)
    await session.close()
    const text = await Bun.file(pathFor(id)).text()
    expect(text).toContain('earlier')
    expect(text).toContain('later')
  })

  test('an idle session is evicted, and its dump stays on disk', async () => {
    const sessions = new ConsoleDumpSessions({ maxSessions: 10, sweep: false })
    const id = newId()
    const session = await sessions.createSession(id)
    await session.publish(new Response('kept').body!)

    const evicted = await sessions.evictIdleSessions(Date.now() + IDLE_SESSION_MS + 1)

    expect(evicted).toEqual([id])
    expect(sessions.getSession(id)).toBeUndefined()
    expect(await Bun.file(pathFor(id)).text()).toContain('kept')
  })

  test('a session with recent activity is not evicted', async () => {
    const sessions = new ConsoleDumpSessions({ maxSessions: 10, sweep: false })
    const id = newId()
    await sessions.createSession(id)
    expect(await sessions.evictIdleSessions(Date.now())).toEqual([])
    expect(sessions.getSession(id)).toBeDefined()
  })
})
