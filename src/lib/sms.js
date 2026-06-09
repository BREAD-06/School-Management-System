// SMS helper — sends through the server-side /api/send-sms proxy.
//
// Why a proxy: calling MSG91 directly from the browser triggers CORS errors in
// production and would expose the MSG91 auth key. The proxy (api/send-sms.js)
// runs server-side, holds the key, and talks to MSG91.
//
// IMPORTANT: SMS sending must NEVER block the action that triggered it
// (e.g. saving attendance). Every function here resolves to a result object
// and never throws. A missing/unconfigured key simply yields { ok: false }.

import { supabase } from './supabase.js'

// True when the MSG91 key is present in the client build so the UI can warn the
// admin/teacher. The actual send still happens server-side via the proxy.
export function smsConfigured() {
  const key = import.meta.env.VITE_MSG91_API_KEY
  return Boolean(key && key !== 'your_msg91_api_key')
}

// Send a single SMS via the proxy. Returns { ok, error? } and never throws.
// `opts` may include { templateId, variables } for MSG91 DLT flows.
export async function sendSms(phone, message, opts = {}) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const token = session?.access_token

    const res = await fetch('/api/send-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        phone,
        message,
        templateId: opts.templateId,
        variables: opts.variables,
      }),
    })

    let json = {}
    try {
      json = await res.json()
    } catch {
      // non-JSON response
    }
    if (!res.ok) return { ok: false, error: json.error || `Request failed (${res.status})` }
    return { ok: Boolean(json.ok), error: json.error }
  } catch (err) {
    return { ok: false, error: err?.message || 'Network error sending SMS.' }
  }
}

// Send to many recipients sequentially. `list` = [{ phone, message, key, opts? }].
// Returns { sent, failed, results } where results map key -> ok boolean.
export async function sendSmsBatch(list, onProgress) {
  let sent = 0
  let failed = 0
  const results = {}
  for (let i = 0; i < list.length; i++) {
    const item = list[i]
    const r = await sendSms(item.phone, item.message, item.opts)
    results[item.key] = r.ok
    if (r.ok) sent++
    else failed++
    onProgress?.(i + 1, list.length)
  }
  return { sent, failed, results }
}
