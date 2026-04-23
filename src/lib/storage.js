function getFileExtension(fileName) {
  const parts = fileName.split('.')
  return parts.length > 1 ? parts.pop().toLowerCase() : 'bin'
}

function getRandomToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
])

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
const COMPRESSED_IMAGE_MIME_TYPE = 'image/webp'
const IMAGE_COMPRESSION_QUALITY = 0.82
const MAX_IMAGE_DIMENSION = 1600
const MIN_COMPRESSIBLE_IMAGE_SIZE_BYTES = 160 * 1024

function hasCanvasSupport() {
  return typeof document !== 'undefined' && typeof document.createElement === 'function'
}

function buildFileFromBlob(blob, fileName) {
  try {
    return new File([blob], fileName, { type: blob.type, lastModified: Date.now() })
  } catch {
    blob.name = fileName
    return blob
  }
}

function getNormalizedUploadName(originalName, mimeType) {
  const baseName = originalName?.replace(/\.[^.]+$/, '') || 'image'
  const extension = mimeType === 'image/webp' ? 'webp' : getFileExtension(originalName || 'image')

  return `${baseName}.${extension}`
}

async function readImageDimensions(file) {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file)
    return {
      width: bitmap.width,
      height: bitmap.height,
      close() {
        if (typeof bitmap.close === 'function') {
          bitmap.close()
        }
      },
      draw(ctx, width, height) {
        ctx.drawImage(bitmap, 0, 0, width, height)
      },
    }
  }

  return new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)

    image.onload = () => {
      resolve({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
        close() {
          URL.revokeObjectURL(objectUrl)
        },
        draw(ctx, width, height) {
          ctx.drawImage(image, 0, 0, width, height)
        },
      })
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Image could not be decoded.'))
    }

    image.src = objectUrl
  })
}

async function toBlobAsync(canvas, mimeType, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality)
  })
}

async function compressImageFile(file) {
  if (!file || file.type === 'image/gif') {
    return {
      file,
      metadata: {
        compressed: false,
        originalSizeBytes: file?.size ?? null,
        compressedSizeBytes: file?.size ?? null,
      },
    }
  }

  if (file.size < MIN_COMPRESSIBLE_IMAGE_SIZE_BYTES) {
    return {
      file,
      metadata: {
        compressed: false,
        originalSizeBytes: file.size,
        compressedSizeBytes: file.size,
      },
    }
  }

  if (!hasCanvasSupport()) {
    return {
      file,
      metadata: {
        compressed: false,
        originalSizeBytes: file.size,
        compressedSizeBytes: file.size,
      },
    }
  }

  const image = await readImageDimensions(file)

  try {
    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / Math.max(image.width || 1, image.height || 1)
    )
    const width = Math.max(1, Math.round((image.width || 1) * scale))
    const height = Math.max(1, Math.round((image.height || 1) * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d', { alpha: true })
    if (!context) {
      return {
        file,
        metadata: {
          compressed: false,
          originalSizeBytes: file.size,
          compressedSizeBytes: file.size,
        },
      }
    }

    context.drawImage(image, 0, 0, width, height)

    const compressedBlob = await toBlobAsync(canvas, COMPRESSED_IMAGE_MIME_TYPE, IMAGE_COMPRESSION_QUALITY)

    if (!compressedBlob || compressedBlob.size >= file.size) {
      return {
        file,
        metadata: {
          compressed: false,
          originalSizeBytes: file.size,
          compressedSizeBytes: file.size,
        },
      }
    }

    const compressedFile = buildFileFromBlob(
      compressedBlob,
      getNormalizedUploadName(file.name, COMPRESSED_IMAGE_MIME_TYPE)
    )

    return {
      file: compressedFile,
      metadata: {
        compressed: true,
        originalSizeBytes: file.size,
        compressedSizeBytes: compressedBlob.size,
        originalDimensions: {
          width: image.width || null,
          height: image.height || null,
        },
        compressedDimensions: {
          width,
          height,
        },
      },
    }
  } finally {
    image.close()
  }
}

export function getStorageMetadata(file, sourceFile = file, compression = null) {
  return {
    mimeType: file?.type || null,
    sizeBytes: file?.size ?? null,
    originalName: sourceFile?.name || null,
    originalSizeBytes: sourceFile?.size ?? null,
    compressed: compression?.compressed ?? false,
    compressedSizeBytes:
      compression?.compressedSizeBytes ?? file?.size ?? sourceFile?.size ?? null,
  }
}

export function buildStorageObjectPath({ bucket, userId, file, folder }) {
  const extension = getFileExtension(file?.name || 'file.bin')
  const safeUserId = userId || 'anonymous'
  const token = getRandomToken()
  const prefix = folder ? `${folder}/` : ''

  return `${prefix}${safeUserId}/${bucket}/${token}.${extension}`
}

export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'Dosya secilemedi.' }
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
    return {
      valid: false,
      error: 'Sadece JPG, PNG, WEBP, GIF veya AVIF gorseller yuklenebilir.',
    }
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Gorsel boyutu en fazla 10 MB olmalidir.',
    }
  }

  return { valid: true, error: null }
}

export function getStorageErrorMessage(error, { bucket } = {}) {
  const status = error?.status ?? error?.statusCode ?? error?.status_code
  const code = error?.code?.toString?.() ?? ''
  const rawMessage = error?.message?.toLowerCase?.() ?? ''

  if (status === 401 || status === 403 || code === '42501') {
    return 'Yukleme yetkisi yok. Storage bucket politikalarini kontrol edin.'
  }

  if (status === 404 || rawMessage.includes('bucket not found')) {
    return bucket
      ? `"${bucket}" bucketi bulunamadi. Supabase Storage'da bucket olusturun.`
      : 'Storage bucket bulunamadi.'
  }

  if (rawMessage.includes('mime type') || rawMessage.includes('invalid file type')) {
    return 'Gorsel turu desteklenmiyor.'
  }

  return error?.message || 'Gorsel yuklenemedi.'
}

export async function uploadStorageImage({
  client,
  bucket,
  file,
  userId,
  folder,
  upsert = false,
}) {
  const validation = validateImageFile(file)
  if (!validation.valid) {
    return { data: null, error: new Error(validation.error) }
  }

  const originalFile = file
  let uploadFile = file
  let compression = null

  try {
    const compressionResult = await compressImageFile(file)
    uploadFile = compressionResult.file || file
    compression = compressionResult.metadata
  } catch (compressionError) {
    console.warn('Image compression failed, uploading original file.', compressionError)
    uploadFile = file
  }

  const path = buildStorageObjectPath({ bucket, userId, file: uploadFile, folder })
  const metadata = getStorageMetadata(uploadFile, originalFile, compression)

  if (!client?.storage) {
    return { data: null, error: new Error('Storage client not available') }
  }

  const { error: uploadError } = await client.storage.from(bucket).upload(path, uploadFile, {
    contentType: uploadFile?.type || metadata.mimeType || undefined,
    upsert,
  })

  if (uploadError) {
    console.error('Storage upload failed', {
      bucket,
      path,
      fileName: metadata.originalName,
      fileSize: metadata.sizeBytes,
      compressed: metadata.compressed,
      error: uploadError,
    })
    return { data: null, error: uploadError }
  }

  const {
    data: { publicUrl },
  } = client.storage.from(bucket).getPublicUrl(path)

  return {
    data: {
      bucket,
      path,
      publicUrl,
      metadata,
    },
    error: null,
  }
}
