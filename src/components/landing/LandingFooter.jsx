import { Link } from 'react-router-dom'
import { SCHOOL, NAV_LINKS } from '../../lib/landingContent.js'
import LandingIcon from './LandingIcon.jsx'

const SOCIALS = [
  { label: 'Facebook', path: 'M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.9 3.78-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.9h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94z' },
  { label: 'Instagram', path: 'M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 3.68A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84zm0 10.16A4 4 0 1 1 16 12a4 4 0 0 1-4 4zm6.41-10.4a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44z' },
  { label: 'YouTube', path: 'M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.55 15.57V8.43L15.82 12z' },
]

export default function LandingFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="bg-navy-900 text-white/70">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* 1) Intro + logo */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3">
              <img src="/bjps-logo.png" alt="Bala Ji Public School" className="h-16 w-auto shrink-0" />
              <span className="text-base font-bold text-white">{SCHOOL.name}</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed">
              {SCHOOL.motto}. Quality, value-based education from {SCHOOL.classesRange} in Jathlana, Yamunanagar.
            </p>
          </div>

          {/* 2) Quick links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-white">Quick Links</h4>
            <ul className="mt-4 space-y-2 text-sm">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="transition hover:text-gold-400">{l.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* 3) Admissions */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-white">Admissions</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><a href="#academics" className="transition hover:text-gold-400">Admission Process</a></li>
              <li><a href="#academics" className="transition hover:text-gold-400">Eligibility</a></li>
              <li><a href="#contact" className="transition hover:text-gold-400">Enquire Now</a></li>
              <li><Link to="/login" className="transition hover:text-gold-400">Portal Login</Link></li>
            </ul>
          </div>

          {/* 4) Contact */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-white">Contact</h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <LandingIcon name="location" className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" strokeWidth={1.7} />
                <span>{SCHOOL.address}</span>
              </li>
              <li className="flex items-center gap-2">
                <LandingIcon name="phone" className="h-4 w-4 shrink-0 text-gold-400" strokeWidth={1.7} />
                <a href={`tel:${SCHOOL.phone}`} className="hover:text-gold-400">{SCHOOL.phone}</a>
              </li>
              <li className="flex items-center gap-2">
                <LandingIcon name="email" className="h-4 w-4 shrink-0 text-gold-400" strokeWidth={1.7} />
                <a href={`mailto:${SCHOOL.email}`} className="break-all hover:text-gold-400">{SCHOOL.email}</a>
              </li>
            </ul>
          </div>

          {/* 5) Social */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-white">Follow Us</h4>
            <div className="mt-4 flex gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-gold hover:text-navy"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
            <p className="mt-4 text-xs text-white/50">Social links coming soon.</p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-5 text-center text-xs text-white/50 sm:px-6">
          © {year} {SCHOOL.name}. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
