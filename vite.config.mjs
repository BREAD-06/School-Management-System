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
        const allowed = ['create-student', 'create-teacher', 'reset-password', 'send-sms', 'messages']
        if (!allowed.includes(name)) return next()

        try {
          // Ensure env vars are visible to the handler during dev. (On Vercel
          // these come from Project Settings -> Environment Variables.)
          process.env.SUPABASE_URL = process.env.SUPABASE_URL || env.SUPABASE_URL
          process.env.SUPABASE_SERVICE_ROLE_KEY =
            process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY
          // MSG91 (server-side SMS proxy). The browser bundle reads the VITE_*
          // copy; the proxy reads either MSG91_* or the VITE_* fallback.
          process.env.MSG91_API_KEY =
            process.env.MSG91_API_KEY || env.MSG91_API_KEY || env.VITE_MSG91_API_KEY
          process.env.MSG91_SENDER_ID =
            process.env.MSG91_SENDER_ID || env.MSG91_SENDER_ID || env.VITE_MSG91_SENDER_ID
          process.env.MSG91_TEMPLATE_ID =
            process.env.MSG91_TEMPLATE_ID || env.MSG91_TEMPLATE_ID || env.VITE_MSG91_TEMPLATE_ID

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
  // Load server-side env vars for the dev API middleware (Supabase service role
  // + MSG91 keys). VITE_* vars are loaded too so the SMS proxy can fall back to
  // the existing VITE_MSG91_* values during local development.
  const env = loadEnv(mode, process.cwd(), ['SUPABASE_', 'MSG91_', 'VITE_MSG91_'])
  return {
    plugins: [react(), devApiPlugin(env)],
    // Files in /public are served at the site root and copied as-is into the
    // build output, so the logo is available at /bjps-logo.png in dev and prod.
    publicDir: 'public',
    server: {
      port: 5173,
      watch: {
        // Ignore esbuild timestamp files to prevent infinite dev server restarts.
        ignored: ['**/vite.config.*.timestamp-*', '**/debug-*.cjs', '**/debug-*.mjs', '**/test-*.cjs'],
      },
    },
    // Pre-declare ALL runtime dependencies so Vite bundles them once on startup
    // rather than discovering them lazily when the browser first loads the page.
    // Without this, Vite sends a full-page reload 1–2 seconds after first load
    // (the "Loading..." screen the user sees) while it re-bundles newly found deps.
    optimizeDeps: {
      include: [
        'react',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom',
        'react-dom/client',
        'react-router-dom',
        '@supabase/supabase-js',
      ],
    },
  }
})

