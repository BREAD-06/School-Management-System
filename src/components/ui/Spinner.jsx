export default function Spinner({ className = 'h-5 w-5', label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg
        className={`animate-spin text-current ${className}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      {label ? <span>{label}</span> : null}
    </span>
  )
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex h-full min-h-[40vh] w-full items-center justify-center text-slate-500">
      <Spinner className="h-6 w-6" label={label} />
    </div>
  )
}
