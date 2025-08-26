# [ConsoleDump.io](https://consoledump.io)

A simple online interface which you can pipe debug logs from any environment to your browser!

<img width="1473" alt="Screenshot 2025-02-10 at 11 42 50 PM" src="https://github.com/user-attachments/assets/5adab20e-969f-4902-b801-aafc22617b0f" />

Website is live at https://consoledump.io

## Getting Started

```bash
pm2 start --name "consoledump.io" --watch --interpreter $(which bun) dist/server/entry.mjs
```

## Usage

Go to the website and start a new session (one click), then simply pipe data like so:

```js
// get from website
const sessionId = '<your_session_id>'

// run this code anywhere to see logs appear in real time!
fetch(`https://consoledump.io/${sessionId}`, {
  method: 'POST',
  body: JSON.stringify({
    data: 'hello world',
  }),
})
```

## General

Hosted on the same server as [asleepace.com](https://asleepace.com) at `192.241.216.26`, to connect run the following

```bash
# connect to remote server
ssh root@192.241.216.26

# open console dump directory
cd ~/consoledump.io

# fetch latest version
git stash .
git pull --force

# build application
bun install

# restart application
pm2 restart consoledump.io
```

### Qucik Start

```bash
# run in development mode
bun run dev

#or, run in production mode
bun run start
```

### Helpful Resources

- [Bun documentation](https://bun.sh/docs)
- [Elysia documentation](https://elysiajs.com/)
- [CSS Effects & Titles](https://freefrontend.com/css-text-effects/)
- [Cool website title scss](https://codepen.io/wheatup/pen/mdwWvGq)

# Astro Starter Kit: Basics

```sh
npm create astro@latest -- --template basics
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/basics)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/astro/tree/latest/examples/basics)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/withastro/astro?devcontainer_path=.devcontainer/basics/devcontainer.json)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

![just-the-basics](https://github.com/withastro/astro/assets/2244813/a0a5533c-a856-4198-8470-2d67b1d7c554)

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src/
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
