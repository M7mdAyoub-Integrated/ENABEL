import { jpegPagesToPdf, type JpegPage } from './pdfWriter'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Evidence is compressed in the browser before a byte leaves it.
 *
 *  Mandatory, not an optimisation: the store is 10 GB with a payment method
 *  behind it, which is roughly 50 000 compressed files or 3 000 uncompressed
 *  ones, and sixteen of Ramtha's seventeen forms require evidence. The rule,
 *  from the brief:
 *
 *    photograph        resized to 1600 px on the long edge, JPEG quality 75
 *    scanned document  grayscale, 150 DPI, PDF
 *    anything still over 1 MB after that is refused, and told why
 *
 *  What arrives here is a File and the kind the user chose; what leaves is
 *  the bytes to upload, their name and type, and the size they started at
 *  (kept on the row as original_size_bytes, so the settings screen can say
 *  what the compression is worth).
 *
 *  A refusal is an EvidenceRefusal with a `result` the screen has words for.
 *  The limits themselves come from the database (evidence_usage) so this
 *  file never carries its own copy of a number the database enforces.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type EvidenceKind = 'photo' | 'document' | 'other'

export type PreparedEvidence = {
  blob: Blob
  fileName: string
  mimeType: string
  originalSize: number
  kind: EvidenceKind
}

export type EvidenceRefusalResult = 'too_large' | 'unsupported_type' | 'unreadable'

export class EvidenceRefusal extends Error {
  readonly result: EvidenceRefusalResult
  readonly values: Record<string, string | number>
  constructor(result: EvidenceRefusalResult, values: Record<string, string | number> = {}) {
    super(result)
    this.result = result
    this.values = values
  }
}

const PHOTO_LONG_EDGE = 1600
const JPEG_QUALITY = 0.75
/** A4 at 150 DPI, the long edge. A scan is scaled to fit inside this. */
const DOCUMENT_LONG_EDGE = 1754
const DOCUMENT_SHORT_EDGE = 1240
const RASTER_DPI = 150

/** The kind a file most likely is, for the control's default. The user can change it. */
export function guessKind(file: File): EvidenceKind {
  if (file.type.startsWith('image/')) return 'photo'
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return 'document'
  return 'other'
}

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '') || 'evidence'
}

async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    // `from-image` honours EXIF orientation, so a phone photograph taken
    // upright stays upright after the canvas round trip.
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new EvidenceRefusal('unreadable', { name: file.name })
  }
}

function fit(w: number, h: number, longEdge: number, shortEdge?: number): { w: number; h: number } {
  const landscape = w >= h
  const maxLong = longEdge
  const maxShort = shortEdge ?? longEdge
  const scale = Math.min(1, maxLong / (landscape ? w : h), maxShort / (landscape ? h : w))
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) }
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new EvidenceRefusal('unreadable'))), 'image/jpeg', JPEG_QUALITY)
  })
}

/** Draws a bitmap onto a fresh canvas at the given size, grey if asked. */
function draw(img: ImageBitmap | HTMLCanvasElement, w: number, h: number, grey: boolean): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new EvidenceRefusal('unreadable')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  if (grey) {
    // Done on the pixels rather than with the `filter` property, which
    // Safari on iOS does not apply to drawImage.
    const data = ctx.getImageData(0, 0, w, h)
    const px = data.data
    for (let i = 0; i < px.length; i += 4) {
      const y = Math.round(0.299 * px[i]! + 0.587 * px[i + 1]! + 0.114 * px[i + 2]!)
      px[i] = y
      px[i + 1] = y
      px[i + 2] = y
    }
    ctx.putImageData(data, 0, 0)
  }
  return canvas
}

async function photograph(file: File): Promise<PreparedEvidence> {
  const img = await decodeImage(file)
  const { w, h } = fit(img.width, img.height, PHOTO_LONG_EDGE)
  const blob = await toJpeg(draw(img, w, h, false))
  img.close()
  return { blob, fileName: `${baseName(file.name)}.jpg`, mimeType: 'image/jpeg', originalSize: file.size, kind: 'photo' }
}

