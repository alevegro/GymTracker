import { useState } from 'react'
import { Sheet } from './Sheet'
import { db } from '../db'
import { slugify } from '../exercises'
import { MUSCLES, type Exercise, type Kind, type Measure, type Muscle } from '../types'

interface Props {
  initialName?: string
  onClose: () => void
  onSaved: (ex: Exercise) => void
}

export function ExerciseForm({ initialName = '', onClose, onSaved }: Props) {
  const [name, setName] = useState(initialName)
  const [muscle, setMuscle] = useState<Muscle>('Petto')
  const [kind, setKind] = useState<Kind>('gym')
  const [measure, setMeasure] = useState<Measure>('reps')
  const [equipment, setEquipment] = useState('')

  async function save() {
    const n = name.trim()
    if (!n) return
    const ex: Exercise = {
      id: `c-${slugify(n)}-${Date.now().toString(36)}`,
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

  return (
    <Sheet
      title="Nuovo esercizio"
      closeLabel="Annulla"
      onClose={onClose}
      footer={
        <button className="btn primary block" disabled={!name.trim()} onClick={save}>
          Salva esercizio
        </button>
      }
    >
      <div className="stack">
        <label className="field">
          <span>Nome</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
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
      </div>
    </Sheet>
  )
}
