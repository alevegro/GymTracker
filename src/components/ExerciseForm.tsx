import { useState } from 'react'
import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { db } from '../db'
import { slugify } from '../exercises'
import { MUSCLES, type Exercise, type Kind, type Measure, type Muscle } from '../types'

interface Props {
  /** Esercizio personalizzato da modificare; se assente se ne crea uno nuovo. */
  initial?: Exercise
  initialName?: string
  onClose: () => void
  onSaved: (ex: Exercise) => void
  onDeleted?: () => void
}

export function ExerciseForm({ initial, initialName = '', onClose, onSaved, onDeleted }: Props) {
  const [name, setName] = useState(initial?.name ?? initialName)
  const [muscle, setMuscle] = useState<Muscle>(initial?.muscle ?? 'Petto')
  const [kind, setKind] = useState<Kind>(initial?.kind ?? 'gym')
  const [measure, setMeasure] = useState<Measure>(initial?.measure ?? 'reps')
  const [equipment, setEquipment] = useState(initial?.equipment ?? '')

  async function save() {
    const n = name.trim()
    if (!n) return
    const ex: Exercise = {
      // In modifica l'ID resta lo stesso: lo storico e le schede restano collegati.
      id: initial?.id ?? `c-${slugify(n)}-${Date.now().toString(36)}`,
      name: n,
      muscle,
      kind,
      measure,
      equipment: equipment.trim() || (kind === 'gym' ? 'Attrezzo' : 'Corpo libero'),
      custom: true,
    }
    await db.customExercises.put(ex)
    onSaved(ex)
  }

  async function remove() {
    if (!initial) return
    const used = await db.logs.where('exerciseId').equals(initial.id).count()
    const msg = used
      ? `«${initial.name}» è usato in ${used} allenamenti: lo storico resterà ma senza nome. Eliminarlo?`
      : `Eliminare «${initial.name}»?`
    if (!confirm(msg)) return
    await db.customExercises.delete(initial.id)
    onDeleted?.()
  }

  return (
    <Sheet
      title={initial ? 'Modifica esercizio' : 'Nuovo esercizio'}
      closeLabel="Annulla"
      onClose={onClose}
      footer={
        <button className="btn primary block" disabled={!name.trim()} onClick={save}>
          {initial ? 'Salva modifiche' : 'Salva esercizio'}
        </button>
      }
    >
      <div className="stack">
        <label className="field">
          <span>Nome</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus={!initial} />
        </label>
        <div className="field">
          <span>Tipo</span>
          <div className="segmented">
            <button className={kind === 'gym' ? 'active' : ''} onClick={() => setKind('gym')}>
              Palestra
            </button>
            <button className={kind === 'calisthenics' ? 'active' : ''} onClick={() => setKind('calisthenics')}>
              Corpo libero
            </button>
          </div>
        </div>
        <div className="field">
          <span>Si misura in</span>
          <div className="segmented">
            <button className={measure === 'reps' ? 'active' : ''} onClick={() => setMeasure('reps')}>
              Ripetizioni
            </button>
            <button className={measure === 'time' ? 'active' : ''} onClick={() => setMeasure('time')}>
              Tempo
            </button>
          </div>
        </div>
        <label className="field">
          <span>Gruppo muscolare</span>
          <select className="input" value={muscle} onChange={(e) => setMuscle(e.target.value as Muscle)}>
            {MUSCLES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Attrezzo (facoltativo)</span>
          <input
            className="input"
            value={equipment}
            placeholder="es. Manubri, Sbarra, Elastico"
            onChange={(e) => setEquipment(e.target.value)}
          />
        </label>
        {initial && (
          <>
            <div className="hint">
              Le modifiche valgono anche per lo storico e le schede che usano già questo esercizio. Gli allenamenti già
              registrati mantengono la misura (ripetizioni o tempo) con cui li hai inseriti.
            </div>
            <button className="btn danger block" onClick={remove}>
              <Icon name="trash" /> Elimina esercizio
            </button>
          </>
        )}
      </div>
    </Sheet>
  )
}
