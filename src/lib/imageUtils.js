import imageCompression from 'browser-image-compression'

// Per-context compression presets. Larger media (hero/gallery/about) targets
// ~1 MB at 1920px; profile photos are small (0.5 MB at 400px).
const OPTIONS = {
  default: { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true },
  profile: { maxSizeMB: 0.5, maxWidthOrHeight: 400, useWebWorker: true },
  gallery: { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true },
  website: { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true },
}

// Only JPG/PNG images are compressed; PDFs and other documents are left as-is.
export function isCompressible(file) {
  return Boolean(file && ['image/jpeg', 'image/png'].includes(file.type))
}

// Compress an image before upload. Non-images are returned unchanged, and any
// compression failure falls back to the original file (never blocks the upload).
export async function compressImage(file, type = 'default') {
  if (!isCompressible(file)) return file
  try {
    const compressed = await imageCompression(file, OPTIONS[type] || OPTIONS.default)
    return compressed
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Compression failed, using original:', error)
    return file
  }
}
