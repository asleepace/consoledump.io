import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import node from '@astrojs/node'
import react from '@astrojs/react'
import mdx from '@astrojs/mdx'

// https://astro.build/config
export default defineConfig({
  site: 'https://consoledump.io',
  integrations: [
    react(),
    sitemap(),
    mdx({
      syntaxHighlight: 'shiki',
      shikiConfig: {
        theme: 'dracula',
        wrap: true,
      },
    }),
  ],
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  security: {
    checkOrigin: false,
  },
  server: {
    cors: false,
    port: 8082,
    host: '127.0.0.1',
  },
  build: {
    inlineStylesheets: 'never',
  },
  // Reduce HTML size in production builds
  compressHTML: true,
  // Slightly reduces dev overhead
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      // Prebundle common and heavy deps to speed up dev server startup & HMR
      include: [
        'react',
        'react-dom',
        'lucide-react',
        '@tabler/icons-react',
        '@asleepace/try',
      ],
      exclude: ['bun:sqlite'],
      force: true,
      esbuildOptions: {
        target: 'es2020',
      },
    },
    ssr: {
      external: ['bun:sqlite'],
    },
    resolve: {
      alias: {
        '@': '/src',
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      fs: {
        strict: true,
      },
    },
    build: {
      target: 'es2020',
      rollupOptions: {
        // ignore these files when bundling...
        external: [
          /highlight\.js\/styles\/.+\.css$/,
          /typescript\.js/,
          /@\/db\/.*/,
        ],
      },
    },
  },
})
