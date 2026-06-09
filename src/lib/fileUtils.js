import { supabase } from './supabase.js'

// Build a safe, unique storage file name from an uploaded File.
// e.g. "My Photo (1).PNG" -> "1718000000000-a1b2c3-my-photo-1.png"
export function sanitiseFileName(file) {
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 8)
  const extension = (file.name.split('.').pop() || 'bin').toLowerCase()
  const baseName = file.name
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30)
  return `${timestamp}-${randomId}-${baseName || 'file'}.${extension}`
}

// Slugify a dynamic path SEGMENT (e.g. an event type or session name) so the
// storage key contains only URL-safe characters. This guarantees the public URL
// (which percent-encodes spaces) decodes back to the exact stored key, so later
// deletion via storagePathFromUrl() matches and succeeds.
export function slugSegment(str) {
  return (
    String(str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 40) || 'item'
  )
}

// Extract the storage object path from a Supabase public URL for a given bucket.
// Returns null for empty/malformed URLs (so callers can no-op safely).
// e.g. ".../object/public/gallery/sports-day/123-x-pic.png" -> "sports-day/123-x-pic.png"
export function storagePathFromUrl(url, bucket) {
  if (!url || typeof url !== 'string') return null
  const marker = `/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  const path = url.slice(idx + marker.length).split(/[?#]/)[0]
  return path || null
}

// Best-effort deletion of an existing storage object given its public URL.
// NEVER throws — a malformed URL or already-deleted file is a no-op. Used before
// replacing a file and when removing the owning record, to avoid orphaned blobs.
export async function deleteStorageFile(bucket, url) {
  try {
    const path = storagePathFromUrl(url, bucket)
    if (path) await supabase.storage.from(bucket).remove([path])
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to delete old storage file (ignored):', err)
  }
}
