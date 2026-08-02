import type { DayState, Spark, Task } from '../types'
import type { DrawerItem, DrawerLevel, DrawerState } from '../drawer/types'
import {
  applySyncSnapshot,
  getSyncSnapshot,
  loadPrefs,
  todayKey,
  type CarryItem,
  type Prefs,
  type SyncSnapshot,
} from '../storage'

export const BACKUP_FORMAT = 'anker-backup-v1'
const FENCE = 'anker-backup-v1'

export type BackupPayload = {
  version: 1
  format: typeof BACKUP_FORMAT
  exportedAt: string
  day: DayState | null
  prefs: Prefs
  carry: CarryItem[]
  sparks: Spark[]
  drawer: DrawerState
}

function esc(s: string): string {
  return s.replace(/\r\n/g, '\n').trim()
}

function taskLine(task: Task): string {
  const mark =
    task.status === 'done' ? 'x' : task.status === 'skipped' ? '-' : ' '
  const kind = task.kind === 'life' ? 'Alltag' : 'Arbeit'
  const parent = task.parentTitle ? ` ← ${task.parentTitle}` : ''
  return `- [${mark}] ${esc(task.title)} (${kind}, ${task.size}, ${task.minutes} Min, ${task.status}${parent})`
}

function levelLabel(level: DrawerLevel): string {
  switch (level) {
    case 'inbox':
      return 'Eingang'
    case 'ready':
      return 'Bereit'
    case 'defer':
      return 'Aufschub'
    case 'frozen':
      return 'Eingefroren'
    case 'trash':
      return 'Papierkorb'
    default:
      return level
  }
}

function drawerLine(item: DrawerItem): string {
  const bits = [levelLabel(item.level)]
  if (item.isChunk) bits.push('Brocken')
  if (item.energy) bits.push(item.energy)
  if (item.deadline) bits.push(`Frist ${item.deadline}`)
  if (item.snoozeUntil) bits.push(`bis ${item.snoozeUntil}`)
  if (item.waitingOn) bits.push(`wartet: ${item.waitingOn}`)
  return `- ${esc(item.title)} (${bits.join(', ')})`
}

function sparkLine(spark: Spark): string {
  const when = spark.createdAt.slice(0, 16).replace('T', ' ')
  if (spark.mode === 'note' && spark.text) {
    return `- ${when} · Notiz: ${esc(spark.text)}`
  }
  if (spark.mode === 'draw') return `- ${when} · Zeichnung (im Datenblock)`
  if (spark.mode === 'audio') return `- ${when} · Audio (im Datenblock)`
  return `- ${when} · Geistesblitz`
}

/** Erzeugt eine lesbare .md-Datei inkl. maschinenlesbarem Datenblock. */
export function buildMarkdownBackup(snap: SyncSnapshot = getSyncSnapshot()): string {
  const payload: BackupPayload = {
    version: 1,
    format: BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    day: snap.day,
    prefs: snap.prefs,
    carry: snap.carry,
    sparks: snap.sparks,
    drawer: snap.drawer,
  }

  const day = snap.day
  const lines: string[] = [
    '# Tagesanker / Schublade — Backup',
    '',
    `Exportiert: ${payload.exportedAt}`,
    '',
    '> Diese Datei kannst du wieder importieren. Den Block am Ende nicht löschen.',
    '',
    '## Tag',
    '',
  ]

  if (!day) {
    lines.push('_Kein Tagesstand gespeichert._', '')
  } else {
    lines.push(`Datum: ${day.date}`, `Gestartet: ${day.started ? 'ja' : 'nein'}`, '')
    if (day.tasks.length === 0) lines.push('_Keine Aufgaben._', '')
    else {
      lines.push('### Aufgaben', '')
      for (const t of day.tasks) lines.push(taskLine(t))
      lines.push('')
    }
    if (day.priorRoundDone?.length) {
      lines.push('### Frühere Runden (erledigt)', '')
      for (const t of day.priorRoundDone) lines.push(taskLine(t))
      lines.push('')
    }
  }

  if (snap.carry.length) {
    lines.push('## Mitgenommen (Carry)', '')
    for (const c of snap.carry) {
      lines.push(
        `- ${esc(c.title)} (${c.kind}, ${c.size}, ${c.minutes} Min${c.parentTitle ? ` ← ${c.parentTitle}` : ''})`,
      )
    }
    lines.push('')
  }

  lines.push('## Schublade', '')
  if (!snap.drawer.items.length) {
    lines.push('_Schublade leer._', '')
  } else {
    const byLevel: DrawerLevel[] = [
      'inbox',
      'ready',
      'defer',
      'frozen',
      'trash',
    ]
    for (const level of byLevel) {
      const items = snap.drawer.items.filter((i) => i.level === level)
      if (!items.length) continue
      lines.push(`### ${levelLabel(level)}`, '')
      for (const item of items) lines.push(drawerLine(item))
      lines.push('')
    }
  }

  const textSparks = snap.sparks.filter(
    (s) => s.mode === 'note' || s.text || s.mode === 'draw' || s.mode === 'audio',
  )
  lines.push('## Geistesblitze', '')
  if (!textSparks.length) {
    lines.push('_Keine Geistesblitze._', '')
  } else {
    for (const s of textSparks) lines.push(sparkLine(s))
    lines.push('')
  }

  lines.push(
    '## Einstellungen (Kurz)',
    '',
    `- Sync-Sprache: ${snap.prefs.locale}`,
    `- Schublade aktiv: ${snap.prefs.drawerEnabled ? 'ja' : 'nein'}`,
    `- KI-Häppchen: ${snap.prefs.drawerAiChopOptIn ? 'an' : 'aus'}`,
    '',
    '## Daten (nicht bearbeiten)',
    '',
    '```' + FENCE,
    JSON.stringify(payload),
    '```',
    '',
  )

  return lines.join('\n')
}

