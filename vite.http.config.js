import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const deepseekApiKey = (env.VITE_DEEPSEEK_API_KEY || '').trim()

  const deepseekProxy = {
    target: 'https://api.deepseek.com',
    changeOrigin: true,
    rewrite: (path) => {
      const rest = path.replace(/^\/api\/deepseek/, '')
      return rest || '/v1/chat/completions'
    },
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => {
        if (deepseekApiKey && deepseekApiKey !== '浣犵殑瀵嗛挜') {
          proxyReq.setHeader('Authorization', `Bearer ${deepseekApiKey}`)
        }
      })
    },
  }

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5174,
      strictPort: true,
      proxy: {
        '/api/deepseek': deepseekProxy,
      },
    },
  }
})
