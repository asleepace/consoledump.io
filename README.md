# [consoledump](https://consoledump.io).io

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
