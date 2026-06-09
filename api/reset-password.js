import { getAdminClient, requireAdmin, fail } from './_lib/admin.js'

// Resets a user's password to a supplied default (admission no for students,
// employee id for teachers). Admin-only. The service role key never leaves the
// server. Also clears `has_changed_password` so the user is prompted to set a
// new password on their next login.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const admin = getAdminClient()
    await requireAdmin(admin, req)

    const b = req.body || {}
    const userId = typeof b.userId === 'string' ? b.userId.trim() : ''
    const newPassword = typeof b.newPassword === 'string' ? b.newPassword.trim() : ''

    if (!userId) return res.status(400).json({ error: 'Missing userId.' })
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'A valid default password is required.' })
    }

    // Update the auth user's password.
    const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
      password: newPassword,
    })
    if (updErr) {
      return res.status(400).json({ error: `Could not reset password: ${updErr.message}` })
    }

    // Best-effort: force a password change on next login. Either table may match.
    try {
      await admin.from('students').update({ has_changed_password: false }).eq('user_id', userId)
      await admin.from('teachers').update({ has_changed_password: false }).eq('user_id', userId)
    } catch {
      // non-fatal — the password reset itself already succeeded
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    return fail(res, err)
  }
}
