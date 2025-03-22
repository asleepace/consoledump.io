# [ConsoleDump.io](https://consoledump.io)

A simple online interface which you can pipe debug logs from any environment to your browser!

<img width="1473" alt="Screenshot 2025-02-10 at 11 42 50 PM" src="https://github.com/user-attachments/assets/5adab20e-969f-4902-b801-aafc22617b0f" />


Website is live at https://consoledump.io

## Usage

Go to the website and start a new session (one click), then simply pipe data like so:

```js
// get from website
const sessionId = '<your_session_id>';

// run this code anywhere to see logs appear in real time!
fetch(`https://consoledump.io/${sessionId}`, {
  method: 'POST',
  body: JSON.stringify({
    data: "hello world"
  })
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
