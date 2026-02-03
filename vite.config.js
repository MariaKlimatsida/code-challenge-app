import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      // Proxy NOVI calls during development to avoid CORS issues in the browser.
      '/api': {
        target: 'https://novi-backend-api-wgsgz.ondigitalocean.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  plugins: [
    react(),
    {
      name: 'code-challenge-debug-log',
      configureServer(server) {
        const LOG_PATH = '/tmp/code-challenge-app-debug.jsonl'

        server.middlewares.use('/__debuglog', (req, res, next) => {
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })
            req.on('end', () => {
              try {
                const line = String(body || '').trim()
                if (line.length > 0) {
                  fs.appendFileSync(LOG_PATH, `${line}\n`, { encoding: 'utf8' })
                }
                res.statusCode = 204
                res.end()
              } catch (e) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'text/plain; charset=utf-8')
                res.end(String(e?.message || e))
              }
            })
            return
          }

          if (req.method === 'GET') {
            try {
              const exists = fs.existsSync(LOG_PATH)
              const text = exists ? fs.readFileSync(LOG_PATH, { encoding: 'utf8' }) : ''
              res.statusCode = 200
              res.setHeader('Content-Type', 'text/plain; charset=utf-8')
              res.end(text)
            } catch (e) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'text/plain; charset=utf-8')
              res.end(String(e?.message || e))
            }
            return
          }

          return next()
        })
      },
    },
  ],
})
