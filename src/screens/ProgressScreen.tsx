import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Icon } from '../components/Icon'
import { LineChart, type Point } from '../components/LineChart'
import { LogEditor } from '../components/LogEditor'
import { db } from '../db'
import type { ExerciseLookup } from '../hooks'
import type { LogEntry, Measure } from '../types'
import {
  addDays,
  entryStats,
  fmtNum,
  formatDateShort,
  formatDuration,
  fromISO,
  normalize,
  summarizeSets,
  toISO,
  todayISO,
  type EntryStats,
} from '../utils'

type MetricKey = keyof EntryStats

const kg = (v: number) => `${fmtNum(Math.round(v * 10) / 10)} kg`
const compactKg = (v: number) => (v >= 10000 ? `${fmtNum(Math.round(v / 100) / 10)}K kg` : `${fmtNum(Math.round(v))} kg`)

const METRICS: Record<MetricKey, { label: string; fmt: (v: number) => string; axis: (v: number) => string }> = {
  maxWeight: { label: 'Carico max', fmt: kg, axis: (v) => fmtNum(v) },
  best1RM: { label: '1RM stimato', fmt: kg, axis: (v) => fmtNum(Math.round(v)) },
  volume: { label: 'Volume', fmt: compactKg, axis: (v) => (v >= 1000 ? `${fmtNum(v / 1000)}K` : fmtNum(v)) },
  maxReps: { label: 'Rip. max (serie)', fmt: (v) => `${v} rip`, axis: (v) => fmtNum(v) },
  totalReps: { label: 'Rip. totali', fmt: (v) => `${v} rip`, axis: (v) => fmtNum(v) },
  maxSeconds: { label: 'Tempo max', fmt: formatDuration, axis: formatDuration },
  totalSeconds: { label: 'Tempo totale', fmt: formatDuration, axis: formatDuration },
}

const RANGES = [
  ['1M', 30],
  ['3M', 91],
  ['6M', 182],
  ['1A', 365],
  ['Tutto', 0],
] as const

function metricsFor(measure: Measure, hasWeight: boolean): MetricKey[] {
  if (measure === 'time') return hasWeight ? ['maxSeconds', 'totalSeconds', 'maxWeight'] : ['maxSeconds', 'totalSeconds']
  return hasWeight ? ['maxWeight', 'best1RM', 'volume', 'maxReps', 'totalReps'] : ['maxReps', 'totalReps']
}

function mondayOf(iso: string): string {
  const d = fromISO(iso)
  return addDays(iso, -((d.getDay() + 6) % 7))
}

