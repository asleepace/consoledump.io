# [Console Dump](https://consoledump.io)

A simple and easy to use tool for quickly setting up remote debugging sessions.

```bash
# download githun repo
git clone https://github.com/asleepace/consoledump.io

# install via bun
bun i

# running development builds locally
bun run dev
bun run preview

# building for production
bun run build
bun run start
```

## How to use?

The goal of consoledump is to make fast and easy to setup & tear down remote logging sessions.

1. Create a new interactive session by visiting https://consoledump.io/
2. Copy and paste the code snippet in the output (or make note of the session id.)
3. Send logs via fetch over the network and view them in real-time!

```ts
// obtained from session:
const sessionId = '<add_session_id>'

// example snippet:
const dump = (...args: any[]) => fetch(`https://consoledump.io/${sessionId}`, {
  method: 'POST',
  body: JSON.stringify(args)
})

// example usage:
dump("hello world!")
dump({ data: 123, name: "Leeroy" })
dump("an error occurred:", new Error('Uh oh!'))
```

The goal is to be able to call `fetch` just like `console.log`!

## Project

This project is written using [Astro](https://astro.build/), [Bun.js](https://bun.com/) and [React](https://react.dev/).

| Astro     | Bun      | React     |
|-----------|----------|-----------|
| `5.12.9`  | `1.2.20` | `^19.2.0` |

Most of the core application logic can be found in the [`@/lib/`](./src/lib/) directory, and mainly in [`stream.ts`](src/lib/server/stream.ts).

- [`@/components/`](src/components/):
  - [`astro/`](src/components/astro/): Astro specific components.
  - [`react/`](src/components/react/): React components (main client app).
- [`@/content/`](src/content/): Markdown for docs
- [`@/hooks/`](src/hooks/): Client-side react based hooks.
- [`@/layouts/`](src/layouts/): Astro based layouts (HTML, CSS, Meta)
- [`@/lib/`](src/lib/):
  - [`client/`](src/lib/client/): client-side logic.
  - [`server/`](src/lib/server/): server-side logic.
  - [`shared/`](src/lib/shared/): shared client & server logic.
- [`@/middleware/`](src/middleware/): Astro backend middleware.
- [`@/pages/`](src/pages/): Astro based routes (pages live here).
- [`@/styles/`](src/styles/): CSS, Tailwind, Themes.

## Technical Snippets

The following are useful bits of information about this project:

- ### Exception Handling

Exceptions thrown by the application should generally use the custom `ApiError` wrapper:

```tsx
import { ApiError } from '@/libs/shared'

throw new ApiError("Uh oh!")
throw new ApiError("Uh oh!", { info: 123 })

const e = new ApiError("Something bad happened.")
console.log(e instanceof Error)   // true
console.log(e instanceof ApiError) // true

e.toResponse() // convert to HTTP response
```

The middleware will catch any errors thrown by the routes and convert them to an HTTP Error response.

```ts
export const GET: APIRoute = (ctx) => {
  if (!ctx.locals.sessionId) {
    throw new ApiError('Missing session id.')
  }
  return Response.json({ ok: true })
}
```


## Notes

See [`src/env.d.ts`](src/env.d.ts) for global type definitions.

## License

This project is distributed under the [MIT License](./LICENSE).