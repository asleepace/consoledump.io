import { Elysia, t, ws } from 'elysia'

const app = new Elysia()
  .onRequest(() => {
    console.log('On request')
  })
  .on('beforeHandle', () => {
    console.log('Before handle')
  })
  .post('/mirror', ({ body }) => body, {
    body: t.Object({
      username: t.String(),
      password: t.String()
    }),
    afterHandle: () => {
      console.log("After handle")
    }
  })

app.listen(3000, () => {
  console.log(`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`)
})

