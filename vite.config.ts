import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const fetchDevApiPort = process.env.FETCH_DEV_API_PORT || '8787'
const fetchDevVitePort = Number(process.env.FETCH_DEV_PORT || 5174)

/** Extra dev/preview hostnames allowed past Vite’s host check (proxies, cloud IDEs, Docker). */
function extraAllowedHostsFromEnv(): string[] {
  const split = (value: string | undefined) =>
    value
      ?.split(',')
      .map((h) => h.trim())
      .filter(Boolean) ?? []
  const fromFetch = split(process.env.FETCH_VITE_ALLOWED_HOSTS)
  const fromVite = split(process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS)
  return [...new Set([...fromFetch, ...fromVite])]
}

const extraAllowedHosts = extraAllowedHostsFromEnv()
const allowedHostsOption =
  extraAllowedHosts.length > 0 ? { allowedHosts: extraAllowedHosts } : {}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    /** Avoid prefetching Google Maps until the lazy Home view loads. */
    modulePreload: {
      resolveDependencies: (_filename, deps) =>
        deps.filter((dep) => !dep.includes('maps-vendor')),
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react/')
          ) {
            return 'react-vendor'
          }
          if (id.includes('@react-google-maps')) {
            return 'maps-vendor'
          }
        },
      },
    },
  },
  server: {
    host: true,
    port: fetchDevVitePort,
    ...allowedHostsOption,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${fetchDevApiPort}`,
        changeOrigin: true,
        secure: false,
      },
      '/listing-uploads': {
        target: `http://127.0.0.1:${fetchDevApiPort}`,
        changeOrigin: true,
        secure: false,
      },
      '/drops-uploads': {
        target: `http://127.0.0.1:${fetchDevApiPort}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    ...allowedHostsOption,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${fetchDevApiPort}`,
        changeOrigin: true,
        secure: false,
      },
      '/listing-uploads': {
        target: `http://127.0.0.1:${fetchDevApiPort}`,
        changeOrigin: true,
        secure: false,
      },
      '/drops-uploads': {
        target: `http://127.0.0.1:${fetchDevApiPort}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