export function ProgressScreen({ lookup }: { lookup: ExerciseLookup }) {
  const logs = useLiveQuery(() => db.logs.filter((l) => !l.pending).toArray(), [], [] as LogEntry[])
  const [openId, setOpenId] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const byExercise = useMemo(() => {
    const m = new Map<string, LogEntry[]>()
    for (const l of logs) {
      if (!m.has(l.exerciseId)) m.set(l.exerciseId, [])
      m.get(l.exerciseId)!.push(l)
    }
    for (const list of m.values()) list.sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1))
    return m
  }, [logs])

  const overview = useMemo(() => {
    const t = todayISO()
    const week = mondayOf(t)
    const month = t.slice(0, 7)
    const days = new Set(logs.map((l) => l.date))
    let w = 0
    let mo = 0
    for (const d of days) {
      if (d >= week && d <= t) w++
      if (d.startsWith(month)) mo++
    }
    return { week: w, month: mo, total: days.size }
  }, [logs])

  if (openId) {
    return <ExerciseProgress lookup={lookup} exerciseId={openId} entries={byExercise.get(openId) ?? []} onBack={() => setOpenId(null)} />
  }

  const nq = normalize(q.trim())
  const rows = [...byExercise.entries()]
    .map(([id, list]) => ({ ex: lookup.get(id), list, last: list[list.length - 1] }))
    .filter((r) => !nq || normalize(r.ex.name).includes(nq))
    .sort((a, b) => (a.last.date < b.last.date ? 1 : a.last.date > b.last.date ? -1 : 0))

  return (
    <div className="screen">
      <div className="title-row">
        <h1 className="large-title">Progressi</h1>
      </div>

      <div className="tiles three">
        <div className="tile">
          <div className="label">Settimana</div>
          <div className="value">{overview.week}</div>
          <div className="foot">allenamenti</div>
        </div>
        <div className="tile">
          <div className="label">Mese</div>
          <div className="value">{overview.month}</div>
          <div className="foot">allenamenti</div>
        </div>
        <div className="tile">
          <div className="label">Totale</div>
          <div className="value">{overview.total}</div>
          <div className="foot">giorni</div>
        </div>
      </div>

      {byExercise.size > 0 && (
        <div className="search" style={{ marginTop: 16 }}>
          <Icon name="search" />
          <input className="input" type="search" placeholder="Cerca esercizio" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}

      <div className="section-title">Esercizi</div>
      {!byExercise.size ? (
        <div className="card empty">
          <strong>Ancora nessun dato</strong>
          Registra i tuoi allenamenti nel diario: qui vedrai record e grafici esercizio per esercizio.
        </div>
      ) : (
        <div className="list">
          {rows.map(({ ex, list, last }) => (
            <button key={ex.id} className="list-item" onClick={() => setOpenId(ex.id)}>
              <div className="main">
                <div className="name">{ex.name}</div>
                <div className="sub">
                  {list.length} {list.length === 1 ? 'sessione' : 'sessioni'} · ultima {formatDateShort(last.date)}
                </div>
              </div>
              <span className="tag">{bestLabel(list)}</span>
              <Icon name="chevronRight" className="chev" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function bestLabel(list: LogEntry[]): string {
  let w = 0
  let r = 0
  let s = 0
  for (const l of list) {
    const st = entryStats(l)
    w = Math.max(w, st.maxWeight)
    r = Math.max(r, st.maxReps)
    s = Math.max(s, st.maxSeconds)
  }
  if (w > 0) return kg(w)
  if (s > 0 && s >= r) return formatDuration(s)
  return `${r} rip`
}

function ExerciseProgress({
  lookup,
  exerciseId,
  entries,
  onBack,
}: {
  lookup: ExerciseLookup
  exerciseId: string
  entries: LogEntry[]
  onBack: () => void
}) {
  const ex = lookup.get(exerciseId)
  const [range, setRange] = useState<number>(0)
  const [editing, setEditing] = useState<LogEntry | null>(null)

  // Misura prevalente: il grafico confronta solo sessioni omogenee.
  const measure: Measure = useMemo(() => {
    const t = entries.filter((e) => e.measure === 'time').length
    return t > entries.length / 2 ? 'time' : 'reps'
  }, [entries])
  const same = entries.filter((e) => e.measure === measure)
  const hasWeight = same.some((e) => e.sets.some((s) => s.weight > 0))
  const metrics = metricsFor(measure, hasWeight)
  const [metric, setMetric] = useState<MetricKey>(metrics[0])
  const m = metrics.includes(metric) ? metric : metrics[0]
  const meta = METRICS[m]

  // Un punto per giorno (se nello stesso giorno ci sono più voci, si uniscono le serie).
  const perDay = useMemo(() => {
    const map = new Map<string, LogEntry>()
    for (const e of same) {
      const prev = map.get(e.date)
      map.set(e.date, prev ? { ...prev, sets: [...prev.sets, ...e.sets] } : e)
    }
    return [...map.values()].map((e) => ({ date: e.date, stats: entryStats(e) }))
  }, [same])

  const cutoff = range ? toISO(new Date(Date.now() - range * 86400000)) : ''
  const points: Point[] = perDay
    .filter((d) => d.date >= cutoff)
    .map((d) => ({ date: d.date, value: d.stats[m] }))
    .filter((p) => p.value > 0)

  const records = useMemo(() => {
    const best = (k: MetricKey) => {
      let v = 0
      let date = ''
      for (const d of perDay)
        if (d.stats[k] > v) {
          v = d.stats[k]
          date = d.date
        }
      return { v, date }
    }
    return Object.fromEntries(metrics.map((k) => [k, best(k)])) as Record<MetricKey, { v: number; date: string }>
  }, [perDay, metrics.join()])

  const delta = points.length >= 2 ? points[points.length - 1].value - points[0].value : null

  // Storico con evidenza dei record (rispetto alle sessioni precedenti).
  const primary = metrics[0]
  const history = useMemo(() => {
    let running = 0
    const withPR = entries.map((e) => {
      const v = e.measure === measure ? entryStats(e)[primary] : 0
      const pr = v > 0 && v > running && running > 0
      running = Math.max(running, v)
      return { e, pr }
    })
    return withPR.reverse()
  }, [entries, measure, primary])

  return (
    <div className="screen">
      <div className="title-row" style={{ margin: '0 -4px' }}>
        <button className="link row" style={{ gap: 2 }} onClick={onBack}>
          <Icon name="chevronLeft" className="chev" /> Progressi
        </button>
      </div>
      <h1 className="large-title" style={{ fontSize: 28 }}>
        {ex.name}
      </h1>
      <div className="row" style={{ margin: '8px 0 16px' }}>
        <span className="tag">{ex.muscle}</span>
        <span className="tag">
          {entries.length} {entries.length === 1 ? 'sessione' : 'sessioni'}
        </span>
      </div>

      <div className="tiles">
        {metrics.slice(0, 4).map((k) => (
          <div key={k} className="tile">
            <div className="label">{k === primary ? 'Record · ' : ''}{METRICS[k].label}</div>
            <div className="value">{records[k].v ? METRICS[k].fmt(records[k].v) : '–'}</div>
            <div className="foot">{records[k].date ? formatDateShort(records[k].date, true) : ''}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="chips" style={{ margin: '0 -14px', paddingInline: 14 }}>
          {metrics.map((k) => (
            <button key={k} className={`chip ${k === m ? 'active' : ''}`} onClick={() => setMetric(k)}>
              {METRICS[k].label}
            </button>
          ))}
        </div>
        <div className="row" style={{ margin: '14px 0 22px' }}>
          <div style={{ flex: 1 }}>
            <div className="small muted">{meta.label}</div>
            {delta != null && (
              <div style={{ fontWeight: 700, color: delta > 0 ? 'var(--good)' : delta < 0 ? 'var(--danger)' : 'var(--text-2)' }}>
                {delta > 0 ? '▲ +' : delta < 0 ? '▼ −' : ''}
                {meta.fmt(Math.abs(delta))}
                <span className="muted small" style={{ fontWeight: 500 }}>
                  {' '}dal {formatDateShort(points[0].date, true)}
                </span>
              </div>
            )}
          </div>
        </div>
        {points.length ? (
          <LineChart points={points} format={meta.axis} formatValue={meta.fmt} />
        ) : (
          <div className="empty small">Nessun dato in questo periodo</div>
        )}
        <div className="segmented" style={{ marginTop: 12 }}>
          {RANGES.map(([label, days]) => (
            <button key={label} className={range === days ? 'active' : ''} onClick={() => setRange(days)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {m === 'best1RM' && (
        <div className="small muted" style={{ margin: '8px 4px' }}>
          Stima del massimale con la formula di Epley, calcolata sulle serie fino a 12 ripetizioni.
        </div>
      )}

      <div className="section-title">Storico</div>
      <div className="list">
        {history.map(({ e, pr }) => (
          <button key={e.id} className="list-item" onClick={() => setEditing(e)}>
            <div className="main">
              <div className="name row" style={{ gap: 8 }}>
                {formatDateShort(e.date, true)}
                {pr && (
                  <span className="tag good">
                    <Icon name="trophy" className="chev" /> Record
                  </span>
                )}
              </div>
              <div className="sub">{summarizeSets(e.sets, e.measure)}</div>
              {e.note && <div className="sub" style={{ color: 'var(--text-3)' }}>{e.note}</div>}
            </div>
            <Icon name="chevronRight" className="chev" />
          </button>
        ))}
      </div>

      {editing && <LogEditor lookup={lookup} entry={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
