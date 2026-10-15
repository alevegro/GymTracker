import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Icon } from '../components/Icon'
import { ExerciseForm } from '../components/ExerciseForm'
import { db, exportBackup, importBackup, requestPersistence } from '../db'
import { BUILTIN_EXERCISES } from '../exercises'
import { toast } from '../toast'
import { todayISO } from '../utils'

const BACKUP_KEY = 'gt-last-backup'

export function daysSinceBackup(): number | null {
  try {
    const v = localStorage.getItem(BACKUP_KEY)
    if (!v) return null
    return Math.floor((Date.now() - Number(v)) / 86400000)
  } catch {
    return null
  }
}

function markBackup() {
  try {
    localStorage.setItem(BACKUP_KEY, String(Date.now()))
  } catch {
    /* storage non disponibile */
  }
}

export function SettingsScreen() {
  const custom = useLiveQuery(() => db.customExercises.toArray(), [])
  const counts = useLiveQuery(async () => ({ logs: await db.logs.count(), plans: await db.plans.count() }), [])
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [creating, setCreating] = useState(false)
  const [lastBackup, setLastBackup] = useState(daysSinceBackup())
  const fileRef = useRef<HTMLInputElement>(null)

  const standalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true)

  useEffect(() => {
    requestPersistence().then(setPersisted)
  }, [])

  async function doExport() {
    const data = await exportBackup()
    const json = JSON.stringify(data, null, 1)
    const name = `gymtracker-backup-${todayISO()}.json`
    const file = new File([json], name, { type: 'application/json' })
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Backup GymTracker' })
        markBackup()
        setLastBackup(0)
        toast('Backup esportato')
        return
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    markBackup()
    setLastBackup(0)
    toast('Backup scaricato')
  }

  async function doImport(file: File) {
    try {
      const data = JSON.parse(await file.text())
      const hasData = (counts?.logs ?? 0) + (counts?.plans ?? 0) > 0
      let mode: 'replace' | 'merge' = 'replace'
      if (hasData) {
        const replace = confirm(
          'Vuoi SOSTITUIRE i dati attuali con quelli del backup?\n\nOK = sostituisci tutto\nAnnulla = aggiungi ai dati esistenti',
        )
        mode = replace ? 'replace' : 'merge'
      }
      await importBackup(data, mode)
      toast(mode === 'replace' ? 'Backup ripristinato' : 'Dati aggiunti dal backup')
    } catch (e) {
      alert(`Importazione non riuscita: ${(e as Error).message}`)
    }
  }

  async function deleteCustom(id: string, name: string) {
    const used = await db.logs.where('exerciseId').equals(id).count()
    const msg = used
      ? `«${name}» è usato in ${used} allenamenti: lo storico resterà ma senza nome. Eliminarlo?`
      : `Eliminare «${name}»?`
    if (confirm(msg)) await db.customExercises.delete(id)
  }

  async function wipe() {
    if (!confirm('Cancellare TUTTI i dati (allenamenti, schede, esercizi personalizzati)?')) return
    if (!confirm('Sei sicuro? Operazione irreversibile. Hai fatto un backup?')) return
    await Promise.all([db.logs.clear(), db.plans.clear(), db.customExercises.clear()])
    toast('Dati cancellati')
  }

  return (
    <div className="screen">
      <div className="title-row">
        <h1 className="large-title">Altro</h1>
      </div>

      <div className="section-title">Backup</div>
      <div className="card stack">
        <div className="small muted">
          I dati sono salvati solo su questo dispositivo. Esporta un backup regolarmente (es. su iCloud Drive con
          «Salva su File») per non perderli se cambi telefono o cancelli i dati di Safari.
        </div>
        <div className="small">
          Ultimo backup:{' '}
          <b>{lastBackup == null ? 'mai' : lastBackup === 0 ? 'oggi' : `${lastBackup} giorni fa`}</b>
          {counts && (
            <span className="muted">
              {' '}· {counts.logs} esercizi registrati, {counts.plans} schede
            </span>
          )}
        </div>
        <div className="btn-row">
          <button className="btn primary" onClick={doExport}>
            <Icon name="download" /> Esporta
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" /> Importa
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) doImport(f)
            e.target.value = ''
          }}
        />
      </div>

      <div className="section-title">I miei esercizi</div>
      <div className="list">
        {custom?.map((c) => (
          <div key={c.id} className="list-item">
            <div className="main">
              <div className="name">{c.name}</div>
              <div className="sub">
                {c.muscle} · {c.kind === 'gym' ? 'Palestra' : 'Corpo libero'} · {c.measure === 'time' ? 'a tempo' : 'ripetizioni'}
              </div>
            </div>
            <button className="icon-btn" aria-label={`Elimina ${c.name}`} onClick={() => deleteCustom(c.id, c.name)}>
              <Icon name="trash" />
            </button>
          </div>
        ))}
        <button className="list-item" onClick={() => setCreating(true)}>
          <div className="main" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            + Nuovo esercizio
          </div>
        </button>
      </div>
      <div className="small muted" style={{ margin: '8px 4px' }}>
        La libreria include {BUILTIN_EXERCISES.length} esercizi di palestra e corpo libero.
      </div>

      {!standalone && (
        <>
          <div className="section-title">Installa su iPhone</div>
          <div className="card small stack">
            <div>
              1. Apri questa pagina con <b>Safari</b>.
            </div>
            <div>
              2. Tocca il pulsante <b>Condividi</b> (il quadrato con la freccia).
            </div>
            <div>
              3. Scegli <b>Aggiungi alla schermata Home</b>.
            </div>
            <div className="muted">
              Così GymTracker si apre a schermo intero come un'app, funziona anche offline e i dati sono protetti dalla
              pulizia automatica di Safari.
            </div>
          </div>
        </>
      )}

      <div className="section-title">Archiviazione</div>
      <div className="card small">
        {persisted == null
          ? 'Verifica in corso…'
          : persisted
            ? '✓ Archiviazione persistente attiva: il sistema non cancellerà i dati per liberare spazio.'
            : "Archiviazione standard. Installa l'app sulla schermata Home e fai backup periodici."}
      </div>

      <div className="section-title">Zona pericolosa</div>
      <button className="btn danger block" style={{ background: 'var(--card)' }} onClick={wipe}>
        <Icon name="trash" /> Cancella tutti i dati
      </button>

      <div className="small center" style={{ color: 'var(--text-3)', marginTop: 24 }}>
        GymTracker · gratuito, offline, i tuoi dati restano tuoi
      </div>

      {creating && (
        <ExerciseForm
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            toast('Esercizio aggiunto alla libreria')
          }}
        />
      )}
    </div>
  )
}
