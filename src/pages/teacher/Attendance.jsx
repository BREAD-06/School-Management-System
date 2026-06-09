import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/useAuth.js'
import { ACTIVE_STUDENT, ATTENDANCE_STATUS, SCHOOL_NAME } from '../../lib/constants.js'
import { sendSmsBatch, smsConfigured } from '../../lib/sms.js'
import { sendWhatsAppBatch, WA_TEMPLATE_ATTENDANCE } from '../../utils/whatsapp.js'
import PageHeader from '../../components/PageHeader.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Spinner, { PageLoader } from '../../components/ui/Spinner.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { useToast } from '../../components/ui/Toast.jsx'

const todayStr = () => new Date().toISOString().slice(0, 10)

function fmtDate(d) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function TeacherAttendance() {
  const { user } = useAuth()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [session, setSession] = useState(null)
  const [classes, setClasses] = useState([])

  const [classId, setClassId] = useState('')
  const [date, setDate] = useState(todayStr())

  const [students, setStudents] = useState([]) // [{ enrollment_id, student_id, name, roll_no, parent_phone }]
  const [statuses, setStatuses] = useState({}) // student_id -> 'present' | 'absent'
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [existing, setExisting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState([])

  // Initial meta load.
  const loadMeta = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [classesRes, sessionRes] = await Promise.all([
        supabase.from('classes').select('id, class_name, sort_order').order('sort_order'),
        supabase.from('academic_sessions').select('id, session_name').eq('status', 'active').maybeSingle(),
      ])
      if (classesRes.error) throw classesRes.error
      setClasses(classesRes.data || [])
      setSession(sessionRes.data || null)
    } catch (err) {
      setError(err.message || 'Failed to load.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMeta() }, [loadMeta])

  // Load distinct past attendance dates for the selected class.
  const loadHistory = useCallback(async (cid) => {
    if (!cid) { setHistory([]); return }
    const { data } = await supabase
      .from('attendance')
      .select('date')
      .eq('class_id', cid)
      .order('date', { ascending: false })
    const seen = [...new Set((data || []).map((r) => r.date))]
    setHistory(seen.slice(0, 30))
  }, [])

  // Load the roster + any existing attendance for class+date.
  const loadRoster = useCallback(async (cid, d) => {
    if (!cid || !d || !session) { setStudents([]); setStatuses({}); return }
    setLoadingStudents(true)
    setError('')
    try {
      const { data: enrollments, error: enrErr } = await supabase
        .from('student_enrollments')
        .select('id, roll_no, student_id, students!inner(id, first_name, last_name, parent_phone, status)')
        .eq('session_id', session.id)
        .eq('class_id', cid)
      if (enrErr) throw enrErr

      const roster = (enrollments || [])
        .filter((e) => e.students?.status === ACTIVE_STUDENT)
        .map((e) => ({
          enrollment_id: e.id,
          student_id: e.student_id,
          name: `${e.students.first_name} ${e.students.last_name}`,
          roll_no: e.roll_no || '',
          parent_phone: e.students.parent_phone || '',
        }))
        .sort((a, b) => (a.roll_no || '').localeCompare(b.roll_no || '', undefined, { numeric: true }))
      setStudents(roster)

      // Existing attendance for this date?
      const { data: att } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('class_id', cid)
        .eq('date', d)
      const map = {}
      roster.forEach((s) => { map[s.student_id] = ATTENDANCE_STATUS.PRESENT })
      if (att && att.length) {
        att.forEach((a) => { map[a.student_id] = a.status })
        setExisting(true)
      } else {
        setExisting(false)
      }
      setStatuses(map)
    } catch (err) {
      setError(err.message || 'Failed to load students.')
    } finally {
      setLoadingStudents(false)
    }
  }, [session])

  useEffect(() => {
    if (classId) { loadRoster(classId, date); loadHistory(classId) }
    else { setStudents([]); setStatuses({}); setHistory([]) }
  }, [classId, date, loadRoster, loadHistory])

  const toggle = (sid) => {
    setStatuses((m) => ({
      ...m,
      [sid]: m[sid] === ATTENDANCE_STATUS.ABSENT ? ATTENDANCE_STATUS.PRESENT : ATTENDANCE_STATUS.ABSENT,
    }))
  }

  const absentCount = useMemo(
    () => Object.values(statuses).filter((s) => s === ATTENDANCE_STATUS.ABSENT).length,
    [statuses],
  )

  const className = classes.find((c) => c.id === classId)?.class_name || ''

  const handleSubmit = async () => {
    if (!session || !classId || students.length === 0) return
    setSaving(true)
    setError('')
    try {
      // attendance.marked_by references teachers.id (NOT auth.users id), so
      // resolve the current teacher's record before inserting.
      const { data: teacher, error: teacherErr } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (teacherErr || !teacher) {
        throw new Error('Could not find your teacher profile. Please contact the administrator.')
      }
      const teacherId = teacher.id

      const absentStudents = students.filter((s) => statuses[s.student_id] === ATTENDANCE_STATUS.ABSENT)
      const targets = absentStudents.filter((s) => s.parent_phone)

      // Notify absent students' parents; never block saving on failure.
      // Priority: WhatsApp (if configured server-side) → SMS → save only.
      let channel = null // 'whatsapp' | 'sms'
      let notifyResults = {}
      let sentCount = 0
      if (targets.length > 0) {
        // 1) Try WhatsApp first.
        const waList = targets.map((s) => ({
          key: s.student_id,
          phone: s.parent_phone,
          variables: [s.name, className, fmtDate(date)],
        }))
        const wa = await sendWhatsAppBatch(waList, WA_TEMPLATE_ATTENDANCE)
        if (wa.configured) {
          channel = 'whatsapp'
          notifyResults = wa.results
          sentCount = wa.sent
        } else if (smsConfigured()) {
          // 2) Fall back to SMS.
          const smsList = targets.map((s) => ({
            key: s.student_id,
            phone: s.parent_phone,
            message: `Dear Parent, your child ${s.name} of ${className} was absent on ${fmtDate(date)}. - ${SCHOOL_NAME}`,
          }))
          const res = await sendSmsBatch(smsList)
          channel = 'sms'
          notifyResults = res.results
          sentCount = res.sent
        }
      }

      // Build attendance rows; mark sms_sent only for absentees we successfully notified.
      const rows = students.map((s) => {
        const status = statuses[s.student_id] || ATTENDANCE_STATUS.PRESENT
        return {
          student_id: s.student_id,
          session_id: session.id,
          class_id: classId,
          date,
          status,
          marked_by: teacherId,
          sms_sent: status === ATTENDANCE_STATUS.ABSENT ? Boolean(notifyResults[s.student_id]) : false,
        }
      })

      const { error: upErr } = await supabase
        .from('attendance')
        .upsert(rows, { onConflict: 'student_id,class_id,date' })
      if (upErr) throw upErr

      setExisting(true)
      await loadHistory(classId)

      if (absentStudents.length === 0) {
        toast.success('Attendance saved. All students present.')
      } else if (channel === 'whatsapp') {
        toast.success(`Attendance saved. WhatsApp sent to ${sentCount} parent(s).`)
      } else if (channel === 'sms') {
        toast.success(`Attendance saved. SMS sent to ${sentCount} parent(s).`)
      } else {
        toast.success('Attendance saved. (Messaging not configured)')
      }
    } catch (err) {
      setError(err.message || 'Failed to save attendance.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle={session ? `Active session: ${session.session_name}` : 'No active session'}
      />

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {!session ? (
        <Alert type="warning">No active academic session. Attendance cannot be recorded until a session is active.</Alert>
      ) : (
        <>
          {/* Controls */}
          <div className="card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="label">Class</label>
              <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value="">Select class…</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.class_name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="label">Date</label>
              <input type="date" className="input" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          {!classId ? (
            <div className="card px-6 py-16 text-center text-sm text-slate-500">Select a class to mark attendance.</div>
          ) : loadingStudents ? (
            <PageLoader />
          ) : students.length === 0 ? (
            <div className="card px-6 py-16 text-center text-sm text-slate-500">No active students enrolled in this class.</div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Roster */}
              <div className="lg:col-span-2">
                {existing && (
                  <Alert type="info" className="mb-3">
                    Attendance already recorded for {fmtDate(date)}. You can edit and re-save it.
                  </Alert>
                )}
                <div className="card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm">
                    <span className="font-semibold text-navy">{students.length} students</span>
                    <span className="text-slate-500">{absentCount} absent</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {students.map((s) => {
                      const absent = statuses[s.student_id] === ATTENDANCE_STATUS.ABSENT
                      return (
                        <div key={s.student_id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-700">{s.name}</p>
                            <p className="text-xs text-slate-400">Roll {s.roll_no || '—'}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggle(s.student_id)}
                            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                              absent
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            }`}
                          >
                            {absent ? 'Absent' : 'Present'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <div className="border-t border-slate-200 p-4">
                    <button className="btn-primary w-full" onClick={handleSubmit} disabled={saving}>
                      {saving ? <Spinner label="Saving…" /> : existing ? 'Update Attendance' : 'Submit Attendance'}
                    </button>
                    {!smsConfigured() && (
                      <p className="mt-2 text-center text-xs text-slate-400">
                        SMS alerts are not configured — attendance will still be saved.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* History */}
              <div className="lg:col-span-1">
                <div className="card p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy">
                    <Icon name="session" className="h-4 w-4" /> Past dates
                  </h3>
                  {history.length === 0 ? (
                    <p className="text-xs text-slate-400">No previous attendance for this class.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {history.map((d) => (
                        <button
                          key={d}
                          onClick={() => setDate(d)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                            d === date ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {fmtDate(d)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
