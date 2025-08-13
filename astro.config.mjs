import { defineConfig } from "astro/config"
import tailwindcss from "@tailwindcss/vite"
import node from "@astrojs/node"
import react from "@astrojs/react"

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ["bun:sqlite", "lucide-react"],
      include: ["react", "react-dom"],
    },
    ssr: {
      external: ["bun:sqlite"],
    },
    build: {
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
  integrations: [react()],
  adapter: node({
    mode: "standalone",
  }),
  security: {
    checkOrigin: false,
  },
  server: {
    cors: false,
  },
  build: {
    inlineStylesheets: "never",
  },
})
