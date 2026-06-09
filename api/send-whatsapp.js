import { getAdminClient, getAccessToken, fail } from './_lib/admin.js'

// Meta WhatsApp Business (Cloud API) message endpoint. The phone number id is
// part of the path, so it's interpolated below once we know it's configured.
const GRAPH_BASE = 'https://graph.facebook.com/v18.0'

// Normalize an Indian phone number to WhatsApp's expected 91XXXXXXXXXX form.
// Kept identical in spirit to the helper in send-sms.js.
function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return digits
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`
  return digits
}

// Logical template names the client sends. Each can be overridden by a
// server-side env var; if unset, the logical name itself is the template name
// (matching the documented defaults). This lets a school point a flow at a
// differently-named approved Meta template without any client change.
function resolveTemplate(requested) {
  const overrides = {
    attendance_alert: process.env.WHATSAPP_ATTENDANCE_TEMPLATE,
    fee_reminder: process.env.WHATSAPP_FEE_TEMPLATE,
  }
  return overrides[requested] || requested
}

// Server-side WhatsApp proxy for the Meta WhatsApp Business Cloud API. Mirrors
// send-sms.js: keeps the access token off the client, avoids browser CORS, and
// returns { ok, error? } with HTTP 200 for handled outcomes so batch callers can
// continue gracefully. A missing access token yields a clean "not configured"
// result with { notConfigured: true } so callers can fall back to SMS.
//
// Body: { phone, templateName, variables }
//   - phone:        recipient mobile (Indian format, 10 digits or 91XXXXXXXXXX)
//   - templateName: logical template name, e.g. "attendance_alert"
//   - variables:    ordered list of body parameter strings
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    // Require a valid signed-in user (teacher or admin) to prevent abuse.
    const token = getAccessToken(req)
    if (!token) return res.status(401).json({ ok: false, error: 'Not authenticated.' })
    const admin = getAdminClient()
    const { data: userData, error: authErr } = await admin.auth.getUser(token)
    if (authErr || !userData?.user) {
      return res.status(401).json({ ok: false, error: 'Invalid or expired session.' })
    }

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

    if (!accessToken || accessToken === 'your_permanent_access_token' || !phoneNumberId) {
      return res
        .status(200)
        .json({ ok: false, notConfigured: true, error: 'WhatsApp service not configured.' })
    }

    const b = req.body || {}
    const to = normalizePhone(b.phone)
    const templateName = resolveTemplate(b.templateName || 'attendance_alert')
    const langCode = process.env.WHATSAPP_TEMPLATE_LANG || 'en'
    const variables = Array.isArray(b.variables) ? b.variables : []

    if (!to) return res.status(200).json({ ok: false, error: 'Invalid phone number.' })

    const parameters = variables.map((v) => ({ type: 'text', text: String(v ?? '') }))

    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: langCode },
        components: parameters.length ? [{ type: 'body', parameters }] : [],
      },
    }

    const upstream = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    })

    if (!upstream.ok) {
      let detail = `HTTP ${upstream.status}`
      try {
        const j = await upstream.json()
        detail = j?.error?.message || detail
      } catch {
        // ignore non-JSON body
      }
      return res.status(200).json({ ok: false, error: detail })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    return fail(res, err)
  }
}
