import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/useAuth.js'
import { sanitiseFileName, deleteStorageFile } from '../lib/fileUtils.js'
import PageHeader from './PageHeader.jsx'
import Alert from './ui/Alert.jsx'
import Spinner, { PageLoader } from './ui/Spinner.jsx'
import Icon from './ui/Icon.jsx'
import { useToast } from './ui/Toast.jsx'

const BUCKET = 'timetables'
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

const isPdf = (url) => /\.pdf(\?|$)/i.test(url || '')

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Shared timetable upload/view UI for the Admin and Teacher portals. Admin and
// teachers can upload/replace a single timetable file (PDF or image) per class
// for the active session; everyone can view and download it.
export default function TimetableManager({ title = 'Timetable', subtitle }) {
  const { user } = useAuth()
  const toast = useToast()
  const fileRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [session, setSession] = useState(null)
  const [classes, setClasses] = useState([])
  const [classId, setClassId] = useState('')

  const [current, setCurrent] = useState(null) // { id, file_url, updated_at }
  const [loadingCurrent, setLoadingCurrent] = useState(false)
  const [stage, setStage] = useState(null) // null | 'uploading' | 'saving'
  const stageLabel = stage === 'uploading' ? 'Uploading…' : 'Saving…'

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

  const loadCurrent = useCallback(async () => {
    if (!classId || !session) { setCurrent(null); return }
    setLoadingCurrent(true)
    try {
      const { data, error: err } = await supabase
        .from('timetable')
        .select('id, file_url, updated_at')
        .eq('class_id', classId)
        .eq('session_id', session.id)
        .not('file_url', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1)
      if (err) throw err
      setCurrent(data?.[0] || null)
    } catch (err) {
      setError(err.message || 'Failed to load timetable.')
    } finally {
      setLoadingCurrent(false)
    }
  }, [classId, session])

  useEffect(() => { loadCurrent() }, [loadCurrent])

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (fileRef.current) fileRef.current.value = '' // allow re-selecting same file
    if (!file || !classId || !session) return

    if (!ALLOWED_TYPES.includes(file.type)) { toast.error('Only PDF, JPG or PNG files are allowed.'); return }
    if (file.size > MAX_FILE_SIZE) { toast.error('File must be under 5 MB.'); return }

    setError('')
    try {
      // Delete the old timetable file before uploading the replacement.
      await deleteStorageFile(BUCKET, current?.file_url)

      setStage('uploading')
      const path = `${classId}/${sanitiseFileName(file)}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const file_url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl

      setStage('saving')
      const payload = {
        class_id: classId,
        session_id: session.id,
        file_url,
        uploaded_by: user.id,
        updated_at: new Date().toISOString(),
      }
      if (current?.id) {
        const { error: updErr } = await supabase.from('timetable').update(payload).eq('id', current.id)
        if (updErr) throw updErr
      } else {
        const { error: insErr } = await supabase.from('timetable').insert(payload)
        if (insErr) throw insErr
      }
      toast.success(current ? 'Timetable replaced.' : 'Timetable uploaded.')
      await loadCurrent()
    } catch (err) {
      toast.error(err.message || 'Upload failed.')
    } finally {
      setStage(null)
    }
  }

  const busy = stage !== null
  const className = classes.find((c) => c.id === classId)?.class_name || ''

  if (loading) return <PageLoader />

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle || (session ? `Active session: ${session.session_name}` : 'No active session')} />

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {!session ? (
        <Alert type="warning">No active academic session. Timetables are managed per active session.</Alert>
      ) : (
        <>
          <div className="card mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1">
              <label className="label">Select Class</label>
              <select className="input sm:max-w-xs" value={classId} onChange={(e) => setClassId(e.target.value)} disabled={busy}>
                <option value="">— Choose a class —</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.class_name}</option>)}
              </select>
            </div>
            {classId && (
              <div>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFile} />
                <button className="btn-primary" onClick={() => fileRef.current?.click()} disabled={busy}>
                  {busy ? <Spinner label={stageLabel} /> : (<><Icon name="timetable" /> {current ? 'Replace Timetable' : 'Upload Timetable'}</>)}
                </button>
                <p className="mt-1 text-right text-xs text-slate-400">Max 5 MB · PDF, JPG, PNG</p>
              </div>
            )}
          </div>

          {!classId ? (
            <div className="card px-6 py-16 text-center text-sm text-slate-500">Select a class to view or upload its timetable.</div>
          ) : loadingCurrent ? (
            <PageLoader />
          ) : !current ? (
            <div className="card px-6 py-16 text-center text-sm text-slate-500">
              No timetable uploaded for {className} yet. Click “Upload Timetable” to add one.
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <div className="text-sm">
                  <span className="font-semibold text-navy">{className} Timetable</span>
                  <span className="ml-2 text-xs text-slate-400">Updated {fmtDate(current.updated_at)}</span>
                </div>
                <a href={current.file_url} target="_blank" rel="noreferrer" download
                  className="btn-outline text-xs">
                  <Icon name="materials" className="h-4 w-4" /> Download
                </a>
              </div>
              <div className="bg-slate-50 p-4">
                {isPdf(current.file_url) ? (
                  <iframe title="Timetable PDF" src={current.file_url} className="h-[600px] w-full rounded-lg border border-slate-200 bg-white" />
                ) : (
                  <img src={current.file_url} alt={`${className} timetable`} className="mx-auto max-h-[600px] w-auto rounded-lg border border-slate-200 bg-white" />
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
