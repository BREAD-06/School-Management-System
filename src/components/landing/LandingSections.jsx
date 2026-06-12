import { Link } from 'react-router-dom'
import {
  SCHOOL, IMAGES, FEATURES, WHY_CHOOSE, FACILITIES, ACHIEVEMENTS, ADMISSION_STEPS,
} from '../../lib/landingContent.js'
import Reveal, { SectionHeading } from './Reveal.jsx'
import LandingIcon from './LandingIcon.jsx'

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* D) Feature badges ------------------------------------------------------- */
export function Features() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Why Bala Ji"
          title="What Sets Us Apart"
          subtitle="A nurturing foundation built on care, curiosity and character."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 100}>
              <div className="group h-full rounded-2xl border border-slate-100 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-gold/40 hover:shadow-lg">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy/5 text-navy transition group-hover:bg-gold group-hover:text-navy">
                  <LandingIcon name={f.icon} className="h-7 w-7" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-navy">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* E) About school --------------------------------------------------------- */
export function About({ about, image = IMAGES.about }) {
  return (
    <section id="about" className="bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
        <Reveal direction="left">
          <div className="relative">
            <img
              src={image}
              alt="Students learning at Bala Ji Public School"
              className="aspect-[4/3] w-full rounded-2xl object-cover shadow-xl"
              loading="lazy"
            />
            <div className="absolute -bottom-5 -right-4 hidden rounded-2xl bg-gold px-6 py-5 text-navy shadow-lg sm:block">
              <p className="text-sm font-semibold leading-tight">{SCHOOL.classesRange}</p>
              <p className="text-xs">Co-educational</p>
            </div>
          </div>
        </Reveal>

        <Reveal direction="right" delay={120}>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-600">About Our School</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-navy sm:text-4xl">{about.heading}</h2>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-slate-600">
            {about.body.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
                <LandingIcon name="innovate" className="h-5 w-5 text-gold-600" /> Our Vision
              </h4>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{about.vision}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
                <LandingIcon name="safe" className="h-5 w-5 text-gold-600" /> Our Mission
              </h4>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{about.mission}</p>
            </div>
          </div>

          {about.values?.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {about.values.map((v) => (
                <span key={v} className="rounded-full bg-navy/5 px-3 py-1 text-xs font-medium text-navy">{v}</span>
              ))}
            </div>
          )}

          <a href="#academics" className="mt-7 inline-flex items-center gap-2 rounded-lg bg-navy px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy-800">
            Learn More <LandingIcon name="arrowRight" className="h-4 w-4" strokeWidth={2} />
          </a>
        </Reveal>
      </div>
    </section>
  )
}

/* F) Principal's message --------------------------------------------------- */
export function Principal({ principal, image = IMAGES.principal }) {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-3">
          <Reveal className="lg:col-span-1">
            <div className="relative mx-auto max-w-xs">
              <img
                src={image}
                alt={principal.name}
                className="aspect-[3/4] w-full rounded-2xl object-cover shadow-xl"
                loading="lazy"
              />
              <span className="absolute -left-3 -top-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gold font-serif text-3xl font-bold leading-none text-navy shadow">“</span>
            </div>
          </Reveal>

          <Reveal delay={120} className="lg:col-span-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-600">From the Principal’s Desk</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-navy sm:text-4xl">A Message of Welcome</h2>
            <blockquote className="mt-6 border-l-4 border-gold pl-6 text-base italic leading-relaxed text-slate-600">
              {principal.message}
            </blockquote>
            <div className="mt-6">
              <p className="font-serif text-2xl font-semibold text-navy">{principal.name}</p>
              <p className="text-sm text-slate-500">{principal.title}</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* H) Why choose us --------------------------------------------------------- */
