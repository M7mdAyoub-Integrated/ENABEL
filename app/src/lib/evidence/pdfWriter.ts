/**
 * A PDF made of JPEG pages, written by hand.
 *
 * A scanned document is uploaded as "grayscale, 150 DPI, PDF" (the evidence
 * rule). The pages arrive here as JPEG bytes already rendered at that
 * density; this wraps them in the smallest valid PDF that carries them --
 * one image XObject per page with the DCTDecode filter, so the JPEG bytes
 * are embedded as they are and not re-encoded.
 *
 * Written by hand rather than with a PDF library because the library would
 * be a few hundred kilobytes in the bundle for the one feature the format
 * has that we need, and because a five-object PDF is small enough to read.
 * The structure below is PDF 1.4: header, objects numbered from 1, a cross-
 * reference table of byte offsets (which is why the writer counts bytes as
 * it goes), and a trailer. Readers are strict about the offsets, so they are
 * computed from the bytes actually written, never estimated.
 *
 * The page size is the image at 150 DPI, in points (72 per inch), so an A4
 * scan at 1240 x 1754 px becomes 595.2 x 841.9 pt -- an A4 page.
 *
 * The colour space is DeviceRGB even though every page is grey: a canvas
 * encodes JPEG with three components whatever the pixels are, and a reader
 * that trusts /DeviceGray over the JPEG's own component count renders a
 * three-component stream wrongly. Grey pixels in three channels cost almost
 * nothing extra -- the chroma planes are flat and compress to a few bytes.
 */
export type JpegPage = { jpeg: Uint8Array; width: number; height: number }

const DPI = 150

function ascii(s: string): Uint8Array {
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff
  return out
}

export function jpegPagesToPdf(pages: JpegPage[]): Uint8Array {
  if (pages.length === 0) throw new Error('a PDF needs at least one page')
  const parts: Uint8Array[] = []
  const offsets: number[] = []
  let length = 0
  const push = (b: Uint8Array) => {
    parts.push(b)
    length += b.length
  }
  const obj = (n: number, body: string, stream?: Uint8Array) => {
    offsets[n] = length
    push(ascii(`${n} 0 obj\n${body}\n`))
    if (stream) {
      push(ascii('stream\n'))
      push(stream)
      push(ascii('\nendstream\n'))
    }
    push(ascii('endobj\n'))
  }

  // Object numbering: 1 catalog, 2 pages, then per page: page, image, content.
  const pageObj = (i: number) => 3 + i * 3
  const imageObj = (i: number) => 4 + i * 3
  const contentObj = (i: number) => 5 + i * 3
  const total = 2 + pages.length * 3

  push(ascii('%PDF-1.4\n%âãÏÓ\n'))
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  obj(2, `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${pageObj(i)} 0 R`).join(' ')}] >>`)

  pages.forEach((p, i) => {
    const w = ((p.width * 72) / DPI).toFixed(2)
    const h = ((p.height * 72) / DPI).toFixed(2)
    obj(
      pageObj(i),
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im${i} ${imageObj(i)} 0 R >> >> /Contents ${contentObj(i)} 0 R >>`,
    )
    obj(
      imageObj(i),
      `<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>`,
      p.jpeg,
    )
    const content = ascii(`q ${w} 0 0 ${h} 0 0 cm /Im${i} Do Q`)
    obj(contentObj(i), `<< /Length ${content.length} >>`, content)
  })

  const xref = length
  let table = `xref\n0 ${total + 1}\n0000000000 65535 f \n`
  for (let n = 1; n <= total; n++) table += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`
  push(ascii(table))
  push(ascii(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`))

  const out = new Uint8Array(length)
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}
