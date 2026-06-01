import PageHeader from '../components/PageHeader.jsx'
import Icon from '../components/ui/Icon.jsx'

// Used for modules that are part of later phases. Keeps the shell navigable.
export default function Placeholder({ title, icon = 'default', phase = 'a later phase' }) {
  return (
    <div>
      <PageHeader title={title} />
      <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-royal-50 text-royal">
          <Icon name={icon} className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-semibold text-slate-700">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          This module is scheduled for {phase}. The navigation and layout are ready — functionality
          will be added next.
        </p>
      </div>
    </div>
  )
}