export function WhyChooseUs() {
  return (
    <section className="bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Our Strengths"
          title="Why Choose Us"
          subtitle="Everything we do is centred on helping your child flourish."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {WHY_CHOOSE.map((w, i) => (
            <Reveal key={w.title} delay={i * 100}>
              <div className="flex h-full items-start gap-4 rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-royal-50 text-royal">
                  <LandingIcon name={w.icon} className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-navy">{w.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{w.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* I) Facilities ------------------------------------------------------------ */
export function Facilities({ items = FACILITIES }) {
  return (
    <section id="facilities" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Campus"
          title="Our Facilities"
          subtitle="Thoughtfully designed spaces that support learning and play."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((f, i) => (
            <Reveal key={f.title} delay={(i % 4) * 100}>
              <div className="group relative h-56 overflow-hidden rounded-2xl shadow-sm">
                <img src={f.img} alt={f.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-900/85 via-navy-900/20 to-transparent" />
                <h3 className="absolute bottom-4 left-4 right-4 text-base font-semibold text-white">{f.title}</h3>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* J) Achievements ---------------------------------------------------------- */
export function Achievements() {
  return (
    <section id="achievements" className="bg-navy py-20 text-white sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Proud Moments"
          title="Our Achievements"
          subtitle="Celebrating the success of our students across every field."
          light
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {ACHIEVEMENTS.map((a, i) => (
            <Reveal key={a.title} delay={i * 100}>
              <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm transition hover:bg-white/10">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gold text-navy">
                  <LandingIcon name={a.icon} className="h-8 w-8" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-white">{a.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/75">{a.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* K) Latest announcements -------------------------------------------------- */
export function AnnouncementsSection({ announcements }) {
  const items = announcements && announcements.length > 0 ? announcements : null
  const placeholders = [
    { id: 'p1', title: 'Admissions Open for the New Session', description: 'Enrolment for Nursery to Class 10 is now open. Visit the school office to collect a form.', created_at: null },
    { id: 'p2', title: 'Annual Day Celebration', description: 'Our students are preparing for a vibrant Annual Day. Stay tuned for the schedule.', created_at: null },
    { id: 'p3', title: 'Parent–Teacher Meeting', description: 'A PTM will be held to discuss student progress. Parents are requested to attend.', created_at: null },
  ]
  const list = items || placeholders

  return (
    <section className="bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeading eyebrow="Notice Board" title="Latest Announcements" />
        <div className="mt-12 space-y-4">
          {list.map((a, i) => (
            <Reveal key={a.id} direction="right" delay={i * 100}>
              <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-md sm:flex-row sm:items-start sm:gap-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-600">
                  <LandingIcon name="holistic" className="h-6 w-6" />
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-navy">{a.title}</h3>
                    {a.created_at && <span className="text-xs text-slate-400">{formatDate(a.created_at)}</span>}
                  </div>
                  {a.description && (
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600">{a.description}</p>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-royal hover:text-navy">
            View All Announcements <LandingIcon name="arrowRight" className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </section>
  )
}

/* L) Admissions ------------------------------------------------------------ */
export function Admissions() {
  return (
    <section id="academics" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Admissions"
          title="Join the Bala Ji Family"
          subtitle={`We welcome admissions from ${SCHOOL.classesRange}. Here's how to get started.`}
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ADMISSION_STEPS.map((s, i) => (
            <Reveal key={s.step} delay={i * 100}>
              <div className="relative h-full rounded-2xl border border-slate-100 bg-slate-50 p-6">
                <span className="font-serif text-4xl font-bold text-gold/60">{s.step}</span>
                <h3 className="mt-2 text-base font-semibold text-navy">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-10">
          <div className="grid gap-6 rounded-2xl bg-navy p-8 text-white sm:grid-cols-3 sm:items-center">
            <div className="sm:col-span-2">
              <h3 className="text-xl font-semibold">Eligibility & Classes Available</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/80">
                Admissions are open for all classes from <span className="font-semibold text-gold-400">{SCHOOL.classesRange}</span>.
                Age-appropriate placement is determined at the time of admission. Please carry the child’s birth certificate
                and previous school records (if any) when you visit.
              </p>
            </div>
            <div className="sm:text-right">
              <a href="#contact" className="inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-navy transition hover:bg-gold-600 hover:text-white">
                Enquire Now <LandingIcon name="arrowRight" className="h-4 w-4" strokeWidth={2} />
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
