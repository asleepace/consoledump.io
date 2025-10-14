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
const dump = (...args: any[]) =>
  fetch(`https://consoledump.io/${sessionId}`, {
    method: 'POST',
    body: JSON.stringify(args),
  })

// example usage:
dump('hello world!')
dump({ data: 123, name: 'Leeroy' })
dump('an error occurred:', new Error('Uh oh!'))
```

The goal is to be able to call `fetch` just like `console.log`!

## Core Concepts

The Message Rendering System is a flexible, extensible architecture for parsing, formatting, and displaying console-style log messages in the browser. It normalizes various input formats into a consistent structure and provides powerful customization through a renderer pattern.

- ### Content Types

All messages are normalized into one of two types:

```ts
type MessageContent =
  | { type: 'array'; data: any[] }   // Multiple items: dump('hello', {x: 1})
  | { type: 'object'; data: object } // Single object: dump({x: 1})
```

Normalization rules:

- `dump('hello', 123, {x: 1})` → array with 3 items
- `dump({x: 1})` → object with single item
- `dump('plain text')` → array with 1 string item
- Plain strings (non-JSON) → array with 1 item
- Already-parsed objects → preserved as-is

- ### Renderers

Renderers are functions that convert JavaScript values into HTML strings. Each renderer decides whether it can handle a value and returns either an HTML string or null.

```ts
type ItemRenderer = (item: any, ctx: RenderContext) => string | null

type RenderContext = {
  renderers: ItemRenderer[]            // All available renderers
  renderItem: (item: any) => string    // Recursively render nested items
}
```

- ### Pattern Matching

Patterns control how messages are styled and rendered based on their content.

```ts
type PatternMatcher = {
  match: RegExp | ((msg: Message) => boolean)  // How to match
  badgeName?: string                           // Badge label (error, warn, etc.)
  className?: string                           // CSS classes to add
  renderer?: ItemRenderer                      // Custom renderer for this pattern
  only?: boolean                               // Stop matching after this pattern
}
```

- ### Custom Messages

Below is an example on how to create customized elements in the display:

```ts
import { createPatternMatcher } from './parser'

// Create a matcher with patterns
const matcher = createPatternMatcher([
  { match: /error:/gi, badgeName: 'error', className: 'text-red-500' },
  { match: /warn:/gi, badgeName: 'warn', className: 'text-yellow-400' },
  { 
    match: (msg) => msg.badge.name === 'connected',
    renderer: () => {
      return `<span class="success">✓ Connected to ${window.location.href}</span>`
    }
  }
])

// Parse a message event
const message = matcher.parse(messageEvent)

// Use in your component
console.log(message.html)         // Get rendered HTML
console.log(message.timestamp)    // HH:MM:SS:MS format
console.log(message.badge.name)   // 'error', 'warn', etc.
console.log(message.className)    // 'text-red-500'
```


## Project

This project is written using [Astro](https://astro.build/), [Bun.js](https://bun.com/) and [React](https://react.dev/).

| Astro    | Bun      | React     |
| -------- | -------- | --------- |
| `5.12.9` | `1.2.20` | `^19.2.0` |

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

throw new ApiError('Uh oh!')
throw new ApiError('Uh oh!', { info: 123 })

const e = new ApiError('Something bad happened.')
console.log(e instanceof Error) // true
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
