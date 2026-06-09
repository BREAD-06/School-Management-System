import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SCHOOL, NAV_LINKS } from '../../lib/landingContent.js'
import LandingIcon from './LandingIcon.jsx'

function Logo({ dark, motto }) {
  return (
    <a href="#home" className="flex items-center gap-3">
      <img src="/bjps-logo.png" alt="Bala Ji Public School" className="h-12 w-auto shrink-0 animate-logo-pulse" />
      <span className="min-w-0">
        <span className={`block truncate text-base font-bold leading-tight sm:text-lg ${dark ? 'text-navy' : 'text-white'}`}>
          {SCHOOL.name}
        </span>
        <span className={`block truncate text-[11px] font-medium tracking-wide ${dark ? 'text-royal' : 'text-gold-100'}`}>
          {motto}
        </span>
      </span>
    </a>
  )
}

export default function LandingHeader({ motto = SCHOOL.motto }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // When the mobile drawer is open, lock body scroll.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const solid = scrolled // header background filled when scrolled
  const darkText = solid

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* A) Top info bar — slim, hidden on mobile */}
      <div
        className={`hidden transition-colors md:block ${
          solid ? 'bg-navy-900 text-white/80' : 'bg-black/20 text-white/90 backdrop-blur-sm'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-1.5 text-xs">
          <div className="flex items-center gap-5">
            <a href={`tel:${SCHOOL.phone}`} className="flex items-center gap-1.5 hover:text-gold-400">
              <LandingIcon name="phone" className="h-3.5 w-3.5" strokeWidth={1.8} /> {SCHOOL.phone}
            </a>
            <a href={`mailto:${SCHOOL.email}`} className="flex items-center gap-1.5 hover:text-gold-400">
              <LandingIcon name="email" className="h-3.5 w-3.5" strokeWidth={1.8} /> {SCHOOL.email}
            </a>
          </div>
          <span className="flex items-center gap-1.5">
            <LandingIcon name="clock" className="h-3.5 w-3.5" strokeWidth={1.8} /> {SCHOOL.officeHours}
          </span>
        </div>
      </div>

      {/* B) Main header */}
      <div className={`transition-colors duration-300 ${solid ? 'bg-white shadow-md' : 'bg-transparent'}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo dark={darkText} motto={motto} />

          {/* Center nav (desktop) */}
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className={`relative rounded-md px-3 py-2 text-sm font-medium transition after:absolute after:bottom-1 after:left-3 after:right-3 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-gold after:transition-transform after:duration-300 hover:text-gold hover:after:scale-x-100 ${
                  darkText ? 'text-slate-700' : 'text-white/90'
                }`}
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                darkText
                  ? 'border border-navy text-navy hover:bg-navy hover:text-white'
                  : 'border border-white/70 text-white hover:bg-white hover:text-navy'
              }`}
            >
              Login
            </Link>
            <a
              href="#contact"
              className="hidden rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-navy shadow-sm transition hover:bg-gold-600 hover:text-white sm:inline-block"
            >
              Admission Inquiry
            </a>

            {/* Hamburger (mobile/tablet) */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className={`rounded-md p-2 lg:hidden ${darkText ? 'text-navy hover:bg-slate-100' : 'text-white hover:bg-white/10'}`}
            >
              <LandingIcon name="menu" className="h-6 w-6" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-0 flex h-full w-72 max-w-[80%] flex-col bg-navy text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <span className="text-base font-bold">{SCHOOL.name}</span>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" className="rounded-md p-1.5 hover:bg-white/10">
                <LandingIcon name="close" className="h-6 w-6" strokeWidth={1.8} />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-3 text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white"
                >
                  {l.label}
                </a>
              ))}
            </nav>
            <div className="space-y-2 border-t border-white/10 p-4">
              <a
                href="#contact"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg bg-gold px-4 py-2.5 text-center text-sm font-semibold text-navy hover:bg-gold-600"
              >
                Admission Inquiry
              </a>
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg border border-white/40 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-white/10"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
