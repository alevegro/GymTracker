import Dexie, { type Table } from 'dexie'
import type { Exercise, LogEntry, Plan } from './types'

class GymDB extends Dexie {
  logs!: Table<LogEntry, number>
  plans!: Table<Plan, number>
  customExercises!: Table<Exercise, string>

  constructor() {
    super('gymtracker')
    this.version(1).stores({
      logs: '++id, date, exerciseId, createdAt, [exerciseId+date]',
      plans: '++id, active',
      customExercises: 'id',
    })
  }
}

export const db = new GymDB()

/** Chiede al browser di non cancellare i dati in caso di poco spazio. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}

export interface Backup {
  app: 'gymtracker'
  version: 1
  exportedAt: string
  logs: LogEntry[]
  plans: Plan[]
  customExercises: Exercise[]
}

export async function exportBackup(): Promise<Backup> {
  const [logs, plans, customExercises] = await Promise.all([
    db.logs.toArray(),
    db.plans.toArray(),
    db.customExercises.toArray(),
  ])
  return { app: 'gymtracker', version: 1, exportedAt: new Date().toISOString(), logs, plans, customExercises }
}

export async function importBackup(data: unknown, mode: 'replace' | 'merge'): Promise<void> {
  const b = data as Partial<Backup>
  if (!b || b.app !== 'gymtracker' || !Array.isArray(b.logs) || !Array.isArray(b.plans)) {
    throw new Error('File di backup non valido')
  }
  await db.transaction('rw', db.logs, db.plans, db.customExercises, async () => {
    if (mode === 'replace') {
      await Promise.all([db.logs.clear(), db.plans.clear(), db.customExercises.clear()])
      await db.logs.bulkAdd(b.logs!)
      await db.plans.bulkAdd(b.plans!)
    } else {
      // In unione gli ID vengono rigenerati per non sovrascrivere i dati esistenti.
      await db.logs.bulkAdd(b.logs!.map(({ id: _id, ...rest }) => rest))
      await db.plans.bulkAdd(b.plans!.map(({ id: _id, ...rest }) => ({ ...rest, active: 0 })))
    }
    await db.customExercises.bulkPut(b.customExercises ?? [])
  })
}
