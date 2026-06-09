import { getAdminClient, requireAdmin, fail } from './_lib/admin.js'

const EMAIL_DOMAIN = '@bjps.com'
const nn = (v) => {
  const s = typeof v === 'string' ? v.trim() : v
  return s === '' || s === undefined ? null : s
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let admin
  let createdUserId = null
  let insertedTeacherId = null

  try {
    admin = getAdminClient()
    await requireAdmin(admin, req)

    const b = req.body || {}
    const name = nn(b.name)
    const employeeId = nn(b.employeeId)

    const missing = []
    if (!name) missing.push('Name')
    if (!employeeId) missing.push('Employee ID')
    if (missing.length) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` })
    }

    // Duplicate employee id check.
    const { data: existing } = await admin
      .from('teachers')
      .select('id')
      .eq('employee_id', employeeId)
      .maybeSingle()
    if (existing) {
      return res
        .status(409)
        .json({ error: `A teacher with employee ID "${employeeId}" already exists.` })
    }

    const loginEmail = `${employeeId}${EMAIL_DOMAIN}`.toLowerCase()
    const password = employeeId

    // 1) Create the auth user.
    const { data: userData, error: userErr } = await admin.auth.admin.createUser({
      email: loginEmail,
      password,
      email_confirm: true,
      user_metadata: { role: 'teacher', employee_id: employeeId },
    })
    if (userErr) {
      const dup = /already registered|already been registered|exists/i.test(userErr.message)
      return res.status(dup ? 409 : 400).json({
        error: dup
          ? `An account for ${loginEmail} already exists.`
          : `Could not create login account: ${userErr.message}`,
      })
    }
    createdUserId = userData.user.id

    // 2) Insert the teacher record.
    const { data: teacherRow, error: teacherErr } = await admin
      .from('teachers')
      .insert({
        user_id: createdUserId,
        employee_id: employeeId,
        name,
        phone: nn(b.phone),
        email: nn(b.email),
        designation: nn(b.designation),
        joining_date: nn(b.joiningDate),
        status: 'active',
      })
      .select('id')
      .single()
    if (teacherErr) throw teacherErr
    insertedTeacherId = teacherRow.id

    // 3) Insert the role row.
    const { error: roleErr } = await admin
      .from('user_roles')
      .insert({ user_id: createdUserId, role: 'teacher' })
    if (roleErr) throw roleErr

    return res.status(201).json({
      success: true,
      teacher_id: insertedTeacherId,
      user_id: createdUserId,
      email: loginEmail,
    })
  } catch (err) {
    try {
      if (insertedTeacherId) await admin.from('teachers').delete().eq('id', insertedTeacherId)
      if (createdUserId) {
        await admin.from('user_roles').delete().eq('user_id', createdUserId)
        await admin.auth.admin.deleteUser(createdUserId)
      }
    } catch {
      // swallow cleanup errors
    }
    return fail(res, err)
  }
}
