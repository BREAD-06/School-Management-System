import { getAdminClient, getAccessToken, fail } from './_lib/admin.js'

const FLOW_ENDPOINT = 'https://api.msg91.com/api/v5/flow/'

// Normalize an Indian phone number to MSG91's expected 91XXXXXXXXXX form.
function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return digits
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`
  return digits
}

// Server-side SMS proxy for MSG91. Avoids browser CORS issues and keeps the
// MSG91 auth key off the client. Returns { ok, error? } and uses HTTP 200 for
// handled outcomes so batch callers can continue gracefully.
//
// Body: { phone, message, templateId?, variables? }
//   - phone:      recipient mobile (Indian format, 10 digits or 91XXXXXXXXXX)
//   - message:    fully-rendered SMS text
//   - templateId: optional DLT flow/template id (overrides MSG91_TEMPLATE_ID)
//   - variables:  optional object of named flow variables (var1, var2, …)
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

    const apiKey = process.env.MSG91_API_KEY || process.env.VITE_MSG91_API_KEY
    const senderId = process.env.MSG91_SENDER_ID || process.env.VITE_MSG91_SENDER_ID || 'BJPSCH'
    const defaultTemplate = process.env.MSG91_TEMPLATE_ID || process.env.VITE_MSG91_TEMPLATE_ID || ''

    if (!apiKey || apiKey === 'your_msg91_api_key') {
      return res.status(200).json({ ok: false, error: 'SMS service not configured.' })
    }

    const b = req.body || {}
    const mobiles = normalizePhone(b.phone)
    const message = typeof b.message === 'string' ? b.message : ''
    const templateId = b.templateId || defaultTemplate
    const variables = b.variables && typeof b.variables === 'object' ? b.variables : {}

    if (!mobiles) return res.status(200).json({ ok: false, error: 'Invalid phone number.' })

    const recipient = { mobiles, message, ...variables }

    const upstream = await fetch(FLOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authkey: apiKey },
      body: JSON.stringify({
        template_id: templateId,
        sender: senderId,
        short_url: 0,
        recipients: [recipient],
      }),
    })

    if (!upstream.ok) {
      let detail = `HTTP ${upstream.status}`
      try {
        const j = await upstream.json()
        detail = j?.message || detail
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
