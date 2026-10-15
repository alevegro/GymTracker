import type { LogEntry, Measure, SetEntry } from './types'

// ---------- Date (sempre in ora locale, formato YYYY-MM-DD) ----------

export function toISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function fromISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

export const todayISO = () => toISO(new Date())

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]
export const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

const longFmt = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
const shortFmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' })
const shortYearFmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: '2-digit' })

export function formatDateLong(iso: string): string {
  const s = longFmt.format(fromISO(iso))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function formatDateShort(iso: string, withYear = false): string {
  return (withYear ? shortYearFmt : shortFmt).format(fromISO(iso))
}

export function relativeDay(iso: string): string | null {
  const t = todayISO()
  if (iso === t) return 'Oggi'
  if (iso === addDays(t, -1)) return 'Ieri'
  if (iso === addDays(t, 1)) return 'Domani'
  return null
}

// ---------- Numeri e formati ----------

export function parseNum(s: string | undefined): number | undefined {
  if (s == null) return undefined
  const t = s.trim().replace(',', '.')
  if (t === '') return undefined
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

const numFmt = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 })
export const fmtNum = (n: number) => numFmt.format(n)

export function formatDuration(sec: number): string {
  const s = Math.round(sec)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m >= 60) {
    const h = Math.floor(m / 60)
    const mm = m % 60
    return mm ? `${h}h ${mm}min` : `${h}h`
  }
  return r ? `${m}:${String(r).padStart(2, '0')}` : `${m}min`
}

export function formatWeight(w: number): string {
  return `${fmtNum(w)} kg`
}

export function setValue(set: SetEntry, measure: Measure): string {
  return measure === 'time' ? formatDuration(set.seconds ?? 0) : String(set.reps ?? 0)
}

/** Riassunto compatto delle serie: "3 × 10 · 60 kg" se uguali, altrimenti "10×60 · 8×65 kg". */
export function summarizeSets(sets: SetEntry[], measure: Measure): string {
  if (!sets.length) return 'Nessuna serie'
  const same = sets.every(
    (s) => s.weight === sets[0].weight && s.reps === sets[0].reps && s.seconds === sets[0].seconds,
  )
  if (same) {
    const base = `${sets.length} × ${setValue(sets[0], measure)}`
    return sets[0].weight ? `${base} · ${formatWeight(sets[0].weight)}` : base
  }
  const anyWeight = sets.some((s) => s.weight)
  const allSameWeight = sets.every((s) => s.weight === sets[0].weight)
  if (!anyWeight || allSameWeight) {
    const vals = sets.map((s) => setValue(s, measure)).join(' · ')
    return anyWeight ? `${vals} · ${formatWeight(sets[0].weight)}` : vals
  }
  return sets.map((s) => `${setValue(s, measure)}×${fmtNum(s.weight)}`).join(' · ') + ' kg'
}

// ---------- Statistiche ----------

/** 1RM stimato (Epley), significativo solo fino a ~12 ripetizioni. */
export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0 || reps > 12) return 0
  return reps === 1 ? weight : weight * (1 + reps / 30)
}

export interface EntryStats {
  maxWeight: number
  best1RM: number
  volume: number
  totalReps: number
  maxReps: number
  maxSeconds: number
  totalSeconds: number
}

export function entryStats(e: LogEntry): EntryStats {
  const st: EntryStats = { maxWeight: 0, best1RM: 0, volume: 0, totalReps: 0, maxReps: 0, maxSeconds: 0, totalSeconds: 0 }
  for (const s of e.sets) {
    const w = s.weight || 0
    st.maxWeight = Math.max(st.maxWeight, w)
    if (e.measure === 'time') {
      const sec = s.seconds ?? 0
      st.maxSeconds = Math.max(st.maxSeconds, sec)
      st.totalSeconds += sec
    } else {
      const r = s.reps ?? 0
      st.maxReps = Math.max(st.maxReps, r)
      st.totalReps += r
      st.volume += r * w
      st.best1RM = Math.max(st.best1RM, estimate1RM(w, r))
    }
  }
  return st
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}