async function scannedImage(file: File): Promise<PreparedEvidence> {
  const img = await decodeImage(file)
  const { w, h } = fit(img.width, img.height, DOCUMENT_LONG_EDGE, DOCUMENT_SHORT_EDGE)
  const jpeg = new Uint8Array(await (await toJpeg(draw(img, w, h, true))).arrayBuffer())
  img.close()
  const pdf = jpegPagesToPdf([{ jpeg, width: w, height: h }])
  return {
    blob: new Blob([pdf as BlobPart], { type: 'application/pdf' }),
    fileName: `${baseName(file.name)}.pdf`,
    mimeType: 'application/pdf',
    originalSize: file.size,
    kind: 'document',
  }
}

/**
 * A PDF over the limit is re-rasterised page by page at 150 DPI in grey and
 * rebuilt. pdf.js is loaded only here, on demand: it is several hundred
 * kilobytes and most uploads never need it.
 */
async function rasterisePdf(file: File): Promise<PreparedEvidence> {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  let doc
  try {
    doc = await task.promise
  } catch {
    throw new EvidenceRefusal('unreadable', { name: file.name })
  }
  const pages: JpegPage[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    const viewport = page.getViewport({ scale: RASTER_DPI / 72 })
    const w = Math.round(viewport.width)
    const h = Math.round(viewport.height)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new EvidenceRefusal('unreadable')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, w, h)
    // `print`: pdf.js paces a display render with requestAnimationFrame, which
    // a background tab does not fire -- a user who switches apps mid-upload
    // would wait forever. A print render is paced with timers and is the
    // intent for rasterising to a file anyway.
    await page.render({ canvasContext: ctx, viewport, canvas, intent: 'print' }).promise
    const grey = draw(canvas, w, h, true)
    pages.push({ jpeg: new Uint8Array(await (await toJpeg(grey)).arrayBuffer()), width: w, height: h })
    page.cleanup()
  }
  await task.destroy()
  const pdf = jpegPagesToPdf(pages)
  return {
    blob: new Blob([pdf as BlobPart], { type: 'application/pdf' }),
    fileName: `${baseName(file.name)}.pdf`,
    mimeType: 'application/pdf',
    originalSize: file.size,
    kind: 'document',
  }
}

/**
 * The file as it will be uploaded, or an EvidenceRefusal.
 *
 * `limitBytes` is the per-file limit the database reports (1 MB today). A
 * result over it after compression is refused here, before any upload; the
 * database's check constraint refuses it again if anything gets past this.
 */
export async function prepareEvidence(file: File, kind: EvidenceKind, limitBytes: number): Promise<PreparedEvidence> {
  let out: PreparedEvidence
  if (kind === 'photo') {
    if (!file.type.startsWith('image/')) throw new EvidenceRefusal('unsupported_type', { type: file.type || file.name })
    out = await photograph(file)
  } else if (kind === 'document') {
    if (file.type.startsWith('image/')) out = await scannedImage(file)
    else if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
      // A PDF already within the limit is sent as it is: re-rasterising a
      // small text PDF would make it larger and worse.
      out = file.size <= limitBytes
        ? { blob: file, fileName: file.name, mimeType: 'application/pdf', originalSize: file.size, kind: 'document' }
        : await rasterisePdf(file)
    } else throw new EvidenceRefusal('unsupported_type', { type: file.type || file.name })
  } else {
    // Anything else goes as it is: there is nothing to compress it with, so
    // the limit is the limit.
    out = { blob: file, fileName: file.name, mimeType: file.type || 'application/octet-stream', originalSize: file.size, kind: 'other' }
  }
  if (out.blob.size > limitBytes) {
    throw new EvidenceRefusal('too_large', {
      name: file.name,
      original: file.size,
      compressed: out.blob.size,
      limit: limitBytes,
    })
  }
  return out
}
