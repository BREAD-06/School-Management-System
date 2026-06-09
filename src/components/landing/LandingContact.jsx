import { useEffect, useState } from 'react'
import { SCHOOL } from '../../lib/landingContent.js'
import Reveal, { SectionHeading } from './Reveal.jsx'
import LandingIcon from './LandingIcon.jsx'

const WhatsAppGlyph = ({ className = 'h-5 w-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
)

const Spinner = ({ className = 'h-5 w-5' }) => (
  <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

// Animated checkmark — the stroke "draws" itself via the draw-check keyframe.
const CheckGlyph = ({ className = 'h-5 w-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 13l4 4L19 7" style={{ strokeDasharray: 26 }} className="animate-draw-check" />
  </svg>
)

// Left-column contact info cards.
const CARDS = [
  { icon: 'location', title: 'Address', value: SCHOOL.address },
  { icon: 'phone', title: 'Phone', value: SCHOOL.phone, href: `tel:${SCHOOL.phone}` },
  { icon: 'email', title: 'Email', value: SCHOOL.email, href: `mailto:${SCHOOL.email}` },
  { icon: 'clock', title: 'Office Hours', value: SCHOOL.officeHours },
]

// Floating-label field. The label sits inside the field and floats up on focus
// or when the field has a value (peer + placeholder-shown technique). On focus
// the border turns gold and a soft gold ring "glows".
function Field({ id, label, type = 'text', value, onChange, required, textarea }) {
  // A single-space placeholder keeps :placeholder-shown working while staying
  // invisible. The label's DEFAULT state is the floated (up) position; when the
  // field is empty AND unfocused, peer-placeholder-shown pushes it back down
  // into the field. On focus it floats up again and turns gold.
  const base =
    'peer block w-full rounded-lg border border-slate-300 bg-white px-4 pt-6 pb-2 text-sm text-slate-900 shadow-sm transition-all duration-200 focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold/20'
  const labelCls =
    'pointer-events-none absolute left-4 top-2 text-xs font-medium text-slate-500 transition-all duration-200 ' +
    'peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:text-slate-400 ' +
    'peer-focus:top-2 peer-focus:text-xs peer-focus:font-medium peer-focus:text-gold-600'
  return (
    <div className="relative">
      {textarea ? (
        <textarea id={id} rows={4} placeholder=" " value={value} onChange={onChange} className={`${base} resize-none`} />
      ) : (
        <input id={id} type={type} placeholder=" " value={value} onChange={onChange} className={base} />
      )}
      <label htmlFor={id} className={labelCls}>
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
    </div>
  )
}

export default function LandingContact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [error, setError] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | success
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  // After a successful send, return the button to its idle state.
  useEffect(() => {
    if (status !== 'success') return
    const t = setTimeout(() => setStatus('idle'), 4500)
    return () => clearTimeout(t)
  }, [status])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (status === 'submitting') return
    if (!form.name.trim() || !form.phone.trim() || !form.message.trim()) {
      setError('Please fill in your name, phone and message.')
      return
    }
    setError('')
    setStatus('submitting')

    // No contact backend yet — compose a pre-filled WhatsApp enquiry so the
    // message actually reaches the school. A short delay surfaces the loading
    // state before the success animation.
    const text = encodeURIComponent(
      `Admission / General Enquiry\n\nName: ${form.name}\nPhone: ${form.phone}` +
        (form.email ? `\nEmail: ${form.email}` : '') +
        `\n\nMessage: ${form.message}`,
    )
    setTimeout(() => {
      window.open(`https://wa.me/${SCHOOL.whatsapp}?text=${text}`, '_blank', 'noopener')
      setStatus('success')
      setForm({ name: '', email: '', phone: '', message: '' })
    }, 900)
  }

  return (
    <section id="contact" className="bg-navy py-20 text-white sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Get in Touch"
          title="Contact Us"
          subtitle="We’d love to hear from you. Reach out for admissions or any queries."
          light
        />

        <div className="mt-12 grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left column: contact info cards (slide in from left, staggered) */}
          <div className="space-y-4">
            {CARDS.map((c, i) => (
              <Reveal key={c.title} direction="left" delay={i * 100}>
                <div className="flex items-start gap-4 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:bg-white/10 hover:shadow-xl">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-400">
                    <LandingIcon name={c.icon} className="h-5 w-5" strokeWidth={1.7} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/50">{c.title}</p>
                    {c.href ? (
                      <a href={c.href} className="break-words text-sm font-medium text-white transition hover:text-gold-300">{c.value}</a>
                    ) : (
                      <p className="text-sm font-medium text-white">{c.value}</p>
                    )}
                  </div>
                </div>
              </Reveal>
            ))}

            {/* WhatsApp card with green action button */}
            <Reveal direction="left" delay={CARDS.length * 100}>
              <div className="flex flex-col gap-4 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:bg-white/10 hover:shadow-xl sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#25D366]/20 text-[#25D366]">
                    <WhatsAppGlyph className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/50">WhatsApp</p>
                    <p className="text-sm font-medium text-white">Chat with us instantly</p>
                  </div>
                </div>
                <a
                  href={`https://wa.me/${SCHOOL.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:scale-[1.02] hover:bg-[#1eb959] active:scale-100"
                >
                  <WhatsAppGlyph className="h-5 w-5" /> Chat Now
                </a>
              </div>
            </Reveal>
          </div>

          {/* Right column: animated form (slides in from right) */}
          <Reveal direction="right" delay={120}>
            <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 text-slate-900 shadow-2xl sm:p-8" noValidate>
              <h3 className="text-xl font-bold text-navy">Send us a message</h3>
              <p className="mt-1 text-sm text-slate-500">We typically respond within a working day.</p>

              {status === 'success' && (
                <div className="mt-5 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <span className="flex h-8 w-8 shrink-0 animate-pop-in items-center justify-center rounded-full bg-emerald-500 text-white">
                    <CheckGlyph className="h-5 w-5" />
                  </span>
                  <span>Your enquiry opened in WhatsApp — please press send there. We’ll get back to you soon!</span>
                </div>
              )}
              {error && (
                <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              )}

              <div className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="cf-name" label="Full Name" value={form.name} onChange={set('name')} required />
                  <Field id="cf-phone" label="Phone" type="tel" value={form.phone} onChange={set('phone')} required />
                </div>
                <Field id="cf-email" label="Email" type="email" value={form.email} onChange={set('email')} />
                <Field id="cf-message" label="Message" value={form.message} onChange={set('message')} required textarea />

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="group relative w-full overflow-hidden rounded-lg bg-navy px-6 py-3.5 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:bg-navy-800 hover:shadow-lg hover:scale-[1.01] active:scale-100 disabled:cursor-not-allowed disabled:opacity-80 disabled:hover:scale-100"
                >
                  {/* shimmer / shine sweep on hover */}
                  <span className="pointer-events-none absolute inset-y-0 -left-full w-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[200%]" aria-hidden="true" />
                  <span className="relative flex items-center justify-center gap-2">
                    {status === 'submitting' && (<><Spinner className="h-5 w-5" /> Sending…</>)}
                    {status === 'success' && (<><CheckGlyph className="h-5 w-5" /> Message Sent!</>)}
                    {status === 'idle' && (<>Send Message <LandingIcon name="arrowRight" className="h-4 w-4" strokeWidth={2} /></>)}
                  </span>
                </button>
              </div>

              <p className="mt-4 text-center text-xs text-slate-400">
                Or call us directly at <a href={`tel:${SCHOOL.phone}`} className="font-medium text-royal hover:text-navy">{SCHOOL.phone}</a>
              </p>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
