import useScrollReveal from '../../hooks/useScrollReveal.js'

// Hidden-state transform per direction. Only opacity + transform are animated
// (both GPU-accelerated) so reveals stay smooth and never trigger layout.
const HIDDEN = {
  up: 'translate-y-6',
  down: '-translate-y-6',
  left: '-translate-x-10',
  right: 'translate-x-10',
  fade: '',
}

// Reveals its children into view the first time they scroll into the viewport,
// using the shared useScrollReveal hook (IntersectionObserver, fires once,
// triggers at ~20% visibility, respects prefers-reduced-motion).
//
//   direction: 'up' (default) | 'down' | 'left' | 'right' | 'fade'
//   delay:     ms delay applied to the transition (use for stagger effects)
export default function Reveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  as: Tag = 'div',
}) {
  const { ref, isVisible } = useScrollReveal()
  const hidden = HIDDEN[direction] ?? HIDDEN.up

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: isVisible ? `${delay}ms` : '0ms' }}
      className={`transition-all duration-[600ms] ease-out ${
        isVisible
          ? 'translate-x-0 translate-y-0 opacity-100'
          : `${hidden} opacity-0`
      } ${className}`}
    >
      {children}
    </Tag>
  )
}

// Centered eyebrow + title + optional subtitle used at the top of each section.
export function SectionHeading({ eyebrow, title, subtitle, light = false }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow && (
        <p
          className={`text-sm font-semibold uppercase tracking-[0.2em] ${
            light ? 'text-gold-400' : 'text-gold-600'
          }`}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={`mt-2 text-3xl font-bold tracking-tight sm:text-4xl ${
          light ? 'text-white' : 'text-navy'
        }`}
      >
        {title}
      </h2>
      <span className="mx-auto mt-4 block h-1 w-16 rounded-full bg-gold" />
      {subtitle && (
        <p className={`mt-4 text-base ${light ? 'text-white/80' : 'text-slate-600'}`}>{subtitle}</p>
      )}
    </div>
  )
}