export function downloadMarkdownBackup() {
  const md = buildMarkdownBackup()
  const stamp = new Date().toISOString().slice(0, 10)
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tagesanker-backup-${stamp}.md`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function extractPayload(md: string): BackupPayload | null {
  const re = new RegExp(
    '```' + FENCE + '\\s*\\n([\\s\\S]*?)\\n```',
    'i',
  )
  const m = re.exec(md)
  if (!m?.[1]) return null
  try {
    const data = JSON.parse(m[1].trim()) as BackupPayload
    if (data?.version !== 1 || data.format !== BACKUP_FORMAT) return null
    if (!data.prefs || !Array.isArray(data.sparks) || !data.drawer) return null
    return data
  } catch {
    return null
  }
}

function normalizeImportedDay(day: DayState | null): DayState | null {
  if (!day) return null
  return {
    ...day,
    date: todayKey(),
    tasks: Array.isArray(day.tasks) ? day.tasks : [],
    sparks: Array.isArray(day.sparks) ? day.sparks : [],
    priorRoundDone: Array.isArray(day.priorRoundDone) ? day.priorRoundDone : [],
  }
}

/** Importiert Backup; ersetzt lokale App-Daten (Tag, Schublade, Geistesblitze, Prefs). */
export function importMarkdownBackup(md: string): {
  ok: true
  counts: { tasks: number; drawer: number; sparks: number }
} | { ok: false; error: 'invalid' | 'empty' } {
  const payload = extractPayload(md)
  if (!payload) return { ok: false, error: 'invalid' }

  const day = normalizeImportedDay(payload.day)
  const drawer: DrawerState = {
    items: Array.isArray(payload.drawer?.items) ? payload.drawer.items : [],
    readyCapLatched: Boolean(payload.drawer?.readyCapLatched),
  }
  const sparks = Array.isArray(payload.sparks) ? payload.sparks : []
  const carry = Array.isArray(payload.carry) ? payload.carry : []
  const current = loadPrefs()
  const prefs: Prefs = {
    ...current,
    ...payload.prefs,
    drawerEnabled:
      Boolean(payload.prefs.drawerEnabled) || drawer.items.length > 0,
  }

  if (
    !day &&
    drawer.items.length === 0 &&
    sparks.length === 0 &&
    carry.length === 0
  ) {
    return { ok: false, error: 'empty' }
  }

  const snap: SyncSnapshot = {
    updatedAt: new Date().toISOString(),
    day,
    prefs,
    carry,
    sparks,
    drawer,
  }
  applySyncSnapshot(snap)

  return {
    ok: true,
    counts: {
      tasks: day?.tasks.length ?? 0,
      drawer: drawer.items.length,
      sparks: sparks.length,
    },
  }
}

export async function importMarkdownBackupFile(
  file: File,
): Promise<ReturnType<typeof importMarkdownBackup>> {
  const text = await file.text()
  return importMarkdownBackup(text)
}
