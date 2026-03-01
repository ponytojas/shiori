import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = env.VITE_API_BASE_URL?.trim()
  const hasApiTarget = Boolean(apiBaseUrl && /^https?:\/\//i.test(apiBaseUrl))

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: hasApiTarget
        ? {
            '/api': {
              target: apiBaseUrl,
              changeOrigin: true,
              secure: false,
            },
          }
        : undefined,
    },
  }
})
