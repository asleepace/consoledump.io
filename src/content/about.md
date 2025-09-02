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

```ts
console.dump = (...args) =>
  fetch('https//consoledump.io/<session_id>', {
    method: 'POST',
    body: JSON.stringify(args),
  })
```
