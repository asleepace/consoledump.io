---
title: 'Docs'
description: "Documentation on how to use the consoledump service and it's various features."
pubDate: '9/2/2025'
heroImage: '/images/aboutjpg'
hashTags: 'Consoledump, Docs, About, How'
slug: 'about'
---

# Documentation

Documentation on how to use the consoledump service and it's various features.

## Basic Usage

To get started with consoledump <a href="/">click here</a> to create a new session and make note of the `/sessionId` which appears as the last part of the URL (i.e. `42a66873`).

Once you have created a new session an obtained the unique session ID, you can test piping data with the following bash command:

```bash
curl -d "hello world" https://consoledump.io/42a66873
```

or by making a simple `POST` request in JS/TS:

```ts
fetch(`https//consoledump.io/${sessionId}`, {
  method: 'POST',
  body: 'Hello, world!',
})
```

## Advanced Usage

You can use the following snippet to override the default JS `console` methods and pipe to a specific endpoint:

```ts
// declare a new property on console (typescript only)
declare global {
  interface Console {
    sessionId: string
  }
}

// define a sessionId property on the console so it can be configured
Object.defineProperty(console, 'sessionId', {
  value: '42a66873',
  writable: true,
})

// wrap console in a proxy which will intercept all logs
console = new Proxy(console, {
  get(target, prop) {
    const method = target[prop]

    if (typeof method !== 'function') {
      return method
    }

    const override = async (...args: any[]) => {
      fetch(`https://consoledump.io/${target.sessionId}`, {
        method: 'POST',
        body: JSON.stringify(args),
        headers: {
          'x-dump-encoding': 'json/args',
          'x-dump-version': '1.0',
        },
      })
    }

    return (...args) => {
      override(...args).catch(() => {}) // ignore warnings
      method.apply(target, args) // also log locally
    }
  },
})
```

Make sure that you do this in your apps entry point or at the top of your JS/TS file, then you can use it like so:

```ts
// make sure to set the session id somewhere
console.sessionId = '42a66873'

// now logs should appear both locally an online!
console.log('Hello, world!')
```

## Bash Script

You can also download a simple bash script which you can use to pipe your stdout to a consoledump session.

```bash
# install the bash script and source your profile
curl -sSL https://consoledump.io/sh

source ~/.zshrc
```

Then you can redirect the output of your terminal to your consoledump session:

```bash
echo "this is a test" | consoledump 42a66873
```

This can also be used with long running processes like the following:

```bash
npm run dev | consoledump 42a66873
```
