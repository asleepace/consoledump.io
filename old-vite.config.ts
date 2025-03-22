import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './', // NOTE: This allows asset paths to be relative.
  resolve: {
    alias: {
      '@/*': 'src/*',
    },
  },
})
