import { useMemo, useState, type ChangeEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from '../components/Sheet'
import { Icon } from '../components/Icon'
import { ExercisePicker } from '../components/ExercisePicker'
import { db } from '../db'
import type { ExerciseLookup } from '../hooks'
import type { LogEntry, Measure, Plan, PlanDay, PlanExercise } from '../types'
import { formatDateShort, formatDuration, parseNum, summarizeSets, todayISO, uid, fmtNum } from '../utils'
import { formatTarget, setActivePlan, sortPlans, startPlanDay } from '../planUtils'
import { toast } from '../toast'

interface Props {
  lookup: ExerciseLookup
  onStarted: (date: string) => void
}

const DAY_NAMES = ['Giorno A', 'Giorno B', 'Giorno C', 'Giorno D', 'Giorno E', 'Giorno F', 'Giorno G']

export function PlansScreen({ lookup, onStarted }: Props) {
  const plans = useLiveQuery(() => db.plans.toArray(), [])
  const [openId, setOpenId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)

  const open = plans?.find((p) => p.id === openId)
  if (open) return <PlanDetail plan={open} lookup={lookup} onBack={() => setOpenId(null)} onStarted={onStarted} />

  return (
    <div className="screen">
      <div className="title-row">
        <h1 className="large-title">Schede</h1>
        <button className="btn soft" style={{ minHeight: 38 }} onClick={() => setCreating(true)}>
          <Icon name="plus" /> Nuova
        </button>
      </div>

      {plans && !plans.length && (
        <div className="card empty">
          <strong>Nessuna scheda</strong>
          Crea la tua scheda divisa in giorni (es. A, B, C): potrai consultarla in palestra e caricarla nel diario con un
          tocco.
          <div style={{ marginTop: 14 }}>
            <button className="btn primary" onClick={() => setCreating(true)}>
              Crea la prima scheda
            </button>
          </div>
        </div>
      )}

      <div className="stack">
        {sortPlans(plans ?? []).map((p) => (
          <button key={p.id} className="entry" onClick={() => setOpenId(p.id!)}>
            <div className="row">
              <div className="entry-name" style={{ flex: 1 }}>
                {p.name}
              </div>
              {p.active ? <span className="tag accent">Attiva</span> : null}
              <Icon name="chevronRight" className="chev" />
            </div>
            <div className="small muted" style={{ marginTop: 4 }}>
              {p.days.length} {p.days.length === 1 ? 'giorno' : 'giorni'} ·{' '}
              {p.days.reduce((n, d) => n + d.exercises.length, 0)} esercizi
            </div>
            <div className="entry-sets">
              {p.days.map((d) => (
                <span key={d.id} className="set-pill">
                  {d.name} <small>{d.exercises.length}</small>
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {creating && (
        <NewPlanSheet
          hasPlans={!!plans?.length}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false)
            setOpenId(id)
          }}
        />
      )}
    </div>
  )
}

function NewPlanSheet({
  hasPlans,
  onClose,
  onCreated,
}: {
  hasPlans: boolean
  onClose: () => void
  onCreated: (id: number) => void
}) {
  const [name, setName] = useState('')
  const [days, setDays] = useState(3)

  async function create() {
    const plan: Plan = {
      name: name.trim() || 'La mia scheda',
      active: hasPlans ? 0 : 1,
      days: Array.from({ length: days }, (_, i) => ({ id: uid(), name: DAY_NAMES[i], exercises: [] })),
      createdAt: Date.now(),
    }
    const id = await db.plans.add(plan)
    onCreated(id)
  }

  return (
    <Sheet
      title="Nuova scheda"
      closeLabel="Annulla"
      onClose={onClose}
      footer={
        <button className="btn primary block" onClick={create}>
          Crea scheda
        </button>
      }
    >
      <div className="stack">
        <label className="field">
          <span>Nome</span>
          <input
            className="input"
            placeholder="es. Scheda autunno, Push/Pull/Legs"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>
        <div className="field">
          <span>Quanti giorni di allenamento?</span>
          <div className="segmented">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button key={n} className={days === n ? 'active' : ''} onClick={() => setDays(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="hint">Potrai rinominare i giorni (es. «Push», «Gambe») e aggiungerne altri in seguito.</div>
      </div>
    </Sheet>
  )
}

function PlanDetail({
  plan,
  lookup,
  onBack,
  onStarted,
}: {
  plan: Plan
  lookup: ExerciseLookup
  onBack: () => void
  onStarted: (date: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [dayId, setDayId] = useState(plan.days[0]?.id)
  const [picking, setPicking] = useState(false)
  const [editEx, setEditEx] = useState<{ index: number; pe: PlanExercise } | null>(null)

  const day = plan.days.find((d) => d.id === dayId) ?? plan.days[0]

  const ids = useMemo(() => [...new Set(plan.days.flatMap((d) => d.exercises.map((e) => e.exerciseId)))], [plan])
  const lastById = useLiveQuery(async () => {
    const logs = await db.logs.where('exerciseId').anyOf(ids).filter((l) => !l.pending).toArray()
    const m = new Map<string, LogEntry>()
    for (const l of logs) {
      const prev = m.get(l.exerciseId)
      if (!prev || l.date > prev.date || (l.date === prev.date && l.createdAt > prev.createdAt)) m.set(l.exerciseId, l)
    }
    return m
  }, [ids.join('|')])

  const save = (p: Plan) => db.plans.put(p)

  function updateDay(patch: Partial<PlanDay>) {
    if (!day) return
    save({ ...plan, days: plan.days.map((d) => (d.id === day.id ? { ...d, ...patch } : d)) })
  }

  function addDay() {
    const d: PlanDay = { id: uid(), name: DAY_NAMES[plan.days.length] ?? `Giorno ${plan.days.length + 1}`, exercises: [] }
    save({ ...plan, days: [...plan.days, d] })
    setDayId(d.id)
  }

  function deleteDay() {
    if (!day || plan.days.length <= 1) return
    if (!confirm(`Eliminare «${day.name}» dalla scheda?`)) return
    const days = plan.days.filter((d) => d.id !== day.id)
    save({ ...plan, days })
    setDayId(days[0].id)
  }

  function move(i: number, dir: -1 | 1) {
    if (!day) return
    const ex = [...day.exercises]
    const j = i + dir
    if (j < 0 || j >= ex.length) return
    ;[ex[i], ex[j]] = [ex[j], ex[i]]
    updateDay({ exercises: ex })
  }

  async function duplicate() {
    const { id: _id, ...rest } = plan
    await db.plans.add({
      ...rest,
      name: `${plan.name} (copia)`,
      active: 0,
      createdAt: Date.now(),
      days: plan.days.map((d) => ({ ...d, id: uid() })),
    })
    toast('Scheda duplicata')
  }

  async function remove() {
    if (!confirm(`Eliminare la scheda «${plan.name}»? Gli allenamenti già registrati nel diario restano.`)) return
    await db.plans.delete(plan.id!)
    onBack()
  }

  async function start() {
    if (!day) return
    const date = todayISO()
    const n = await startPlanDay(day, date)
    toast(`${day.name}: ${n} esercizi aggiunti a oggi`)
    onStarted(date)
  }

  return (
    <div className="screen">
      <div className="title-row" style={{ margin: '0 -4px' }}>
        <button className="link row" style={{ gap: 2 }} onClick={onBack}>
          <Icon name="chevronLeft" className="chev" /> Schede
        </button>
        <button className="link" onClick={() => setEditing(!editing)}>
          {editing ? 'Fine' : 'Modifica'}
        </button>
      </div>

      {editing ? (
        <input
          className="input"
          style={{ fontSize: 24, fontWeight: 800 }}
          value={plan.name}
          onChange={(e) => save({ ...plan, name: e.target.value })}
        />
      ) : (
        <h1 className="large-title">{plan.name}</h1>
      )}

      <div className="row" style={{ margin: '10px 0 4px' }}>
        {plan.active ? (
          <span className="tag accent">Scheda attiva</span>
        ) : (
          <button className="btn soft" style={{ minHeight: 34, fontSize: 14 }} onClick={() => setActivePlan(plan.id!)}>
            Imposta come attiva
          </button>
        )}
      </div>

      {editing ? (
        <textarea
          className="input"
          style={{ marginTop: 10 }}
          placeholder="Note sulla scheda (obiettivo, durata, progressione…)"
          value={plan.notes ?? ''}
          onChange={(e) => save({ ...plan, notes: e.target.value })}
        />
      ) : (
        plan.notes && <p className="muted" style={{ whiteSpace: 'pre-wrap', margin: '10px 2px' }}>{plan.notes}</p>
      )}

      <div className="day-tabs" style={{ marginTop: 16 }}>
        {plan.days.map((d) => (
          <button key={d.id} className={`chip ${d.id === day?.id ? 'active' : ''}`} onClick={() => setDayId(d.id)}>
            {d.name}
          </button>
        ))}
        {editing && (
          <button className="chip" onClick={addDay}>
            + Giorno
          </button>
        )}
      </div>

      {day && (
        <>
          {editing && (
            <div className="row" style={{ marginTop: 12 }}>
              <input
                className="input"
                value={day.name}
                aria-label="Nome del giorno"
                onChange={(e) => updateDay({ name: e.target.value })}
              />
              <button
                className="icon-btn"
                aria-label="Elimina giorno"
                disabled={plan.days.length <= 1}
                style={{ opacity: plan.days.length <= 1 ? 0.3 : 1 }}
                onClick={deleteDay}
              >
                <Icon name="trash" />
              </button>
            </div>
          )}

          <div className="list" style={{ marginTop: 12 }}>
            {day.exercises.map((pe, i) => {
              const ex = lookup.get(pe.exerciseId)
              const last = lastById?.get(pe.exerciseId)
              return (
                <div key={`${pe.exerciseId}-${i}`} className="plan-ex">
                  <div className="idx">{i + 1}</div>
                  <button style={{ flex: 1, textAlign: 'left', minWidth: 0 }} onClick={() => setEditEx({ index: i, pe })}>
                    <div className="name" style={{ fontWeight: 650 }}>
                      {ex.name}
                    </div>
                    <div className="target">{formatTarget(pe)}</div>
                    <div className="small muted">
                      {[pe.rest ? `Recupero ${formatDuration(pe.rest)}` : '', pe.note ?? ''].filter(Boolean).join(' · ')}
                    </div>
                    {!editing && last && (
                      <div className="small" style={{ color: 'var(--text-3)', marginTop: 2 }}>
                        Ultima ({formatDateShort(last.date)}): {summarizeSets(last.sets, last.measure)}
                      </div>
                    )}
                  </button>
                  {editing && (
                    <div className="controls">
                      <button className="icon-btn" aria-label="Sposta su" onClick={() => move(i, -1)}>
                        <Icon name="chevronUp" />
                      </button>
                      <button className="icon-btn" aria-label="Sposta giù" onClick={() => move(i, 1)}>
                        <Icon name="chevronDown" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
            {!day.exercises.length && (
              <div className="empty">
                <strong>Giorno vuoto</strong>
                Aggiungi gli esercizi con serie, ripetizioni e carico previsti.
              </div>
            )}
          </div>

          <button className="btn soft block" style={{ marginTop: 12 }} onClick={() => setPicking(true)}>
            <Icon name="plus" /> Aggiungi esercizio
          </button>
          {!editing && day.exercises.length > 0 && (
            <button className="btn primary block" style={{ marginTop: 10 }} onClick={start}>
              <Icon name="play" /> Allenati oggi con «{day.name}»
            </button>
          )}
        </>
      )}

      {editing && (
        <div className="stack" style={{ marginTop: 28 }}>
          <button className="btn block" onClick={duplicate}>
            <Icon name="copy" /> Duplica scheda
          </button>
          <button className="btn danger block" onClick={remove}>
            <Icon name="trash" /> Elimina scheda
          </button>
        </div>
      )}

      {picking && (
        <ExercisePicker
          lookup={lookup}
          title="Aggiungi alla scheda"
          onClose={() => setPicking(false)}
          onPick={(ex) => {
            setPicking(false)
            setEditEx({
              index: -1,
              pe: ex.measure === 'time'
                ? { exerciseId: ex.id, measure: 'time', sets: 3, seconds: 30, rest: 60 }
                : { exerciseId: ex.id, measure: 'reps', sets: 3, reps: 10, rest: 90 },
            })
          }}
        />
      )}
      {editEx && day && (
        <PlanExerciseEditor
          name={lookup.get(editEx.pe.exerciseId).name}
          initial={editEx.pe}
          isNew={editEx.index < 0}
          onClose={() => setEditEx(null)}
          onSave={(pe) => {
            const ex = [...day.exercises]
            if (editEx.index < 0) ex.push(pe)
            else ex[editEx.index] = pe
            updateDay({ exercises: ex })
            setEditEx(null)
          }}
          onDelete={() => {
            updateDay({ exercises: day.exercises.filter((_, j) => j !== editEx.index) })
            setEditEx(null)
          }}
        />
      )}
    </div>
  )
}

const REST_OPTIONS = [45, 60, 90, 120, 180]

function PlanExerciseEditor({
  name,
  initial,
  isNew,
  onClose,
  onSave,
  onDelete,
}: {
  name: string
  initial: PlanExercise
  isNew: boolean
  onClose: () => void
  onSave: (pe: PlanExercise) => void
  onDelete: () => void
}) {
  const [measure, setMeasure] = useState<Measure>(initial.measure)
  const [sets, setSets] = useState(String(initial.sets))
  const [reps, setReps] = useState(initial.reps != null ? String(initial.reps) : '')
  const [repsMax, setRepsMax] = useState(initial.repsMax != null ? String(initial.repsMax) : '')
  const [min, setMin] = useState(initial.seconds && initial.seconds >= 60 ? String(Math.floor(initial.seconds / 60)) : '')
  const [sec, setSec] = useState(initial.seconds ? String(initial.seconds % 60) : '')
  const [weight, setWeight] = useState(initial.weight ? fmtNum(initial.weight) : '')
  const [rest, setRest] = useState(initial.rest != null ? String(initial.rest) : '')
  const [note, setNote] = useState(initial.note ?? '')

  function save() {
    const seconds = (parseNum(min) ?? 0) * 60 + (parseNum(sec) ?? 0)
    onSave({
      exerciseId: initial.exerciseId,
      measure,
      sets: Math.max(1, Math.round(parseNum(sets) ?? 3)),
      reps: measure === 'reps' ? parseNum(reps) : undefined,
      repsMax: measure === 'reps' ? parseNum(repsMax) : undefined,
      seconds: measure === 'time' ? seconds || 30 : undefined,
      weight: parseNum(weight) || undefined,
      rest: parseNum(rest),
      note: note.trim() || undefined,
    })
  }

  const digits = (f: (v: string) => void) => (e: ChangeEvent<HTMLInputElement>) => f(e.target.value.replace(/[^0-9]/g, ''))

  return (
    <Sheet
      title={name}
      closeLabel="Annulla"
      onClose={onClose}
      footer={
        <button className="btn primary block" onClick={save}>
          {isNew ? 'Aggiungi alla scheda' : 'Salva'}
        </button>
      }
    >
      <div className="stack">
        <div className="segmented">
          <button className={measure === 'reps' ? 'active' : ''} onClick={() => setMeasure('reps')}>
            Ripetizioni
          </button>
          <button className={measure === 'time' ? 'active' : ''} onClick={() => setMeasure('time')}>
            Tempo
          </button>
        </div>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <label className="field" style={{ flex: 1 }}>
            <span>Serie</span>
            <input className="num-input" inputMode="numeric" value={sets} onChange={digits(setSets)} />
          </label>
          {measure === 'reps' ? (
            <>
              <label className="field" style={{ flex: 1 }}>
                <span>Ripetizioni</span>
                <input className="num-input" inputMode="numeric" value={reps} onChange={digits(setReps)} />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>fino a (facolt.)</span>
                <input className="num-input" inputMode="numeric" placeholder="–" value={repsMax} onChange={digits(setRepsMax)} />
              </label>
            </>
          ) : (
            <label className="field" style={{ flex: 2 }}>
              <span>Tempo (min : sec)</span>
              <div className="time-input">
                <input className="num-input" inputMode="numeric" placeholder="0" value={min} onChange={digits(setMin)} />
                <span className="sep">:</span>
                <input className="num-input" inputMode="numeric" placeholder="00" value={sec} onChange={digits(setSec)} />
              </div>
            </label>
          )}
        </div>
        <label className="field">
          <span>Carico in kg (vuoto = usa quello dell'ultima volta / corpo libero)</span>
          <input
            className="num-input"
            inputMode="decimal"
            placeholder="–"
            value={weight}
            onChange={(e) => setWeight(e.target.value.replace(/[^0-9.,]/g, ''))}
          />
        </label>
        <div className="field">
          <span>Recupero tra le serie</span>
          <div className="segmented">
            {REST_OPTIONS.map((r) => (
              <button key={r} className={rest === String(r) ? 'active' : ''} onClick={() => setRest(String(r))}>
                {formatDuration(r)}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span>Note</span>
          <input
            className="input"
            placeholder="es. tempo 3-1-1, presa larga, cedimento all'ultima"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        {!isNew && (
          <button className="btn danger block" onClick={onDelete}>
            <Icon name="trash" /> Rimuovi dalla scheda
          </button>
        )}
      </div>
    </Sheet>
  )
}
