const STYLES = {
  error: 'border-red-200 bg-red-50 text-red-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-royal-100 bg-royal-50 text-royal-600',
}

export default function Alert({ type = 'info', children, className = '' }) {
  if (!children) return null
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`rounded-lg border px-4 py-3 text-sm ${STYLES[type]} ${className}`}
    >
      {children}
    </div>
  )
}
