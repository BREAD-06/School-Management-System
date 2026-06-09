import { supabase } from './supabase.js'

// Calls a server-side /api endpoint, attaching the current admin's access token
// so the server can verify admin privileges. The service role key never touches
// the browser — it lives only inside the serverless function.
async function postApi(path, payload) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token

  const res = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload || {}),
  })

  let json = {}
  try {
    json = await res.json()
  } catch {
    // non-JSON response
  }
  if (!res.ok) {
    throw new Error(json.error || `Request failed (${res.status})`)
  }
  return json
}

export const createStudent = (payload) => postApi('create-student', payload)
export const createTeacher = (payload) => postApi('create-teacher', payload)
// Resets a user's password to their default (admission no / employee id).
export const resetPassword = (userId, newPassword) =>
  postApi('reset-password', { userId, newPassword })

// Internal messaging (action-based endpoint).
const messages = (action, payload) => postApi('messages', { action, ...(payload || {}) })
export const messagesApi = {
  directory: () => messages('directory'),
  conversations: () => messages('conversations'),
  thread: (otherId) => messages('thread', { otherId }),
  send: (receiverId, content, attachmentUrl) => messages('send', { receiverId, content, attachmentUrl }),
  markRead: (otherId) => messages('markRead', { otherId }),
}
