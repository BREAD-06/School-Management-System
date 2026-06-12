import { useMemo, useState } from 'react'
import Reveal, { SectionHeading } from './Reveal.jsx'
import LandingIcon from './LandingIcon.jsx'

// Placeholder achievers shown before any real toppers are added in the admin
// portal. Kept generic so the section never looks empty for visitors.
const PLACEHOLDERS = [
  { id: 'p1', student_name: 'Student Name', class_name: 'Class 10', percentage: 97, session_name: 'Coming Soon', photo_url: null },
  { id: 'p2', student_name: 'Student Name', class_name: 'Class 10', percentage: 95, session_name: 'Coming Soon', photo_url: null },
  { id: 'p3', student_name: 'Student Name', class_name: 'Class 10', percentage: 93, session_name: 'Coming Soon', photo_url: null },
]

// Gold / silver / bronze styling by rank position (within the filtered list).
const RANK = [
  { ring: 'ring-yellow-400', badge: 'bg-yellow-400 text-yellow-900', label: '1st', glow: 'shadow-yellow-400/30' },
  { ring: 'ring-slate-300', badge: 'bg-slate-300 text-slate-700', label: '2nd', glow: 'shadow-slate-300/30' },
  { ring: 'ring-amber-600', badge: 'bg-amber-600 text-white', label: '3rd', glow: 'shadow-amber-600/30' },
]
const NEUTRAL = { ring: 'ring-navy/10', badge: 'bg-navy/5 text-navy', label: null, glow: '' }

export default function LandingToppers({ toppers = [] }) {
  const hasReal = toppers.length > 0
  const data = hasReal ? toppers : PLACEHOLDERS

  // Session filter — list of distinct sessions, newest-looking first.
  const sessions = useMemo(() => {
    const set = new Set(data.map(t => t.session_name).filter(Boolean))
    return ['All', ...Array.from(set).sort().reverse()]
  }, [data])

  const [session, setSession] = useState('All')

  const visible = useMemo(() => {
    const list = session === 'All' ? data : data.filter(t => t.session_name === session)
    return [...list].sort((a, b) => Number(b.percentage) - Number(a.percentage))
  }, [data, session])

  return (
    <section id="achievers" className="bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Pride of Bala Ji"
          title="Our Achievers"
          subtitle="Celebrating the students who made us proud with their outstanding results."
        />

        {/* Session filter chips (only when there is real data with >1 session) */}
        {hasReal && sessions.length > 2 && (
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {sessions.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setSession(s)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  session === s
                    ? 'bg-navy text-white'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((t, i) => {
            const rank = RANK[i] || NEUTRAL
            return (
              <Reveal key={t.id} delay={i * 100}>
                <div className={`relative h-full rounded-2xl bg-white p-7 text-center shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lg ${rank.glow ? `shadow-lg ${rank.glow}` : ''} ${!hasReal ? 'opacity-70' : ''}`}>
                  {rank.label && (
                    <span className={`absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-xs font-bold ${rank.badge}`}>
                      {rank.label}
                    </span>
                  )}
                  <div className={`mx-auto h-24 w-24 overflow-hidden rounded-full bg-slate-100 ring-4 ${rank.ring}`}>
                    {t.photo_url ? (
                      <img src={t.photo_url} alt={t.student_name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-navy/30">
                        <LandingIcon name="student" className="h-12 w-12" strokeWidth={1.4} />
                      </div>
                    )}
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-navy">{t.student_name}</h3>
                  <p className="text-sm text-slate-500">{t.class_name}</p>
                  <p className="mt-2 text-3xl font-extrabold text-gold-600">{Number(t.percentage)}%</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">{t.session_name}</p>
                </div>
              </Reveal>
            )
          })}
        </div>

        {!hasReal && (
          <p className="mt-8 text-center text-sm text-slate-400">
            Topper results will be published here soon.
          </p>
        )}
      </div>
    </section>
  )
}
