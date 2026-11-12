import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { ExercisePicker } from './ExercisePicker'
import { db } from '../db'
import { BUILTIN_IDS, builtinById, slugify } from '../exercises'
import { exerciseUsage, transferHistory } from '../exerciseOps'
import type { ExerciseLookup } from '../hooks'
import { toast } from '../toast'
import { MUSCLES, type Exercise, type Kind, type Measure, type Muscle } from '../types'

interface Props {
  /** Esercizio da modificare (personalizzato o standard); se assente se ne crea uno nuovo. */
  initial?: Exercise
  initialName?: string
  /** Serve per scegliere l'esercizio su cui spostare lo storico. */
  lookup?: ExerciseLookup
  onClose: () => void
  onSaved: (ex: Exercise) => void
  onDeleted?: () => void
  /** Chiamato dopo aver spostato lo storico (di default chiude il pannello). */
  onTransferred?: () => void
}

export function ExerciseForm({ initial, initialName = '', lookup, onClose, onSaved, onDeleted, onTransferred }: Props) {
  const isBuiltin = initial != null && BUILTIN_IDS.has(initial.id)
  const original = initial ? builtinById(initial.id) : undefined
  const [name, setName] = useState(initial?.name ?? initialName)
  const [muscle, setMuscle] = useState<Muscle>(initial?.muscle ?? 'Petto')
  const [kind, setKind] = useState<Kind>(initial?.kind ?? 'gym')
  const [measure, setMeasure] = useState<Measure>(initial?.measure ?? 'reps')
  const [equipment, setEquipment] = useState(initial?.equipment ?? '')
  const [transferring, setTransferring] = useState(false)

  const usage = useLiveQuery(() => (initial ? exerciseUsage(initial.id) : undefined), [initial?.id])

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
      ...(isBuiltin ? { edited: true } : { custom: true }),
    }
    await db.customExercises.put(ex)
    onSaved(ex)
  }

  async function remove() {
    if (!initial) return
    const msg = usage?.logs
      ? `«${initial.name}» è usato in ${usage.logs} allenamenti: lo storico resterà ma senza nome. Eliminarlo?\n\nSe vuoi conservare i progressi, usa prima «Sposta lo storico».`
      : `Eliminare «${initial.name}»?`
    if (!confirm(msg)) return
    await db.customExercises.delete(initial.id)
    onDeleted?.()
  }

  async function restore() {
    if (!initial || !original) return
    if (!confirm(`Ripristinare l'esercizio originale «${original.name}»? Lo storico resta collegato.`)) return
    await db.customExercises.delete(initial.id)
    onSaved(original)
  }

  async function transferTo(target: Exercise) {
    if (!initial) return
    setTransferring(false)
    if (target.id === initial.id) return
    const what = [
      usage?.logs ? `${usage.logs} allenamenti` : '',
      usage?.plans ? `${usage.plans} ${usage.plans === 1 ? 'scheda' : 'schede'}` : '',
    ]
      .filter(Boolean)
      .join(' e ')
    if (!confirm(`Spostare ${what || 'lo storico'} da «${initial.name}» a «${target.name}»?\n\nI progressi verranno uniti a quelli di «${target.name}».`)) return
    const r = await transferHistory(initial.id, target.id)
    toast(`Storico spostato su «${target.name}» (${r.logs} allenamenti)`)
    ;(onTransferred ?? onClose)()
  }

  if (transferring && lookup) {
    return (
      <ExercisePicker
        lookup={lookup}
        title="Sposta lo storico su…"
        onClose={() => setTransferring(false)}
        onPick={transferTo}
      />
    )
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
        {isBuiltin && (
          <div className="hint">
            Esercizio della libreria standard
            {initial?.edited && original && (
              <>
                {' '}
                (originale: <b>{original.name}</b>)
              </>
            )}
            . Puoi modificarlo liberamente: lo storico resta collegato e puoi sempre ripristinare l'originale.
          </div>
        )}
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
          <div className="hint">
            {usage && (usage.logs || usage.plans)
              ? `Usato in ${usage.logs} allenamenti e ${usage.plans} ${usage.plans === 1 ? 'scheda' : 'schede'}: le modifiche valgono anche lì. `
              : ''}
            Gli allenamenti già registrati mantengono la misura (ripetizioni o tempo) con cui li hai inseriti.
          </div>
        )}

        {initial && lookup && usage && (usage.logs > 0 || usage.plans > 0) && (
          <div className="card stack">
            <b>Sposta lo storico</b>
            <div className="small muted">
              Hai registrato questi allenamenti con l'esercizio sbagliato? Spostali (insieme alle schede) su un altro
              esercizio: i progressi si uniscono a quelli dell'esercizio scelto.
            </div>
            <button className="btn soft block" onClick={() => setTransferring(true)}>
              <Icon name="copy" /> Sposta su un altro esercizio
            </button>
          </div>
        )}

        {isBuiltin && initial?.edited && (
          <button className="btn block" onClick={restore}>
            Ripristina l'originale
          </button>
        )}
        {initial && !isBuiltin && (
          <button className="btn danger block" onClick={remove}>
            <Icon name="trash" /> Elimina esercizio
          </button>
        )}
      </div>
    </Sheet>
  )
}
