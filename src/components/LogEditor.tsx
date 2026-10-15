import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import Dexie from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { db } from '../db'
import type { ExerciseLookup } from '../hooks'
import type { LogEntry, Measure, SetEntry } from '../types'
import { entryStats, fmtNum, formatDateShort, formatDuration, parseNum, summarizeSets } from '../utils'
import { toast } from '../toast'

interface Row {
  reps: string
  min: string
  sec: string
  weight: string
}

const emptyRow = (): Row => ({ reps: '', min: '', sec: '', weight: '' })

function toRow(s: SetEntry): Row {
  const sec = s.seconds ?? 0
  return {
    reps: s.reps != null ? String(s.reps) : '',
    min: sec >= 60 ? String(Math.floor(sec / 60)) : '',
    sec: sec ? String(sec % 60) : '',
    weight: s.weight ? fmtNum(s.weight) : '',
  }
}

interface Props {
  lookup: ExerciseLookup
  entry: LogEntry
  onClose: () => void
}

export function LogEditor({ lookup, entry, onClose }: Props) {
  const ex = lookup.get(entry.exerciseId)
  const isNew = entry.id == null
  const [measure, setMeasure] = useState<Measure>(entry.measure)
  const [date, setDate] = useState(entry.date)
  const [note, setNote] = useState(entry.note ?? '')
  const [rows, setRows] = useState<Row[]>(() =>
    entry.pending || isNew ? (entry.sets.length ? entry.sets : [{ weight: 0 }, { weight: 0 }, { weight: 0 }]).map(emptyRow) : entry.sets.map(toRow),
  )
  const touched = useRef(!isNew && !entry.pending)

  // Tutte le sessioni precedenti di questo esercizio (escluse quelle da confermare).
  const history = useLiveQuery(
    () =>
      db.logs
        .where('[exerciseId+date]')
        .between([entry.exerciseId, Dexie.minKey], [entry.exerciseId, Dexie.maxKey])
        .filter((l) => l.id !== entry.id && !l.pending)
        .toArray(),
    [entry.exerciseId, entry.id],
  )

  const last = useMemo(() => {
    const prev = (history ?? []).filter((l) => l.date <= date)
    prev.sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1))
    return prev[prev.length - 1]
  }, [history, date])

  const record = useMemo(() => {
    const r = { maxWeight: 0, best1RM: 0, maxReps: 0, maxSeconds: 0 }
    for (const l of history ?? []) {
      const s = entryStats(l)
      r.maxWeight = Math.max(r.maxWeight, s.maxWeight)
      r.best1RM = Math.max(r.best1RM, s.best1RM)
      r.maxReps = Math.max(r.maxReps, s.maxReps)
      r.maxSeconds = Math.max(r.maxSeconds, s.maxSeconds)
    }
    return r
  }, [history])

  // Valori suggeriti (in grigio): i target della scheda o l'ultima sessione.
  const placeholders: SetEntry[] = entry.pending
    ? entry.sets
    : isNew && last && last.measure === measure
      ? last.sets
      : []

  // Per un nuovo inserimento, adegua il numero di serie a quelle dell'ultima volta.
  useEffect(() => {
    if (!touched.current && isNew && last && last.measure === measure && last.sets.length) {
      setRows(last.sets.map(emptyRow))
    }
  }, [last, isNew, measure])

  const ph = (i: number): SetEntry | undefined => placeholders[i] ?? placeholders[placeholders.length - 1]

  function update(i: number, patch: Partial<Row>) {
    touched.current = true
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  }

  function addSet() {
    touched.current = true
    setRows((rs) => [...rs, rs.length ? { ...rs[rs.length - 1] } : emptyRow()])
  }

  function removeSet(i: number) {
    touched.current = true
    setRows((rs) => rs.filter((_, j) => j !== i))
  }

  function copyLast() {
    if (!last) return
    touched.current = true
    setMeasure(last.measure)
    setRows(last.sets.map(toRow))
  }

  function resolve(): SetEntry[] {
    const out: SetEntry[] = []
    rows.forEach((r, i) => {
      const p = ph(i)
      const weight = parseNum(r.weight) ?? p?.weight ?? 0
      if (measure === 'reps') {
        const reps = parseNum(r.reps) ?? p?.reps
        if (reps && reps > 0) out.push({ reps: Math.round(reps), weight })
      } else {
        const m = parseNum(r.min)
        const s = parseNum(r.sec)
        const seconds = m == null && s == null ? p?.seconds : (m ?? 0) * 60 + (s ?? 0)
        if (seconds && seconds > 0) out.push({ seconds: Math.round(seconds), weight })
      }
    })
    return out
  }

  const resolved = resolve()

  async function save() {
    if (!resolved.length) return
    const data: LogEntry = {
      date,
      exerciseId: entry.exerciseId,
      measure,
      sets: resolved,
      note: note.trim() || undefined,
      createdAt: entry.createdAt || Date.now(),
    }
    if (isNew) await db.logs.add(data)
    else await db.logs.put({ ...data, id: entry.id })

    const s = entryStats(data)
    const hadHistory = (history?.length ?? 0) > 0
    if (hadHistory) {
      if (s.maxWeight > record.maxWeight && s.maxWeight > 0) toast(`🏆 Nuovo record di carico: ${fmtNum(s.maxWeight)} kg`)
      else if (measure === 'reps' && s.maxWeight === 0 && s.maxReps > record.maxReps) toast(`🏆 Nuovo record: ${s.maxReps} ripetizioni`)
      else if (measure === 'time' && s.maxSeconds > record.maxSeconds) toast(`🏆 Nuovo record: ${formatDuration(s.maxSeconds)}`)
      else toast('Salvato')
    } else toast('Salvato')
    onClose()
  }

  async function remove() {
    if (entry.id == null) return
    if (!confirm(`Eliminare ${ex.name} da questo giorno?`)) return
    await db.logs.delete(entry.id)
    toast('Eliminato')
    onClose()
  }

  const hasRecord = record.maxWeight > 0 || record.maxReps > 0 || record.maxSeconds > 0

  return (
    <Sheet
      title={ex.name}
      closeLabel="Annulla"
      onClose={onClose}
      footer={
        <button className="btn primary block" disabled={!resolved.length} onClick={save}>
          <Icon name="check" /> {entry.pending ? 'Conferma' : 'Salva'}
          {resolved.length > 0 && ` · ${resolved.length} ${resolved.length === 1 ? 'serie' : 'serie'}`}
        </button>
      }
    >
      <div className="stack">
        <div className="row">
          <span className="tag">{ex.muscle}</span>
          <span className="tag">{ex.kind === 'gym' ? 'Palestra' : 'Corpo libero'}</span>
          <span className="spacer" />
          <input
            type="date"
            className="input"
            style={{ width: 'auto', minHeight: 36, padding: '4px 10px', fontSize: 15 }}
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
        </div>

        {last && (
          <div className="prev-box">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="small muted">Ultima volta · {formatDateShort(last.date, true)}</div>
              <div style={{ fontWeight: 650 }}>{summarizeSets(last.sets, last.measure)}</div>
            </div>
            <button className="btn soft" style={{ minHeight: 38, padding: '0 12px' }} onClick={copyLast}>
              <Icon name="copy" /> Copia
            </button>
          </div>
        )}
        {hasRecord && (
          <div className="small muted row" style={{ gap: 6 }}>
            <Icon name="trophy" className="chev" />
            Record:{' '}
            {[
              record.maxWeight > 0 && `${fmtNum(record.maxWeight)} kg`,
              record.best1RM > 0 && `1RM stimato ${fmtNum(Math.round(record.best1RM))} kg`,
              measure === 'reps' && record.maxReps > 0 && `${record.maxReps} rip.`,
              measure === 'time' && record.maxSeconds > 0 && formatDuration(record.maxSeconds),
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
        )}

        <div className="segmented">
          <button className={measure === 'reps' ? 'active' : ''} onClick={() => setMeasure('reps')}>
            Ripetizioni
          </button>
          <button className={measure === 'time' ? 'active' : ''} onClick={() => setMeasure('time')}>
            Tempo
          </button>
        </div>

        <div className={`sets-table ${measure === 'time' ? 'time' : ''}`}>
          <div className="th">#</div>
          <div className="th">{measure === 'reps' ? 'Ripetizioni' : 'Tempo (min : sec)'}</div>
          <div className="th">Carico kg</div>
          <div />
          {rows.map((r, i) => {
            const p = ph(i)
            const pSec = p?.seconds ?? 0
            return (
              <Fragment key={i}>
                <div className="set-num">{i + 1}</div>
                {measure === 'reps' ? (
                  <input
                    className="num-input"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder={p?.reps != null ? String(p.reps) : '–'}
                    value={r.reps}
                    onChange={(e) => update(i, { reps: e.target.value.replace(/[^0-9]/g, '') })}
                  />
                ) : (
                  <div className="time-input">
                    <input
                      className="num-input"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder={pSec ? String(Math.floor(pSec / 60)) : '0'}
                      value={r.min}
                      onChange={(e) => update(i, { min: e.target.value.replace(/[^0-9]/g, '') })}
                    />
                    <span className="sep">:</span>
                    <input
                      className="num-input"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder={pSec ? String(pSec % 60).padStart(2, '0') : '00'}
                      value={r.sec}
                      onChange={(e) => update(i, { sec: e.target.value.replace(/[^0-9]/g, '') })}
                    />
                  </div>
                )}
                <input
                  className="num-input"
                  inputMode="decimal"
                  placeholder={p?.weight ? fmtNum(p.weight) : '0'}
                  value={r.weight}
                  onChange={(e) => update(i, { weight: e.target.value.replace(/[^0-9.,-]/g, '') })}
                />
                <button
                  className="icon-btn"
                  aria-label={`Elimina serie ${i + 1}`}
                  disabled={rows.length <= 1}
                  style={{ opacity: rows.length <= 1 ? 0.3 : 1 }}
                  onClick={() => removeSet(i)}
                >
                  <Icon name="close" />
                </button>
              </Fragment>
            )
          })}
        </div>

        <button className="btn block" onClick={addSet}>
          <Icon name="plus" /> Aggiungi serie
        </button>

        {placeholders.length > 0 && (
          <div className="hint">
            I valori in grigio sono {entry.pending ? 'quelli della scheda' : "quelli dell'ultima volta"}: se lasci un campo
            vuoto viene usato quel valore. Carico 0 = corpo libero.
          </div>
        )}
        {!placeholders.length && <div className="hint">Carico 0 (o vuoto) = corpo libero. Per la zavorra indica i kg aggiunti.</div>}

        <label className="field">
          <span>Note</span>
          <textarea
            className="input"
            placeholder="Sensazioni, RPE, tempo di recupero…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        {!isNew && (
          <button className="btn danger block" onClick={remove}>
            <Icon name="trash" /> Elimina dal giorno
          </button>
        )}
      </div>
    </Sheet>
  )
}
