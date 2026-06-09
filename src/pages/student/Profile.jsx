import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/useAuth.js'
import { compressImage } from '../../lib/imageUtils.js'
import { sanitiseFileName, deleteStorageFile } from '../../lib/fileUtils.js'
import PageHeader from '../../components/PageHeader.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Spinner, { PageLoader } from '../../components/ui/Spinner.jsx'
import { useToast } from '../../components/ui/Toast.jsx'

const MAX_PHOTO_SIZE = 2 * 1024 * 1024
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png']
const BUCKET = 'profile-photos'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-3 border-b border-slate-100 last:border-0">
      <span className="w-40 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <span className="mt-0.5 sm:mt-0 text-sm text-slate-800 font-medium">{value || '—'}</span>
    </div>
  )
}

export default function StudentProfile() {
  const { user } = useAuth()
  const toast = useToast()
  const fileRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [student, setStudent] = useState(null)
  const [enrollment, setEnrollment] = useState(null)

  const [preview, setPreview] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoError, setPhotoError] = useState('')
  const [stage, setStage] = useState(null) // null | 'compressing' | 'uploading' | 'saving'
  const busy = stage !== null
  const stageLabel =
    stage === 'compressing' ? 'Compressing…' : stage === 'uploading' ? 'Uploading…' : 'Saving…'

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: s, error: sErr } = await supabase
        .from('students')
        .select('id, admission_no, first_name, last_name, dob, gender, father_name, mother_name, parent_phone, address, admission_date, profile_photo_url')
        .eq('user_id', user.id)
        .maybeSingle()
      if (sErr) throw sErr
      if (!s) throw new Error('Student record not found.')
      setStudent(s)

      const { data: e } = await supabase
        .from('student_enrollments')
        .select('roll_no, classes(class_name), academic_sessions!inner(status)')
        .eq('student_id', s.id)
        .eq('academic_sessions.status', 'active')
        .maybeSingle()
      setEnrollment(e || null)
    } catch (err) {
      setError(err.message || 'Failed to load profile.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadData() }, [loadData])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError('')
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setPhotoError('Only JPG and PNG files are allowed.')
      return
    }
    if (file.size > MAX_PHOTO_SIZE) {
      setPhotoError('Photo must be under 2 MB.')
      return
    }
    setPhotoFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const cancelPreview = () => {
    setPhotoFile(null)
    setPreview(null)
    setPhotoError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const savePhoto = async () => {
    if (!photoFile || !student) return
    setPhotoError('')
    try {
      setStage('compressing')
      const fileToUpload = await compressImage(photoFile, 'profile')

      // Delete the old photo before uploading the replacement (graceful no-op
      // if the URL is missing/malformed or the file is already gone).
      await deleteStorageFile(BUCKET, student.profile_photo_url)

      setStage('uploading')
      const path = `students/${student.id}/${sanitiseFileName(fileToUpload)}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, fileToUpload, { upsert: true })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)

      setStage('saving')
      const { error: updateErr } = await supabase
        .from('students')
        .update({ profile_photo_url: urlData.publicUrl })
        .eq('id', student.id)
      if (updateErr) throw updateErr

      setStudent(s => ({ ...s, profile_photo_url: urlData.publicUrl }))
      toast.success('Profile photo updated.')
      cancelPreview()
    } catch (err) {
      setPhotoError(err.message || 'Failed to upload photo.')
    } finally {
      setStage(null)
    }
  }

  if (loading) return <PageLoader />

  const displayName = student ? `${student.first_name} ${student.last_name}` : ''
  const photoUrl = preview || student?.profile_photo_url

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Your personal information and profile photo" />

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {student && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Photo card */}
          <div className="card flex flex-col items-center p-6 text-center lg:col-span-1">
            <div className="relative mb-4">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={displayName}
                  className="h-32 w-32 rounded-full object-cover ring-4 ring-royal-100"
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-navy text-4xl font-bold text-white ring-4 ring-navy-100">
                  {student.first_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <h2 className="text-lg font-bold text-navy">{displayName}</h2>
            <p className="text-sm text-slate-500">{student.admission_no}</p>
            {enrollment && (
              <span className="mt-2 rounded-full bg-royal-50 px-3 py-1 text-xs font-medium text-royal">
                Class {enrollment.classes?.class_name}
              </span>
            )}

            <div className="mt-5 w-full">
              {photoError && <Alert type="error" className="mb-3 text-left">{photoError}</Alert>}
              {preview ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Preview — save to confirm</p>
                  <button className="btn-primary w-full" onClick={savePhoto} disabled={busy}>
                    {busy ? <Spinner label={stageLabel} /> : 'Save Photo'}
                  </button>
                  <button className="btn-outline w-full" onClick={cancelPreview} disabled={busy}>Cancel</button>
                </div>
              ) : (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button className="btn-outline w-full" onClick={() => fileRef.current?.click()}>
                    {student.profile_photo_url ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  <p className="mt-1.5 text-xs text-slate-400">Max 2 MB · JPG or PNG</p>
                </>
              )}
            </div>
          </div>

          {/* Info card */}
          <div className="card p-6 lg:col-span-2">
            <h3 className="mb-1 text-base font-semibold text-navy">Personal Information</h3>
            <p className="mb-4 text-xs text-slate-400">Contact the administrator to update any information.</p>
            <InfoRow label="Full Name" value={displayName} />
            <InfoRow label="Admission No" value={student.admission_no} />
            <InfoRow label="Class" value={enrollment?.classes?.class_name} />
            <InfoRow label="Roll Number" value={enrollment?.roll_no} />
            <InfoRow label="Date of Birth" value={formatDate(student.dob)} />
            <InfoRow label="Gender" value={student.gender} />
            <InfoRow label="Father's Name" value={student.father_name} />
            <InfoRow label="Mother's Name" value={student.mother_name} />
            <InfoRow label="Parent Phone" value={student.parent_phone} />
            <InfoRow label="Address" value={student.address} />
            <InfoRow label="Admission Date" value={formatDate(student.admission_date)} />
          </div>
        </div>
      )}
    </div>
  )
}
