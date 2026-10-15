import Dexie from 'dexie'
import { db } from './db'
import type { LogEntry, Plan, PlanDay, PlanExercise, SetEntry } from './types'
import { formatDuration, fmtNum } from './utils'

export function formatTarget(pe: PlanExercise): string {
  const amount =
    pe.measure === 'time'
      ? formatDuration(pe.seconds ?? 0)
      : pe.repsMax && pe.repsMax !== pe.reps
        ? `${pe.reps ?? '?'}–${pe.repsMax}`
        : String(pe.reps ?? '?')
  const base = `${pe.sets} × ${amount}`
  return pe.weight ? `${base} · ${fmtNum(pe.weight)} kg` : base
}

/** Carico usato nell'ultima sessione confermata di un esercizio (serie più pesante). */
async function lastWeight(exerciseId: string): Promise<number | undefined> {
  const last = await db.logs
    .where('[exerciseId+date]')
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
    .reverse()
    .filter((l) => !l.pending)
    .first()
  if (!last) return undefined
  return Math.max(...last.sets.map((s) => s.weight || 0))
}

/** Crea nel diario gli esercizi di un giorno della scheda, da confermare/compilare. */
export async function startPlanDay(day: PlanDay, date: string): Promise<number> {
  const now = Date.now()
  const entries: LogEntry[] = []
  for (const [i, pe] of day.exercises.entries()) {
    const weight = pe.weight ?? (await lastWeight(pe.exerciseId)) ?? 0
    const set: SetEntry = pe.measure === 'time' ? { seconds: pe.seconds ?? 30, weight } : { reps: pe.reps ?? 10, weight }
    entries.push({
      date,
      exerciseId: pe.exerciseId,
      measure: pe.measure,
      sets: Array.from({ length: Math.max(1, pe.sets) }, () => ({ ...set })),
      note: pe.note,
      pending: true,
      createdAt: now + i,
    })
  }
  await db.logs.bulkAdd(entries)
  return entries.length
}

export async function setActivePlan(id: number) {
  await db.transaction('rw', db.plans, async () => {
    await db.plans.toCollection().modify({ active: 0 })
    await db.plans.update(id, { active: 1 })
  })
}

export function sortPlans(plans: Plan[]): Plan[] {
  return [...plans].sort((a, b) => b.active - a.active || b.createdAt - a.createdAt)
}
