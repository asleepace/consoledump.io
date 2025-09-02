---
title: 'Docs'
description: "Documentation on how to use the consoledump service and it's various features."
pubDate: '9/2/2025'
heroImage: '/images/aboutjpg'
hashTags: 'Consoledump, Docs, About, How'
slug: 'about'
---

# Docs

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
