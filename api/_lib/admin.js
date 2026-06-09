import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

// Server-side Supabase client using the SERVICE ROLE key. This bypasses RLS and
// must NEVER be imported into client/browser code. It only lives inside /api
// serverless functions (and the Vite dev middleware), where env vars are
// server-only and not bundled to the browser.
export function getAdminClient() {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error(
      'Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.',
    )
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    // We never use realtime server-side, but supabase-js initializes a realtime
    // client in its constructor. On Node < 22 (no native WebSocket) it throws
    // unless given a transport — provide `ws` so it works on Node 20 + Vercel.
    realtime: { transport: ws },
  })
}

// Pull the bearer token from the request (Authorization header or body fallback).
export function getAccessToken(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization
  if (auth && /^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, '').trim()
  return req.body?.accessToken || null
}

// Verifies the caller is a signed-in admin. Returns the admin user or throws.
export async function requireAdmin(admin, req) {
  const token = getAccessToken(req)
  if (!token) {
    const e = new Error('Not authenticated.')
    e.status = 401
    throw e
  }
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) {
    const e = new Error('Invalid or expired session.')
    e.status = 401
    throw e
  }
  const { data: roleRow } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', data.user.id)
    .maybeSingle()
  if (roleRow?.role !== 'admin') {
    const e = new Error('Admin privileges required.')
    e.status = 403
    throw e
  }
  return data.user
}

// Find the currently active academic session, or throw a clear error.
export async function getActiveSession(admin) {
  const { data, error } = await admin
    .from('academic_sessions')
    .select('id, session_name')
    .eq('status', 'active')
    .maybeSingle()
  if (error) throw error
  if (!data) {
    const e = new Error(
      'No active academic session exists. Create and activate a session before adding students.',
    )
    e.status = 400
    throw e
  }
  return data
}

// Generate the next sequential admission number in the form BJPS-0001.
// Strategy: find the highest existing numeric suffix, increment, zero-pad to 4.
// If no students exist, start at BJPS-0001.
export async function nextAdmissionNo(admin) {
  const { data, error } = await admin
    .from('students')
    .select('admission_no')
    .ilike('admission_no', 'BJPS-%')
  if (error) throw error

  let max = 0
  for (const row of data || []) {
    const m = /BJPS-(\d+)/i.exec(row.admission_no || '')
    if (m) {
      const n = parseInt(m[1], 10)
      if (Number.isFinite(n) && n > max) max = n
    }
  }
  const next = max + 1
  return `BJPS-${String(next).padStart(4, '0')}`
}

// Standard JSON error responder.
export function fail(res, err) {
  const status = err?.status || 500
  // eslint-disable-next-line no-console
  if (status >= 500) console.error('API error:', err)
  return res.status(status).json({ error: err?.message || 'Internal server error' })
}
