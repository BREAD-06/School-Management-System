import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/useAuth.js'
import { DEFAULT_CONTENT, IMAGES, FACILITIES } from '../../lib/landingContent.js'
import { compressImage } from '../../lib/imageUtils.js'
import { sanitiseFileName, deleteStorageFile } from '../../lib/fileUtils.js'
import PageHeader from '../../components/PageHeader.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Spinner, { PageLoader } from '../../components/ui/Spinner.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { useToast } from '../../components/ui/Toast.jsx'

// Editable TEXT sections (section_key -> content_data).
const SECTION_KEYS = ['hero', 'about', 'principal', 'contact']

// Editable IMAGE sections. Uploaded to the public `website-content` bucket; the
// landing page reads these and falls back to the Unsplash placeholders.
const BUCKET = 'website-content'
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png']

const IMAGE_SECTIONS = [
  { key: 'hero_image', label: 'Hero Background Image', fallback: IMAGES.hero, box: 'h-28 w-48' },
  { key: 'about_image', label: 'About School Image', fallback: IMAGES.about, box: 'h-28 w-40' },
  { key: 'principal_photo', label: "Principal's Photo", fallback: IMAGES.principal, box: 'h-32 w-28' },
]
const FACILITY_SECTIONS = FACILITIES.map((f, i) => ({
  key: `facility_${i + 1}`,
  defaultTitle: f.title,
  fallback: f.img,
}))

function toForm(merged) {
  return {
    hero: {
      headline: merged.hero.headline || '',
      subheadline: merged.hero.subheadline || '',
      motto: merged.hero.motto || '',
    },
    about: {
      heading: merged.about.heading || '',
      body: merged.about.body || '',
      vision: merged.about.vision || '',
      mission: merged.about.mission || '',
      values: (merged.about.values || []).join(', '),
    },
    principal: {
      name: merged.principal.name || '',
      title: merged.principal.title || '',
      message: merged.principal.message || '',
    },
    contact: {
      phone: merged.contact.phone || '',
      email: merged.contact.email || '',
      address: merged.contact.address || '',
      officeHours: merged.contact.officeHours || '',
      mapQuery: merged.contact.mapQuery || '',
    },
  }
}

function sectionData(key, form) {
  if (key === 'about') {
    return {
      ...form.about,
      values: form.about.values.split(',').map((v) => v.trim()).filter(Boolean),
    }
  }
  return form[key]
}

// Default image state: facility titles seeded from defaults, urls empty.
function defaultImgs() {
  const imgs = {}
  for (const s of IMAGE_SECTIONS) imgs[s.key] = { url: '' }
  for (const s of FACILITY_SECTIONS) imgs[s.key] = { title: s.defaultTitle, url: '' }
  return imgs
}

