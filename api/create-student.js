import { getAdminClient, requireAdmin, getActiveSession, nextAdmissionNo, fail } from './_lib/admin.js'

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
  let insertedStudentId = null

  try {
    admin = getAdminClient()
    await requireAdmin(admin, req)

    const b = req.body || {}
    const firstName = nn(b.firstName)
    const lastName = nn(b.lastName)
    const parentPhone = nn(b.parentPhone)
    const classId = nn(b.classId)

    // Required-field validation (mirrors the client form).
    // Admission number is auto-generated server-side — never supplied by the client.
    // Only First Name and Class are required. Last Name and Parent Phone are
    // optional (last_name is stored as '' since the column is NOT NULL; phone
    // is stored as NULL when blank).
    const missing = []
    if (!firstName) missing.push('First Name')
    if (!classId) missing.push('Class')
    if (missing.length) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` })
    }

    // Must have an active session to enroll into.
    const session = await getActiveSession(admin)

    // Auto-generate the next sequential admission number (BJPS-0001, …).
    const admissionNo = await nextAdmissionNo(admin)

    const email = `${admissionNo}${EMAIL_DOMAIN}`.toLowerCase()
    const password = admissionNo

    // 1) Create the auth user.
    const { data: userData, error: userErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'student', admission_no: admissionNo },
    })
    if (userErr) {
      const dup = /already registered|already been registered|exists/i.test(userErr.message)
      return res.status(dup ? 409 : 400).json({
        error: dup
          ? `An account for ${email} already exists.`
          : `Could not create login account: ${userErr.message}`,
      })
    }
    createdUserId = userData.user.id

    // 2) Insert the student record.
    const { data: studentRow, error: studentErr } = await admin
      .from('students')
      .insert({
        user_id: createdUserId,
        admission_no: admissionNo,
        first_name: firstName,
        last_name: lastName || '', // column is NOT NULL; store empty when omitted
        dob: nn(b.dob),
        gender: nn(b.gender),
        father_name: nn(b.fatherName),
        mother_name: nn(b.motherName),
        parent_phone: parentPhone,
        address: nn(b.address),
        admission_date: nn(b.admissionDate),
        status: 'active',
      })
      .select('id')
      .single()
    if (studentErr) throw studentErr
    insertedStudentId = studentRow.id

    // 3) Insert the role row.
    const { error: roleErr } = await admin
      .from('user_roles')
      .insert({ user_id: createdUserId, role: 'student' })
    if (roleErr) throw roleErr

    // 4) Enroll into the active session + class.
    const { error: enrollErr } = await admin.from('student_enrollments').insert({
      student_id: insertedStudentId,
      session_id: session.id,
      class_id: classId,
      roll_no: nn(b.rollNo),
      status: 'active',
    })
    if (enrollErr) throw enrollErr

    return res.status(201).json({
      success: true,
      student_id: insertedStudentId,
      user_id: createdUserId,
      admission_no: admissionNo,
      email,
      session: session.session_name,
    })
  } catch (err) {
    // Best-effort rollback so we don't leave orphaned auth users / rows.
    try {
      if (insertedStudentId) {
        await admin.from('student_enrollments').delete().eq('student_id', insertedStudentId)
        await admin.from('students').delete().eq('id', insertedStudentId)
      }
      if (createdUserId) {
        await admin.from('user_roles').delete().eq('user_id', createdUserId)
        await admin.auth.admin.deleteUser(createdUserId)
      }
    } catch {
      // swallow cleanup errors; original error is what matters
    }
    return fail(res, err)
  }
}
