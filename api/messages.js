import { getAdminClient, getAccessToken, fail } from './_lib/admin.js'

// ---------------------------------------------------------------------------
// Internal messaging API (action-based, single serverless function).
//
// All access goes through the service role here so the directory (names across
// students/teachers/admins) and the messages themselves work regardless of
// table RLS. Permissions are enforced IN THIS HANDLER:
//
//   • Admin   → may message any teacher or student.
//   • Teacher → may message the admin(s) and any student.
//   • Student → may message the admin(s) and their class teachers.
//
// Every read is scoped to the caller (sender = me OR receiver = me); sends are
// stamped with the caller's id; mark-read only touches messages addressed to
// the caller. A user can never read another user's conversation.
//
// Body: { action, ...payload } + Authorization: Bearer <access_token>.
//   actions: 'directory' | 'conversations' | 'thread' | 'send' | 'markRead'
// ---------------------------------------------------------------------------

async function resolveCaller(admin, req) {
  const token = getAccessToken(req)
  if (!token) {
    const e = new Error('Not authenticated.'); e.status = 401; throw e
  }
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) {
    const e = new Error('Invalid or expired session.'); e.status = 401; throw e
  }
  const { data: roleRow } = await admin
    .from('user_roles').select('role').eq('user_id', data.user.id).maybeSingle()
  const role = roleRow?.role || null
  if (!role) { const e = new Error('No role assigned.'); e.status = 403; throw e }
  return { user: data.user, role }
}

// Admin contacts: one entry per admin user, named from their email.
async function getAdminContacts(admin) {
  const { data: roles } = await admin.from('user_roles').select('user_id').eq('role', 'admin')
  const ids = [...new Set((roles || []).map((r) => r.user_id).filter(Boolean))]
  const contacts = []
  for (const id of ids) {
    let subtitle = ''
    try {
      const { data } = await admin.auth.admin.getUserById(id)
      subtitle = data?.user?.email || ''
    } catch { /* ignore */ }
    contacts.push({ id, name: 'School Administrator', role: 'admin', subtitle })
  }
  return { contacts, ids: new Set(ids) }
}

async function getActiveSessionId(admin) {
  const { data } = await admin
    .from('academic_sessions').select('id').eq('status', 'active').maybeSingle()
  return data?.id || null
}

async function getAllTeacherContacts(admin) {
  const { data } = await admin
    .from('teachers')
    .select('user_id, name, designation')
    .eq('status', 'active')
    .order('name')
  return (data || [])
    .filter((t) => t.user_id)
    .map((t) => ({ id: t.user_id, name: t.name, role: 'teacher', subtitle: t.designation || 'Teacher' }))
}