export default function WebsiteContent() {
  const { user } = useAuth()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(toForm(DEFAULT_CONTENT))
  const [imgs, setImgs] = useState(defaultImgs())
  const [uploadingKey, setUploadingKey] = useState(null)
  const [stage, setStage] = useState(null) // null | 'compressing' | 'uploading' | 'saving'
  const stageLabel =
    stage === 'compressing' ? 'Compressing…' : stage === 'uploading' ? 'Uploading…' : 'Saving…'
  const [ids, setIds] = useState({}) // section_key -> existing row id

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('website_content')
        .select('id, section_key, content_data')
      if (err) throw err

      const merged = JSON.parse(JSON.stringify(DEFAULT_CONTENT))
      const imgState = defaultImgs()
      const idMap = {}
      for (const row of data || []) {
        idMap[row.section_key] = row.id
        if (SECTION_KEYS.includes(row.section_key)) {
          merged[row.section_key] = { ...merged[row.section_key], ...(row.content_data || {}) }
        } else if (imgState[row.section_key]) {
          imgState[row.section_key] = { ...imgState[row.section_key], ...(row.content_data || {}) }
        }
      }
      setIds(idMap)
      setForm(toForm(merged))
      setImgs(imgState)
    } catch (err) {
      setError(err.message || 'Failed to load website content.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const setField = (section, field) => (e) =>
    setForm((f) => ({ ...f, [section]: { ...f[section], [field]: e.target.value } }))

  // Upsert one section. Mutates the passed idMap so callers can persist new ids.
  const saveSection = async (key, content_data, idMap) => {
    const payload = {
      section_key: key,
      content_data,
      updated_by: user?.id || null,
      updated_at: new Date().toISOString(),
    }
    if (idMap[key]) {
      const { error: err } = await supabase.from('website_content').update(payload).eq('id', idMap[key])
      if (err) throw err
    } else {
      const { data, error: err } = await supabase
        .from('website_content').insert(payload).select('id').single()
      if (err) throw err
      idMap[key] = data.id
    }
  }

  // Save text sections + facility titles (image urls are saved on upload).
  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const newIds = { ...ids }
      for (const key of SECTION_KEYS) {
        await saveSection(key, sectionData(key, form), newIds)
      }
      for (const s of FACILITY_SECTIONS) {
        const cur = imgs[s.key] || {}
        const cd = { title: cur.title || s.defaultTitle }
        if (cur.url) cd.url = cur.url
        await saveSection(s.key, cd, newIds)
      }
      setIds(newIds)
      toast.success('Website content saved. The landing page is now updated.')
    } catch (err) {
      setError(err.message || 'Failed to save content.')
    } finally {
      setSaving(false)
    }
  }

  const setFacilityTitle = (key) => (e) => {
    const title = e.target.value
    setImgs((s) => ({ ...s, [key]: { ...s[key], title } }))
  }

  // Upload an image immediately to storage + persist its url.
  const handleImageUpload = async (key, file) => {
    if (!file) return
    if (file.size > MAX_FILE_SIZE) { toast.error('Image must be under 5 MB.'); return }
    if (!ALLOWED_TYPES.includes(file.type)) { toast.error('Only JPG and PNG images are allowed.'); return }
    setUploadingKey(key)
    try {
      setStage('compressing')
      const fileToUpload = await compressImage(file, 'website')

      // Delete the previous image for this section before uploading the new one.
      await deleteStorageFile(BUCKET, imgs[key]?.url)

      setStage('uploading')
      const path = `${key}/${sanitiseFileName(fileToUpload)}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, fileToUpload, { upsert: true })
      if (upErr) throw upErr
      const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl

      setStage('saving')
      const isFacility = key.startsWith('facility_')
      const content_data = isFacility ? { title: imgs[key]?.title || '', url } : { url }
      const idMap = { ...ids }
      await saveSection(key, content_data, idMap)
      setIds(idMap)
      setImgs((s) => ({ ...s, [key]: { ...s[key], url } }))
      toast.success('Image updated. The landing page now uses it.')
    } catch (err) {
      toast.error(err.message || 'Image upload failed.')
    } finally {
      setUploadingKey(null)
      setStage(null)
    }
  }

  const onFilePick = (key) => (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (file) handleImageUpload(key, file)
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Website Content" subtitle="Edit the public landing page" />
        <PageLoader />
      </div>
    )
  }

  // Reusable image-upload control.
  const UploadButton = ({ sectionKey }) => (
    <label
      className={`btn-outline cursor-pointer ${uploadingKey ? 'pointer-events-none opacity-60' : ''}`}
    >
      {uploadingKey === sectionKey ? <Spinner label={stageLabel} /> : (<><Icon name="gallery" /> Upload</>)}
      <input type="file" accept=".jpg,.jpeg,.png" className="hidden" onChange={onFilePick(sectionKey)} />
    </label>
  )

  return (
    <div>
      <PageHeader
        title="Website Content"
        subtitle="Edit the text and images shown on the public landing page"
        actions={
          <Link to="/" target="_blank" className="btn-outline">
            <Icon name="website" /> View Site
          </Link>
        }
      />

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Hero */}
        <section className="card p-6">
          <h3 className="text-base font-semibold text-navy">Hero Section</h3>
          <p className="mb-4 mt-1 text-sm text-slate-500">The large banner at the top of the landing page.</p>
          <div className="space-y-4">
            <div>
              <label className="label">Headline</label>
              <input className="input" value={form.hero.headline} onChange={setField('hero', 'headline')} disabled={saving} />
            </div>
            <div>
              <label className="label">Subheadline</label>
              <textarea className="input" rows={2} value={form.hero.subheadline} onChange={setField('hero', 'subheadline')} disabled={saving} />
            </div>
            <div>
              <label className="label">School Motto</label>
              <input className="input" value={form.hero.motto} onChange={setField('hero', 'motto')} disabled={saving} />
            </div>
          </div>
        </section>

        {/* About */}
        <section className="card p-6">
          <h3 className="text-base font-semibold text-navy">About School</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="label">Heading</label>
              <input className="input" value={form.about.heading} onChange={setField('about', 'heading')} disabled={saving} />
            </div>
            <div>
              <label className="label">About Text</label>
              <textarea className="input" rows={5} value={form.about.body} onChange={setField('about', 'body')} disabled={saving} />
              <p className="mt-1 text-xs text-slate-400">Separate paragraphs with a blank line.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Vision</label>
                <textarea className="input" rows={3} value={form.about.vision} onChange={setField('about', 'vision')} disabled={saving} />
              </div>
              <div>
                <label className="label">Mission</label>
                <textarea className="input" rows={3} value={form.about.mission} onChange={setField('about', 'mission')} disabled={saving} />
              </div>
            </div>
            <div>
              <label className="label">Core Values</label>
              <input className="input" value={form.about.values} onChange={setField('about', 'values')} disabled={saving} />
              <p className="mt-1 text-xs text-slate-400">Comma-separated, e.g. Integrity, Respect, Curiosity.</p>
            </div>
          </div>
        </section>

        {/* Principal */}
        <section className="card p-6">
          <h3 className="text-base font-semibold text-navy">Principal’s Message</h3>
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Principal’s Name</label>
                <input className="input" value={form.principal.name} onChange={setField('principal', 'name')} disabled={saving} />
              </div>
              <div>
                <label className="label">Title</label>
                <input className="input" value={form.principal.title} onChange={setField('principal', 'title')} disabled={saving} />
              </div>
            </div>
            <div>
              <label className="label">Message</label>
              <textarea className="input" rows={5} value={form.principal.message} onChange={setField('principal', 'message')} disabled={saving} />
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="card p-6">
          <h3 className="text-base font-semibold text-navy">Contact Details</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.contact.phone} onChange={setField('contact', 'phone')} disabled={saving} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" value={form.contact.email} onChange={setField('contact', 'email')} disabled={saving} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Address</label>
              <input className="input" value={form.contact.address} onChange={setField('contact', 'address')} disabled={saving} />
            </div>
            <div>
              <label className="label">Office Hours</label>
              <input className="input" value={form.contact.officeHours} onChange={setField('contact', 'officeHours')} disabled={saving} />
            </div>
            <div>
              <label className="label">Map Location (search query)</label>
              <input className="input" value={form.contact.mapQuery} onChange={setField('contact', 'mapQuery')} disabled={saving} />
            </div>
          </div>
        </section>

        {/* Images */}
        <section className="card p-6">
          <h3 className="text-base font-semibold text-navy">Landing Page Images</h3>
          <p className="mb-4 mt-1 text-sm text-slate-500">
            Uploads save immediately. Max 5 MB · JPG or PNG. If no image is uploaded, a default placeholder is shown.
          </p>

          <div className="space-y-5">
            {IMAGE_SECTIONS.map((s) => (
              <div key={s.key} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <img
                  src={imgs[s.key]?.url || s.fallback}
                  alt={s.label}
                  className={`${s.box} shrink-0 rounded-lg border border-slate-200 object-cover`}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">{s.label}</p>
                  <p className="text-xs text-slate-400">{imgs[s.key]?.url ? 'Custom image uploaded.' : 'Using placeholder.'}</p>
                </div>
                <UploadButton sectionKey={s.key} />
              </div>
            ))}
          </div>

          <h4 className="mb-3 mt-8 text-sm font-semibold text-navy">Facilities (title &amp; image)</h4>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FACILITY_SECTIONS.map((s) => (
              <div key={s.key} className="rounded-xl border border-slate-200 p-3">
                <div className="relative mb-2 h-28 overflow-hidden rounded-lg bg-slate-100">
                  <img
                    src={imgs[s.key]?.url || s.fallback}
                    alt={imgs[s.key]?.title || s.defaultTitle}
                    className="h-full w-full object-cover"
                  />
                </div>
                <input
                  className="input mb-2 text-sm"
                  value={imgs[s.key]?.title ?? ''}
                  onChange={setFacilityTitle(s.key)}
                  placeholder="Facility title"
                  disabled={saving}
                />
                <UploadButton sectionKey={s.key} />
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Facility titles are saved when you click “Save Changes”.
          </p>
        </section>

        <div className="flex justify-end gap-3">
          <button type="button" className="btn-outline" onClick={load} disabled={saving}>Reset</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Spinner label="Saving…" /> : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
