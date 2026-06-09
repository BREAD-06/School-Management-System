import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { messagesApi } from '../lib/api.js'
import { useAuth } from '../context/useAuth.js'
import PageHeader from '../components/PageHeader.jsx'
import Modal from '../components/ui/Modal.jsx'
import Alert from '../components/ui/Alert.jsx'
import Spinner, { PageLoader } from '../components/ui/Spinner.jsx'
import Icon from '../components/ui/Icon.jsx'
import { useToast } from '../components/ui/Toast.jsx'

const ROLE_BADGE = {
  admin: 'bg-amber-50 text-amber-700',
  teacher: 'bg-royal-50 text-royal',
  student: 'bg-emerald-50 text-emerald-700',
  unknown: 'bg-slate-100 text-slate-500',
}
const ROLE_LABEL = { admin: 'Admin', teacher: 'Teacher', student: 'Student', unknown: '' }

function fmtTime(d) {
  if (!d) return ''
  const dt = new Date(d)
  const today = new Date()
  const sameDay = dt.toDateString() === today.toDateString()
  return sameDay
    ? dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}
function initials(name) {
  return (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function Messages() {
  const { user } = useAuth()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [contacts, setContacts] = useState([])
  const [conversations, setConversations] = useState([])

  const [selected, setSelected] = useState(null) // otherId
  const [thread, setThread] = useState(null) // { messages, other }
  const [loadingThread, setLoadingThread] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')

  const bottomRef = useRef(null)
  const busy = useRef(false) // prevents overlapping poll fetches

  const me = user?.id

  const loadConversations = useCallback(async () => {
    const res = await messagesApi.conversations()
    setConversations(res.conversations || [])
  }, [])

  // Initial load: directory + conversations.
  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const [dir, conv] = await Promise.all([messagesApi.directory(), messagesApi.conversations()])
        if (!active) return
        setContacts(dir.contacts || [])
        setConversations(conv.conversations || [])
      } catch (err) {
        if (active) setError(err.message || 'Failed to load messages.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const openThread = useCallback(async (otherId) => {
    setSelected(otherId)
    setLoadingThread(true)
    try {
      const res = await messagesApi.thread(otherId)
      setThread(res)
      // Opening marks incoming as read server-side — refresh unread counts.
      loadConversations().catch(() => {})
    } catch (err) {
      toast.error(err.message || 'Failed to open conversation.')
    } finally {
      setLoadingThread(false)
    }
  }, [loadConversations, toast])

  // Light polling for new messages (conversations list + the open thread).
  useEffect(() => {
    const id = setInterval(async () => {
      if (busy.current || document.hidden) return
      busy.current = true
      try {
        await loadConversations()
        if (selected) {
          const res = await messagesApi.thread(selected)
          setThread(res)
        }
      } catch { /* ignore poll errors */ } finally {
        busy.current = false
      }
    }, 15000)
    return () => clearInterval(id)
  }, [selected, loadConversations])

  // Auto-scroll the thread to the latest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [thread?.messages?.length, selected])

  const handleSend = async (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || !selected) return
    setSending(true)
    try {
      const res = await messagesApi.send(selected, text)
      setInput('')
      setThread((t) => (t ? { ...t, messages: [...t.messages, res.message] } : t))
      loadConversations().catch(() => {})
    } catch (err) {
      toast.error(err.message || 'Failed to send message.')
    } finally {
      setSending(false)
    }
  }

  const pickContact = (c) => {
    setPickerOpen(false)
    setPickerSearch('')
    openThread(c.id)
  }

  const filteredContacts = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase()
    if (!q) return contacts
    return contacts.filter((c) => c.name.toLowerCase().includes(q))
  }, [contacts, pickerSearch])

  const otherInfo = thread?.other

  if (loading) {
    return (
      <div>
        <PageHeader title="Messages" subtitle="Your conversations" />
        <PageLoader />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle="Send and receive messages"
        actions={
          <button className="btn-primary" onClick={() => setPickerOpen(true)} disabled={contacts.length === 0}>
            <Icon name="messages" /> New Message
          </button>
        }
      />

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      <div className="card grid h-[72vh] grid-cols-1 overflow-hidden lg:grid-cols-3">
        {/* Conversation list */}
        <aside
          className={`flex flex-col border-slate-200 lg:col-span-1 lg:border-r ${selected ? 'hidden lg:flex' : 'flex'}`}
        >
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-navy">Conversations</div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                No conversations yet. Click “New Message” to start one.
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.otherId}
                  onClick={() => openThread(c.otherId)}
                  className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${
                    selected === c.otherId ? 'bg-royal-50/60' : ''
                  }`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
                    {initials(c.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-slate-800">{c.name}</span>
                      <span className="shrink-0 text-xs text-slate-400">{fmtTime(c.lastAt)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-slate-500">{c.last}</span>
                      {c.unread > 0 && (
                        <span className="ml-1 inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-royal px-1.5 text-[11px] font-semibold text-white">
                          {c.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Thread */}
        <section className={`flex flex-col lg:col-span-2 ${selected ? 'flex' : 'hidden lg:flex'}`}>
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-sm text-slate-400">
              <Icon name="messages" className="mb-3 h-10 w-10 text-slate-300" />
              Select a conversation or start a new message.
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
                <button
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
                  onClick={() => { setSelected(null); setThread(null) }}
                  aria-label="Back"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
                  {initials(otherInfo?.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy">{otherInfo?.name || '—'}</p>
                  {otherInfo?.role && ROLE_LABEL[otherInfo.role] && (
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${ROLE_BADGE[otherInfo.role]}`}>
                      {ROLE_LABEL[otherInfo.role]}
                    </span>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
                {loadingThread && !thread ? (
                  <PageLoader />
                ) : thread?.messages?.length ? (
                  thread.messages.map((m) => {
                    const mine = m.sender_id === me
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                            mine ? 'rounded-br-sm bg-navy text-white' : 'rounded-bl-sm bg-white text-slate-700'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.content}</p>
                          {m.attachment_url && (
                            <a
                              href={m.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className={`mt-1 inline-flex items-center gap-1 text-xs underline ${mine ? 'text-white/90' : 'text-royal'}`}
                            >
                              <Icon name="materials" className="h-3.5 w-3.5" /> Attachment
                            </a>
                          )}
                          <span className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? 'text-white/60' : 'text-slate-400'}`}>
                            {fmtTime(m.created_at)}
                            {mine && (m.is_read ? ' · Read' : ' · Sent')}
                          </span>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    No messages yet. Say hello!
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Composer */}
              <form onSubmit={handleSend} className="flex items-end gap-2 border-t border-slate-200 p-3">
                <textarea
                  className="input max-h-32 flex-1 resize-none"
                  rows={1}
                  placeholder="Type a message…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) }
                  }}
                  disabled={sending}
                />
                <button type="submit" className="btn-primary" disabled={sending || !input.trim()}>
                  {sending ? <Spinner /> : 'Send'}
                </button>
              </form>
            </>
          )}
        </section>
      </div>

      {/* Recipient picker */}
      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="New Message" maxWidth="max-w-md">
        <input
          className="input mb-3"
          placeholder="Search people…"
          value={pickerSearch}
          onChange={(e) => setPickerSearch(e.target.value)}
          autoFocus
        />
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-slate-500">No matching people.</p>
          ) : (
            filteredContacts.map((c) => (
              <button
                key={c.id}
                onClick={() => pickContact(c)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-slate-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
                  {initials(c.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-800">{c.name}</span>
                  <span className="block truncate text-xs text-slate-500">{c.subtitle}</span>
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ROLE_BADGE[c.role]}`}>
                  {ROLE_LABEL[c.role]}
                </span>
              </button>
            ))
          )}
        </div>
      </Modal>
    </div>
  )
}