async function getAllStudentContacts(admin) {
  const sessionId = await getActiveSessionId(admin)
  // Pull active students with their class in the active session.
  const { data } = await admin
    .from('student_enrollments')
    .select('class_id, students!inner(user_id, first_name, last_name, status), classes(class_name)')
    .eq('session_id', sessionId || '00000000-0000-0000-0000-000000000000')
  return (data || [])
    .filter((e) => e.students?.user_id && e.students?.status === 'active')
    .map((e) => ({
      id: e.students.user_id,
      name: `${e.students.first_name} ${e.students.last_name}`,
      role: 'student',
      subtitle: e.classes?.class_name || 'Student',
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// A student's teachers = teachers assigned to their class (timetable + homework)
// in the active session. Falls back to all active teachers if none are found.
async function getStudentTeacherContacts(admin, studentUserId) {
  const sessionId = await getActiveSessionId(admin)
  const { data: student } = await admin
    .from('students').select('id').eq('user_id', studentUserId).maybeSingle()
  if (!student || !sessionId) return getAllTeacherContacts(admin)

  const { data: enr } = await admin
    .from('student_enrollments')
    .select('class_id')
    .eq('student_id', student.id)
    .eq('session_id', sessionId)
    .maybeSingle()
  const classId = enr?.class_id
  if (!classId) return getAllTeacherContacts(admin)

  const [ttRes, hwRes] = await Promise.all([
    admin.from('timetable').select('teacher_id').eq('class_id', classId).eq('session_id', sessionId),
    admin.from('homework').select('teacher_id').eq('class_id', classId).eq('session_id', sessionId),
  ])
  const teacherIds = new Set(
    [...(ttRes.data || []), ...(hwRes.data || [])].map((r) => r.teacher_id).filter(Boolean),
  )
  if (teacherIds.size === 0) return getAllTeacherContacts(admin)

  const { data: teachers } = await admin
    .from('teachers')
    .select('user_id, name, designation')
    .in('id', [...teacherIds])
    .eq('status', 'active')
    .order('name')
  const contacts = (teachers || [])
    .filter((t) => t.user_id)
    .map((t) => ({ id: t.user_id, name: t.name, role: 'teacher', subtitle: t.designation || 'Teacher' }))
  return contacts.length ? contacts : getAllTeacherContacts(admin)
}

// Build the caller's allowed contact list per the permission matrix.
async function buildContacts(admin, caller) {
  const { contacts: adminContacts, ids: adminIds } = await getAdminContacts(admin)
  let list = []
  if (caller.role === 'admin') {
    list = [...(await getAllTeacherContacts(admin)), ...(await getAllStudentContacts(admin))]
  } else if (caller.role === 'teacher') {
    list = [...adminContacts, ...(await getAllStudentContacts(admin))]
  } else if (caller.role === 'student') {
    list = [...adminContacts, ...(await getStudentTeacherContacts(admin, caller.user.id))]
  }
  // Never include the caller themselves.
  list = list.filter((c) => c.id && c.id !== caller.user.id)
  // De-dupe by id (a user could appear once).
  const seen = new Set()
  const deduped = []
  for (const c of list) {
    if (seen.has(c.id)) continue
    seen.add(c.id)
    deduped.push(c)
  }
  return { contacts: deduped, adminIds }
}

// Resolve display names/roles for an arbitrary set of user ids.
async function resolveNames(admin, userIds, adminIds) {
  const ids = [...new Set(userIds.filter(Boolean))]
  const map = {}
  if (ids.length === 0) return map

  const [teachersRes, studentsRes] = await Promise.all([
    admin.from('teachers').select('user_id, name, designation').in('user_id', ids),
    admin.from('students').select('user_id, first_name, last_name').in('user_id', ids),
  ])
  for (const t of teachersRes.data || []) {
    if (t.user_id) map[t.user_id] = { name: t.name, role: 'teacher', subtitle: t.designation || 'Teacher' }
  }
  for (const s of studentsRes.data || []) {
    if (s.user_id) map[s.user_id] = { name: `${s.first_name} ${s.last_name}`, role: 'student', subtitle: 'Student' }
  }
  for (const id of ids) {
    if (!map[id]) {
      map[id] = adminIds.has(id)
        ? { name: 'School Administrator', role: 'admin', subtitle: 'Administrator' }
        : { name: 'Unknown user', role: 'unknown', subtitle: '' }
    }
  }
  return map
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const admin = getAdminClient()
    const caller = await resolveCaller(admin, req)
    const me = caller.user.id
    const action = (req.body || {}).action

    if (action === 'directory') {
      const { contacts } = await buildContacts(admin, caller)
      return res.status(200).json({ me, role: caller.role, contacts })
    }

    if (action === 'conversations') {
      const { adminIds } = await buildContacts(admin, caller)
      const { data: msgs, error } = await admin
        .from('messages')
        .select('id, sender_id, receiver_id, content, is_read, created_at')
        .or(`sender_id.eq.${me},receiver_id.eq.${me}`)
        .order('created_at', { ascending: false })
      if (error) throw error

      const convos = new Map() // otherId -> { otherId, last, lastAt, unread }
      for (const m of msgs || []) {
        const other = m.sender_id === me ? m.receiver_id : m.sender_id
        if (!other) continue
        if (!convos.has(other)) {
          convos.set(other, { otherId: other, last: m.content, lastAt: m.created_at, unread: 0 })
        }
        if (m.receiver_id === me && !m.is_read) {
          convos.get(other).unread += 1
        }
      }
      const names = await resolveNames(admin, [...convos.keys()], adminIds)
      const list = [...convos.values()].map((c) => ({
        ...c,
        name: names[c.otherId]?.name || 'Unknown',
        otherRole: names[c.otherId]?.role || 'unknown',
        subtitle: names[c.otherId]?.subtitle || '',
      }))
      return res.status(200).json({ conversations: list })
    }

    if (action === 'thread') {
      const otherId = (req.body || {}).otherId
      if (!otherId) return res.status(400).json({ error: 'Missing otherId.' })
      const { data: msgs, error } = await admin
        .from('messages')
        .select('id, sender_id, receiver_id, content, attachment_url, is_read, created_at')
        .or(
          `and(sender_id.eq.${me},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${me})`,
        )
        .order('created_at', { ascending: true })
      if (error) throw error
      // Mark incoming messages from this person as read.
      await admin
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', me)
        .eq('sender_id', otherId)
        .eq('is_read', false)
      const { adminIds } = await buildContacts(admin, caller)
      const names = await resolveNames(admin, [otherId], adminIds)
      return res.status(200).json({
        messages: msgs || [],
        other: { id: otherId, ...(names[otherId] || { name: 'Unknown', role: 'unknown' }) },
      })
    }

    if (action === 'send') {
      const b = req.body || {}
      const receiverId = b.receiverId
      const content = typeof b.content === 'string' ? b.content.trim() : ''
      const attachmentUrl = typeof b.attachmentUrl === 'string' && b.attachmentUrl ? b.attachmentUrl : null
      if (!receiverId) return res.status(400).json({ error: 'Please choose a recipient.' })
      if (!content && !attachmentUrl) return res.status(400).json({ error: 'Message cannot be empty.' })

      // Permission check: receiver must be in the caller's allowed contacts.
      const { contacts } = await buildContacts(admin, caller)
      if (!contacts.some((c) => c.id === receiverId)) {
        return res.status(403).json({ error: 'You are not allowed to message this person.' })
      }

      const { data, error } = await admin
        .from('messages')
        .insert({ sender_id: me, receiver_id: receiverId, content, attachment_url: attachmentUrl, is_read: false })
        .select('id, sender_id, receiver_id, content, attachment_url, is_read, created_at')
        .single()
      if (error) throw error
      return res.status(201).json({ message: data })
    }

    if (action === 'markRead') {
      const otherId = (req.body || {}).otherId
      if (!otherId) return res.status(400).json({ error: 'Missing otherId.' })
      await admin
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', me)
        .eq('sender_id', otherId)
        .eq('is_read', false)
      return res.status(200).json({ success: true })
    }

    return res.status(400).json({ error: `Unknown action: ${action}` })
  } catch (err) {
    return fail(res, err)
  }
}
