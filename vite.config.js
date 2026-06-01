import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Dev-only middleware that serves the same handlers found in /api as Vercel
 * serverless functions, so `npm run dev` works end-to-end WITHOUT shipping the
 * service role key to the browser. The key lives only in this Node process.
 *
 * In production on Vercel, the /api folder is auto-detected as serverless
 * functions and this middleware is never used.
 */
function devApiPlugin(env) {
  return {
    name: 'dev-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next()

        // Route -> handler file. Strip query string.
        const route = req.url.split('?')[0].replace(/\/$/, '')
        const name = route.slice('/api/'.length)
        const allowed = ['create-student', 'create-teacher']
        if (!allowed.includes(name)) return next()

        try {
          // Ensure env vars are visible to the handler during dev.
          process.env.SUPABASE_URL = process.env.SUPABASE_URL || env.SUPABASE_URL
          process.env.SUPABASE_SERVICE_ROLE_KEY =
            process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY

          const mod = await server.ssrLoadModule(`/api/${name}.js`)
          const handler = mod.default

          // Parse JSON body.
          const body = await readJsonBody(req)

          // Minimal Vercel-style res shim.
          const resShim = {
            statusCode: 200,
            status(code) {
              this.statusCode = code
              return this
            },
            json(payload) {
              res.statusCode = this.statusCode
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(payload))
            },
            setHeader(k, v) {
              res.setHeader(k, v)
            },
            end(v) {
              res.end(v)
            },
          }

          await handler({ method: req.method, headers: req.headers, body }, resShim)
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message || 'Internal error' }))
        }
      })
    },
  }
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => (data += chunk))
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch {
        resolve({})
      }
    })
  })
}

export default defineConfig(({ mode }) => {
  // Load ALL env vars (including non-VITE_ ones) for the dev API middleware.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), devApiPlugin(env)],
    server: {
      port: 5173,
    },
  }
})
