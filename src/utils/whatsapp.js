// WhatsApp helper — sends through the server-side /api/send-whatsapp proxy.
//
// Why a proxy: the Meta WhatsApp Business access token must stay server-side,
// and calling Graph directly from the browser would trip CORS. The proxy
// (api/send-whatsapp.js) holds the token and talks to Meta.
//
// IMPORTANT: like SMS, sending must NEVER block the action that triggered it
// (saving attendance, marking fees). Every function resolves to a result object
// and never throws.
//
// Because the access token is server-only, the client can't know up-front
// whether WhatsApp is configured. The proxy reports it: an unconfigured result
// carries { notConfigured: true } so callers can transparently fall back to SMS.

import { supabase } from '../lib/supabase.js'

// Logical template names the proxy understands (each overridable server-side via
// WHATSAPP_ATTENDANCE_TEMPLATE / WHATSAPP_FEE_TEMPLATE).
export const WA_TEMPLATE_ATTENDANCE = 'attendance_alert'
export const WA_TEMPLATE_FEE = 'fee_reminder'

// Send a single WhatsApp template message via the proxy. Returns
// { ok, error?, notConfigured? } and never throws.
export async function sendWhatsApp(phone, templateName, variables = []) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const token = session?.access_token

    const res = await fetch('/api/send-whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ phone, templateName, variables }),
    })

    let json = {}
    try {
      json = await res.json()
    } catch {
      // non-JSON response
    }
    if (!res.ok) return { ok: false, error: json.error || `Request failed (${res.status})` }
    return { ok: Boolean(json.ok), error: json.error, notConfigured: Boolean(json.notConfigured) }
  } catch (err) {
    return { ok: false, error: err?.message || 'Network error sending WhatsApp.' }
  }
}

// Send to many recipients sequentially. `list` = [{ phone, variables, key, templateName? }].
// Returns { sent, failed, results, configured }. If the proxy reports the service
// is not configured (first send), aborts immediately with configured:false so the
// caller can fall back to SMS without sending half a batch.
export async function sendWhatsAppBatch(list, templateName, onProgress) {
  let sent = 0
  let failed = 0
  const results = {}
  for (let i = 0; i < list.length; i++) {
    const item = list[i]
    const r = await sendWhatsApp(item.phone, item.templateName || templateName, item.variables)
    if (r.notConfigured) {
      return { sent: 0, failed: 0, results: {}, configured: false }
    }
    results[item.key] = r.ok
    if (r.ok) sent++
    else failed++
    onProgress?.(i + 1, list.length)
  }
  return { sent, failed, results, configured: true }
}
