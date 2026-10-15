import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Calendar } from '../components/Calendar'
import { ExercisePicker } from '../components/ExercisePicker'
import { LogEditor } from '../components/LogEditor'
import { Sheet } from '../components/Sheet'
import { Icon } from '../components/Icon'
import { db } from '../db'
import type { ExerciseLookup } from '../hooks'
import type { LogEntry, PlanDay } from '../types'
import { addDays, fmtNum, formatDateLong, fromISO, relativeDay, setValue, toISO, todayISO } from '../utils'
import { formatTarget, sortPlans, startPlanDay } from '../planUtils'
import { toast } from '../toast'
import { daysSinceBackup } from './SettingsScreen'

interface Props {
  lookup: ExerciseLookup
  date: string
  setDate: (d: string) => void
  goTo: (tab: 'settings') => void
}

export function DiaryScreen({ lookup, date, setDate, goTo }: Props) {
  const [month, setMonth] = useState(() => {
    const d = fromISO(date)
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [picking, setPicking] = useState(false)
  const [editing, setEditing] = useState<LogEntry | null>(null)
  const [fromPlan, setFromPlan] = useState(false)

  const rangeStart = addDays(toISO(month), -7)
  const rangeEnd = addDays(toISO(new Date(month.getFullYear(), month.getMonth() + 1, 0)), 7)

  const monthLogs = useLiveQuery(
    () => db.logs.where('date').between(rangeStart, rangeEnd, true, true).toArray(),
    [rangeStart, rangeEnd],
    [] as LogEntry[],
  )
  const dayLogs = useLiveQuery(() => db.logs.where('date').equals(date).sortBy('createdAt'), [date], [] as LogEntry[])
  const totalLogs = useLiveQuery(() => db.logs.count(), [], 0)

  const marks = useMemo(() => {
    const m = new Map<string, 'done' | 'pending'>()
    for (const l of monthLogs) {
      if (!l.pending) m.set(l.date, 'done')
      else if (!m.has(l.date)) m.set(l.date, 'pending')
    }
    return m
  }, [monthLogs])

  const done = dayLogs.filter((l) => !l.pending)
  const totalSets = done.reduce((n, l) => n + l.sets.length, 0)
  const volume = done.reduce(
    (n, l) => n + (l.measure === 'reps' ? l.sets.reduce((v, s) => v + (s.reps ?? 0) * (s.weight || 0), 0) : 0),
    0,
  )

  const backupDays = daysSinceBackup()
  const showBackup = totalLogs >= 10 && (backupDays == null || backupDays >= 14)

  function selectDate(iso: string) {
    setDate(iso)
  }

  function goToday() {
    const t = todayISO()
    setDate(t)
    const d = fromISO(t)
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1))
  }

  async function confirmEntry(l: LogEntry) {
    await db.logs.update(l.id!, { pending: false })
    toast('Confermato')
  }

  const rel = relativeDay(date)

  return (
    <div className="screen">
      <div className="title-row">
        <h1 className="large-title">Diario</h1>
        {date !== todayISO() && (
          <button className="btn soft" style={{ minHeight: 38 }} onClick={goToday}>
            Oggi
          </button>
        )}
      </div>

      {showBackup && (
        <div className="banner">
          <span style={{ flex: 1 }}>
            {backupDays == null ? 'Non hai ancora fatto un backup.' : `Ultimo backup ${backupDays} giorni fa.`} I dati
            sono solo su questo telefono.
          </span>
          <button onClick={() => goTo('settings')}>Backup</button>
        </div>
      )}

      <Calendar month={month} selected={date} marks={marks} onSelect={selectDate} onMonthChange={setMonth} />

      <div className="row" style={{ margin: '22px 4px 10px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 750 }}>{rel ?? formatDateLong(date)}</div>
          {rel && <div className="small muted">{formatDateLong(date)}</div>}
        </div>
        {done.length > 0 && (
          <div className="small muted" style={{ textAlign: 'right' }}>
            {done.length} eserc. · {totalSets} serie
            {volume > 0 && (
              <>
                <br />
                {fmtNum(Math.round(volume))} kg sollevati
              </>
            )}
          </div>
        )}
      </div>

      <div className="stack">
        {dayLogs.map((l) => (
          <EntryCard key={l.id} entry={l} lookup={lookup} onOpen={() => setEditing(l)} onConfirm={() => confirmEntry(l)} />
        ))}
        {!dayLogs.length && (
          <div className="card empty">
            <strong>Nessun allenamento</strong>
            Aggiungi gli esercizi che hai fatto oppure parti dalla tua scheda.
          </div>
        )}
      </div>

      <div className="btn-row" style={{ marginTop: 14 }}>
        <button className="btn primary" onClick={() => setPicking(true)}>
          <Icon name="plus" /> Esercizio
        </button>
        <button className="btn soft" onClick={() => setFromPlan(true)}>
          <Icon name="clipboard" /> Dalla scheda
        </button>
      </div>

      {picking && (
        <ExercisePicker
          lookup={lookup}
          onClose={() => setPicking(false)}
          onPick={(ex) => {
            setPicking(false)
            setEditing({ date, exerciseId: ex.id, measure: ex.measure, sets: [], createdAt: 0 })
          }}
        />
      )}
      {editing && <LogEditor lookup={lookup} entry={editing} onClose={() => setEditing(null)} />}
      {fromPlan && (
        <PlanDayPicker
          lookup={lookup}
          onClose={() => setFromPlan(false)}
          onPick={async (day) => {
            setFromPlan(false)
            const n = await startPlanDay(day, date)
            toast(n ? `${n} esercizi aggiunti: tocca per compilarli` : 'Questo giorno della scheda è vuoto')
          }}
        />
      )}
    </div>
  )
}

function EntryCard({
  entry,
  lookup,
  onOpen,
  onConfirm,
}: {
  entry: LogEntry
  lookup: ExerciseLookup
  onOpen: () => void
  onConfirm: () => void
}) {
  const ex = lookup.get(entry.exerciseId)
  return (
    <div className={`entry ${entry.pending ? 'pending' : ''}`}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <button style={{ flex: 1, textAlign: 'left', minWidth: 0 }} onClick={onOpen}>
          <div className="entry-name">{ex.name}</div>
          <div className="small muted" style={{ marginTop: 2 }}>
            {ex.muscle}
            {entry.pending && ' · da compilare'}
          </div>
        </button>
        {entry.pending ? (
          <button className="btn soft" style={{ minHeight: 36, padding: '0 12px', fontSize: 14 }} onClick={onConfirm}>
            <Icon name="check" /> Fatto
          </button>
        ) : (
          <button className="icon-btn" aria-label="Modifica" onClick={onOpen}>
            <Icon name="edit" />
          </button>
        )}
      </div>
      <button className="entry-sets" style={{ width: '100%' }} onClick={onOpen}>
        {entry.sets.map((s, i) => (
          <span key={i} className="set-pill" style={entry.pending ? { opacity: 0.6 } : undefined}>
            {setValue(s, entry.measure)}
            {entry.measure === 'reps' && <small> rip</small>}
            {s.weight ? <small> × {fmtNum(s.weight)} kg</small> : null}
          </span>
        ))}
      </button>
      {entry.note && (
        <div className="small muted" style={{ marginTop: 8 }}>
          {entry.note}
        </div>
      )}
    </div>
  )
}

function PlanDayPicker({
  lookup,
  onClose,
  onPick,
}: {
  lookup: ExerciseLookup
  onClose: () => void
  onPick: (day: PlanDay) => void
}) {
  const plans = useLiveQuery(() => db.plans.toArray(), [])
  return (
    <Sheet title="Parti dalla scheda" closeLabel="Annulla" onClose={onClose}>
      {plans && !plans.length && (
        <div className="empty">
          <strong>Nessuna scheda</strong>
          Crea la tua scheda nella sezione «Scheda» e potrai caricarla qui con un tocco.
        </div>
      )}
      {sortPlans(plans ?? []).map((p) => (
        <div key={p.id}>
          <div className="section-title row">
            {p.name} {p.active ? <span className="tag accent">Attiva</span> : null}
          </div>
          <div className="list">
            {p.days.map((d) => (
              <button key={d.id} className="list-item" onClick={() => onPick(d)}>
                <div className="main">
                  <div className="name">{d.name}</div>
                  <div className="sub">
                    {d.exercises.length
                      ? d.exercises
                          .slice(0, 4)
                          .map((e) => `${lookup.get(e.exerciseId).name} ${formatTarget(e)}`)
                          .join(' · ') + (d.exercises.length > 4 ? ' …' : '')
                      : 'Nessun esercizio'}
                  </div>
                </div>
                <Icon name="chevronRight" className="chev" />
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="hint" style={{ marginTop: 16 }}>
        Gli esercizi vengono aggiunti al giorno con i valori della scheda (e il carico dell'ultima volta). Toccali per
        inserire ciò che hai fatto davvero, oppure premi «Fatto» se hai rispettato la scheda.
      </div>
    </Sheet>
  )
}
