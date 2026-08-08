import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

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
        if (deepseekApiKey && deepseekApiKey !== '你的密钥') {
          proxyReq.setHeader('Authorization', `Bearer ${deepseekApiKey}`)
        }
      })
    },
  }

  return {
    base: '/ai-notebook/',
    plugins: [basicSsl(), react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api/deepseek': deepseekProxy,
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      proxy: {
        '/api/deepseek': deepseekProxy,
      },
    },
  }
})
