import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import PageHeader from '../../components/PageHeader.jsx'
import Alert from '../../components/ui/Alert.jsx'
import { PageLoader } from '../../components/ui/Spinner.jsx'
import Icon from '../../components/ui/Icon.jsx'

const LAST_SEEN_KEY = 'notifications_last_seen'

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const AUDIENCE_LABEL = { all: 'Everyone', students: 'Students', teachers: 'Teachers' }

export default function StudentNotifications() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [items, setItems] = useState([])
  const [lastSeen, setLastSeen] = useState(() => localStorage.getItem(LAST_SEEN_KEY) || '')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('announcements')
        .select('id, title, description, audience, attachment_url, created_at')
        .in('audience', ['all', 'students'])
        .order('created_at', { ascending: false })
      if (err) throw err
      setItems(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load notifications.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Mark all as seen when user visits
  useEffect(() => {
    if (!loading && items.length > 0) {
      const now = new Date().toISOString()
      localStorage.setItem(LAST_SEEN_KEY, now)
      setLastSeen(now)
    }
  }, [loading, items.length])

  const isNew = (item) => !lastSeen || new Date(item.created_at) > new Date(lastSeen)

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Announcements and notices from school administration" />

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {loading ? (
        <PageLoader />
      ) : items.length === 0 ? (
        <div className="card px-6 py-16 text-center text-sm text-slate-500">No announcements yet.</div>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <div key={item.id} className={`card p-5 ${isNew(item) ? 'border-royal-100 bg-royal-50/30' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {isNew(item) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-royal px-2 py-0.5 text-xs font-semibold text-white">
                        New
                      </span>
                    )}
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
                      {AUDIENCE_LABEL[item.audience] || item.audience}
                    </span>
                    <span className="text-xs text-slate-400">{formatDate(item.created_at)}</span>
                  </div>
                  <h3 className="font-semibold text-navy">{item.title}</h3>
                  {item.description && (
                    <p className="mt-1.5 text-sm text-slate-600 whitespace-pre-line">{item.description}</p>
                  )}
                  {item.attachment_url && (
                    <a href={item.attachment_url} target="_blank" rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-royal hover:underline">
                      <Icon name="materials" className="h-4 w-4" />
                      Download attachment
                    </a>
                  )}
                </div>
                <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${isNew(item) ? 'bg-royal' : 'bg-transparent'}`} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
