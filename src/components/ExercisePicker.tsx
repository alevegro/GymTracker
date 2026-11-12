import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { ExerciseForm } from './ExerciseForm'
import { db } from '../db'
import type { ExerciseLookup } from '../hooks'
import { MUSCLES, type Exercise, type Kind, type Muscle } from '../types'
import { normalize } from '../utils'

interface Props {
  lookup: ExerciseLookup
  title?: string
  onPick: (ex: Exercise) => void
  onClose: () => void
}

export function ExercisePicker({ lookup, title = 'Scegli esercizio', onPick, onClose }: Props) {
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<Kind | 'all'>('all')
  const [muscle, setMuscle] = useState<Muscle | null>(null)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Exercise | null>(null)

  const recentIds = useLiveQuery(async () => {
    const last = await db.logs.orderBy('createdAt').reverse().limit(150).toArray()
    return [...new Set(last.map((l) => l.exerciseId))].slice(0, 8)
  }, [], [] as string[])

  const filtered = useMemo(() => {
    const nq = normalize(q.trim())
    return lookup.list.filter(
      (e) =>
        (kind === 'all' || e.kind === kind) &&
        (!muscle || e.muscle === muscle) &&
        (!nq || normalize(`${e.name} ${e.muscle} ${e.equipment}`).includes(nq)),
    )
  }, [lookup.list, q, kind, muscle])

  const grouped = useMemo(() => {
    const g = new Map<Muscle, Exercise[]>()
    for (const m of MUSCLES) g.set(m, [])
    for (const e of filtered) g.get(e.muscle)?.push(e)
    return [...g.entries()].filter(([, list]) => list.length)
  }, [filtered])

  const showRecents = !q && kind === 'all' && !muscle && recentIds.length > 0

  if (editing) {
    return (
      <ExerciseForm
        initial={editing}
        lookup={lookup}
        onClose={() => setEditing(null)}
        onSaved={() => setEditing(null)}
        onDeleted={() => setEditing(null)}
      />
    )
  }

  if (creating) {
    return <ExerciseForm initialName={q} onClose={() => setCreating(false)} onSaved={onPick} />
  }

  return (
    <Sheet title={title} closeLabel="Annulla" onClose={onClose} right={
      <button className="link" onClick={() => setCreating(true)}>Nuovo</button>
    }>
      <div className="search">
        <Icon name="search" />
        <input
          className="input"
          type="search"
          placeholder="Cerca tra gli esercizi"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div style={{ marginTop: 12 }} className="segmented">
        {(
          [
            ['all', 'Tutti'],
            ['gym', 'Palestra'],
            ['calisthenics', 'Corpo libero'],
          ] as const
        ).map(([k, label]) => (
          <button key={k} className={kind === k ? 'active' : ''} onClick={() => setKind(k)}>
            {label}
          </button>
        ))}
      </div>
      <div className="chips" style={{ marginTop: 10 }}>
        <button className={`chip ${!muscle ? 'active' : ''}`} onClick={() => setMuscle(null)}>
          Tutti i muscoli
        </button>
        {MUSCLES.map((m) => (
          <button key={m} className={`chip ${muscle === m ? 'active' : ''}`} onClick={() => setMuscle(muscle === m ? null : m)}>
            {m}
          </button>
        ))}
      </div>

      {showRecents && (
        <>
          <div className="section-title">Usati di recente</div>
          <div className="list">
            {recentIds.map((id) => (
              <ExerciseRow key={id} ex={lookup.get(id)} onPick={onPick} onEdit={setEditing} />
            ))}
          </div>
        </>
      )}

      {grouped.map(([m, list]) => (
        <div key={m}>
          <div className="section-title">{m}</div>
          <div className="list">
            {list.map((e) => (
              <ExerciseRow key={e.id} ex={e} onPick={onPick} onEdit={setEditing} />
            ))}
          </div>
        </div>
      ))}

      {!filtered.length && (
        <div className="empty">
          <strong>Nessun esercizio trovato</strong>
          Puoi crearlo tu e ritrovarlo nella libreria.
        </div>
      )}
      <button className="btn soft block" style={{ marginTop: 18 }} onClick={() => setCreating(true)}>
        <Icon name="plus" /> {q ? `Crea «${q}»` : 'Crea un nuovo esercizio'}
      </button>
    </Sheet>
  )
}

function ExerciseRow({
  ex,
  onPick,
  onEdit,
}: {
  ex: Exercise
  onPick: (e: Exercise) => void
  onEdit: (e: Exercise) => void
}) {
  return (
    <div className="list-item" style={{ padding: 0, gap: 0 }}>
      <button className="list-item" style={{ flex: 1, minWidth: 0 }} onClick={() => onPick(ex)}>
        <div className="main">
          <div className="name">{ex.name}</div>
          <div className="sub">
            {ex.equipment}
            {ex.measure === 'time' && ' · a tempo'}
            {ex.custom && ' · personalizzato'}
            {ex.edited && ' · modificato'}
          </div>
        </div>
      </button>
      <button className="icon-btn" style={{ marginRight: 6 }} aria-label={`Modifica ${ex.name}`} onClick={() => onEdit(ex)}>
        <Icon name="edit" />
      </button>
    </div>
  )
}
