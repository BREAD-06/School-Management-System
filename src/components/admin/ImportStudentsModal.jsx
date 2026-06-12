import { useRef, useState } from 'react'
import Modal from '../ui/Modal.jsx'
import Alert from '../ui/Alert.jsx'
import Spinner from '../ui/Spinner.jsx'
import { createStudent } from '../../lib/api.js'
import { parseCsvToObjects, toCsv, downloadText } from '../../lib/csv.js'

const TEMPLATE_HEADERS = [
  'first_name', 'last_name', 'class_name', 'father_name', 'mother_name',
  'parent_phone', 'gender', 'dob', 'address', 'roll_no',
]

const EXAMPLE_ROW = [
  'Aarav', 'Sharma', 'Class 1', 'Ramesh Sharma', 'Sunita Sharma',
  '9876543210', 'Male', '2015-04-12', '12 MG Road, Jaipur', '1',
]

const phoneOk = (p) => /^[0-9+\-\s]{7,15}$/.test(String(p || '').trim())

export default function ImportStudentsModal({ open, onClose, onDone, classes, session }) {
  const fileRef = useRef(null)
  const [step, setStep] = useState('upload') // upload | preview | importing | done
  const [error, setError] = useState('')
  const [rows, setRows] = useState([]) // [{ data, classId, errors: [] }]
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [results, setResults] = useState({ success: [], failed: [] })

  // class_name (lower) -> id
  const classMap = new Map((classes || []).map((c) => [c.class_name.trim().toLowerCase(), c.id]))

  const reset = () => {
    setStep('upload'); setError(''); setRows([])
    setProgress({ done: 0, total: 0 }); setResults({ success: [], failed: [] })
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleClose = () => {
    if (step === 'importing') return
    reset()
    onClose()
  }

  const downloadTemplate = () => {
    const csv = toCsv(TEMPLATE_HEADERS, [EXAMPLE_ROW])
    downloadText('student-import-template.csv', csv)
  }

  const handleFile = async (e) => {
    setError('')
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const { headers, records } = parseCsvToObjects(text)

      const missingCols = TEMPLATE_HEADERS.filter(
        (h) => !headers.includes(h) && ['first_name', 'class_name'].includes(h),
      )
      if (missingCols.length) {
        setError(`CSV is missing required columns: ${missingCols.join(', ')}. Download the template to see the correct format.`)
        return
      }
      if (records.length === 0) {
        setError('The CSV has no data rows.')
        return
      }

      const validated = records.map((data) => {
        const errors = []
        if (!data.first_name) errors.push('Missing first name')
        if (!data.class_name) errors.push('Missing class')
        // Last name and parent phone are optional; only check phone format if given.
        if (data.parent_phone && !phoneOk(data.parent_phone)) errors.push('Invalid phone')

        let classId = null
        if (data.class_name) {
          classId = classMap.get(data.class_name.trim().toLowerCase()) || null
          if (!classId) errors.push(`Unknown class "${data.class_name}"`)
        }
        return { data, classId, errors }
      })

      setRows(validated)
      setStep('preview')
    } catch (err) {
      setError(err.message || 'Failed to read the CSV file.')
    }
  }

  const validRows = rows.filter((r) => r.errors.length === 0)
  const invalidCount = rows.length - validRows.length

  const runImport = async () => {
    setStep('importing')
    setProgress({ done: 0, total: validRows.length })
    const success = []
    const failed = []

    for (let i = 0; i < validRows.length; i++) {
      const { data, classId } = validRows[i]
      const label = `${data.first_name} ${data.last_name}`
      try {
        // Sequential calls keep server-side admission numbering safe.
        const res = await createStudent({
          firstName: data.first_name,
          lastName: data.last_name,
          classId,
          parentPhone: data.parent_phone,
          gender: data.gender || '',
          dob: data.dob || '',
          fatherName: data.father_name || '',
          motherName: data.mother_name || '',
          address: data.address || '',
          rollNo: data.roll_no || '',
        })
        success.push({ label, admission_no: res?.admission_no || '—' })
      } catch (err) {
        failed.push({ label, reason: err?.message || 'Unknown error' })
      }
      setProgress({ done: i + 1, total: validRows.length })
    }

    setResults({ success, failed })
    setStep('done')
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <Modal open={open} onClose={handleClose} title="Import Students from CSV" maxWidth="max-w-3xl">
      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {!session && (
        <Alert type="warning" className="mb-4">
          No active academic session. Activate a session before importing students.
        </Alert>
      )}

      {/* STEP: upload */}
      {step === 'upload' && (
        <div className="space-y-5">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>Download the CSV template (it includes one example row).</li>
            <li>Fill in one student per row. <strong>Do not add an admission number</strong> — it is generated automatically.</li>
            <li>Upload the completed file and review the preview before importing.</li>
          </ol>

          <div className="flex flex-wrap gap-3">
            <button className="btn-outline" onClick={downloadTemplate}>Download Template</button>
            <button className="btn-primary" onClick={() => fileRef.current?.click()} disabled={!session}>
              Upload CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
          </div>

          <p className="text-xs text-slate-400">
            Required columns: first_name, class_name. Optional: last_name, parent_phone, father_name,
            mother_name, gender, dob (YYYY-MM-DD), address, roll_no.
          </p>
        </div>
      )}

      {/* STEP: preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">{validRows.length} valid</span>
            {invalidCount > 0 && (
              <span className="rounded-full bg-red-50 px-3 py-1 font-medium text-red-700">{invalidCount} with errors (will be skipped)</span>
            )}
          </div>

          <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, idx) => (
                  <tr key={idx} className={r.errors.length ? 'bg-red-50/40' : ''}>
                    <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-2 text-slate-700">{r.data.first_name} {r.data.last_name}</td>
                    <td className="px-3 py-2 text-slate-600">{r.data.class_name || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{r.data.parent_phone || '—'}</td>
                    <td className="px-3 py-2">
                      {r.errors.length === 0 ? (
                        <span className="text-xs font-medium text-emerald-600">Ready</span>
                      ) : (
                        <span className="text-xs text-red-600">{r.errors.join(', ')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3">
            <button className="btn-outline" onClick={reset}>Choose Different File</button>
            <button className="btn-primary" onClick={runImport} disabled={validRows.length === 0}>
              Confirm Import ({validRows.length})
            </button>
          </div>
        </div>
      )}

      {/* STEP: importing */}
      {step === 'importing' && (
        <div className="space-y-4 py-4">
          <p className="text-sm text-slate-600">
            Importing students… {progress.done} of {progress.total}
          </p>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-navy transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Spinner /> Please keep this window open until the import finishes.
          </div>
        </div>
      )}

      {/* STEP: done */}
      {step === 'done' && (
        <div className="space-y-4">
          <Alert type="success">
            {results.success.length} student{results.success.length === 1 ? '' : 's'} imported successfully.
            {results.failed.length > 0 && ` ${results.failed.length} failed.`}
          </Alert>

          {results.success.length > 0 && (
            <div>
              <h4 className="mb-1 text-sm font-semibold text-slate-700">Imported</h4>
              <div className="max-h-40 overflow-auto rounded-lg border border-slate-200 text-sm">
                {results.success.map((s, i) => (
                  <div key={i} className="flex justify-between px-3 py-1.5 odd:bg-slate-50">
                    <span className="text-slate-700">{s.label}</span>
                    <span className="font-medium text-navy">{s.admission_no}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.failed.length > 0 && (
            <div>
              <h4 className="mb-1 text-sm font-semibold text-red-700">Failed</h4>
              <div className="max-h-40 overflow-auto rounded-lg border border-red-200 text-sm">
                {results.failed.map((f, i) => (
                  <div key={i} className="px-3 py-1.5 odd:bg-red-50/40">
                    <span className="font-medium text-slate-700">{f.label}</span>
                    <span className="text-red-600"> — {f.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button className="btn-outline" onClick={reset}>Import More</button>
            <button className="btn-primary" onClick={() => { onDone?.(); reset(); onClose() }}>Done</button>
          </div>
        </div>
      )}
    </Modal>
  )
}
