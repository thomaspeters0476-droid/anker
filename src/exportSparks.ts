import type { Spark } from './types'

function modeLabel(mode: Spark['mode']): string {
  if (mode === 'note') return 'Notiz'
  if (mode === 'draw') return 'Skizze'
  return 'Audio'
}

function stamp(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function fileBase(): string {
  return `anker-geistesblitze-${new Date().toISOString().slice(0, 10)}`
}

function wrapLines(
  doc: { splitTextToSize: (text: string, maxWidth: number) => string[] },
  text: string,
  maxWidth: number,
): string[] {
  return doc.splitTextToSize(text, maxWidth)
}

function audioExt(mime?: string): string {
  if (!mime) return 'webm'
  if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) {
    return 'm4a'
  }
  if (mime.includes('ogg')) return 'ogg'
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3'
  return 'webm'
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}

export function hasAudioSparks(sparks: Spark[]): boolean {
  return sparks.some((s) => Boolean(s.audioDataUrl))
}

export function sparksToText(sparks: Spark[]): string {
  const lines = [
    'Geistesblitze — Tagesanker',
    `Export: ${stamp(new Date().toISOString())}`,
    '',
  ]

  sparks.forEach((s, i) => {
    lines.push(`--- ${i + 1}. ${modeLabel(s.mode)} · ${stamp(s.createdAt)} ---`)
    if (s.text?.trim()) lines.push(s.text.trim())
    if (s.drawingDataUrl) lines.push('[Skizze — im PDF-Export enthalten]')
    if (s.audioDataUrl) lines.push('[Audio — separat als Audiodatei exportieren]')
    if (!s.text?.trim() && !s.drawingDataUrl && !s.audioDataUrl) {
      lines.push('(leer)')
    }
    lines.push('')
  })

  return lines.join('\n')
}

export function exportSparksText(sparks: Spark[]) {
  downloadBlob(
    `${fileBase()}.txt`,
    new Blob([sparksToText(sparks)], { type: 'text/plain;charset=utf-8' }),
  )
}

export async function exportSparksAudio(sparks: Spark[]) {
  const audioSparks = sparks.filter((s) => s.audioDataUrl)
  for (let i = 0; i < audioSparks.length; i++) {
    const s = audioSparks[i]
    if (!s.audioDataUrl) continue
    const blob = await dataUrlToBlob(s.audioDataUrl)
    const ext = audioExt(s.audioMimeType || blob.type)
    downloadBlob(`${fileBase()}-audio-${i + 1}.${ext}`, blob)
    // kurze Pause, damit Browser mehrere Downloads nicht blockt
    await new Promise((r) => setTimeout(r, 200))
  }
}

export async function exportSparksPdf(sparks: Spark[]) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 18
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const maxW = pageW - margin * 2
  let y = margin

  const ensureSpace = (need: number) => {
    if (y + need > pageH - margin) {
      doc.addPage()
      y = margin
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Geistesblitze', margin, y)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(80)
  doc.text(`Tagesanker · ${stamp(new Date().toISOString())}`, margin, y)
  doc.setTextColor(0)
  y += 10

  for (let i = 0; i < sparks.length; i++) {
    const s = sparks[i]
    ensureSpace(16)

    doc.setDrawColor(200)
    if (i > 0) {
      doc.line(margin, y, pageW - margin, y)
      y += 6
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(`${i + 1}. ${modeLabel(s.mode)} · ${stamp(s.createdAt)}`, margin, y)
    y += 7

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)

    if (s.text?.trim()) {
      const lines = wrapLines(doc, s.text.trim(), maxW)
      for (const line of lines) {
        ensureSpace(6)
        doc.text(line, margin, y)
        y += 5.5
      }
      y += 2
    }

    if (s.drawingDataUrl) {
      const props = doc.getImageProperties(s.drawingDataUrl)
      const imgH = (props.height * maxW) / props.width
      const drawH = Math.min(imgH, 80)
      const drawW = (props.width * drawH) / props.height
      ensureSpace(drawH + 6)
      doc.addImage(s.drawingDataUrl, 'PNG', margin, y, drawW, drawH)
      y += drawH + 6
    }

    if (s.audioDataUrl) {
      ensureSpace(8)
      doc.setTextColor(80)
      doc.text('[Sprachnotiz — als Audio-Datei exportiert/exportierbar]', margin, y)
      doc.setTextColor(0)
      y += 7
    }

    if (!s.text?.trim() && !s.drawingDataUrl && !s.audioDataUrl) {
      doc.setTextColor(120)
      doc.text('(leer)', margin, y)
      doc.setTextColor(0)
      y += 6
    }

    y += 4
  }

  doc.save(`${fileBase()}.pdf`)
}

export async function copySparksText(sparks: Spark[]): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(sparksToText(sparks))
    return true
  } catch {
    return false
  }
}
