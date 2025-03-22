// @ts-check
import { defineConfig } from 'astro/config'

import tailwindcss from '@tailwindcss/vite'
import node from '@astrojs/node'
import react from '@astrojs/react'

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [react()],
  adapter: node({
    mode: 'standalone',
  }),
  security: {
    checkOrigin: false,
  },
})
