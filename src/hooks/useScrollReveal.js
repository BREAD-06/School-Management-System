import { useEffect, useRef, useState } from 'react'

// Reusable scroll-reveal hook built on the IntersectionObserver API (no external
// library). Returns a `ref` to attach to the element you want to animate and an
// `isVisible` flag that flips to true the first time the element scrolls into
// view. Drive any CSS transform/opacity transition off `isVisible`.
//
// Design goals (per the landing-page animation spec):
//   • Trigger when the element is ~20% visible (threshold: 0.2).
//   • Play once — never re-hide on scroll up (once: true).
//   • Respect prefers-reduced-motion: reveal immediately, no animation.
//   • GPU-friendly — callers should animate ONLY opacity + transform.
export default function useScrollReveal({
  threshold = 0.2,
  rootMargin = '0px 0px -10% 0px',
  once = true,
} = {}) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Reduced-motion or no IO support → show immediately.
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true)
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            if (once) io.unobserve(entry.target)
          } else if (!once) {
            setIsVisible(false)
          }
        })
      },
      { threshold, rootMargin },
    )

    io.observe(el)
    return () => io.disconnect()
  }, [threshold, rootMargin, once])

  return { ref, isVisible }
}
