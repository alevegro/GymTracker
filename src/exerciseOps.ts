import { db } from './db'
import { preferredRest, savePreferredRest } from './restTimer'

/**
 * Sposta tutto lo storico (e i riferimenti nelle schede) da un esercizio a un altro.
 * Ogni allenamento mantiene la propria misura (ripetizioni o tempo).
 */
export async function transferHistory(fromId: string, toId: string): Promise<{ logs: number; plans: number }> {
  if (fromId === toId) return { logs: 0, plans: 0 }
  let logs = 0
  let plans = 0
  await db.transaction('rw', db.logs, db.plans, async () => {
    logs = await db.logs.where('exerciseId').equals(fromId).modify({ exerciseId: toId })
    for (const p of await db.plans.toArray()) {
      let changed = false
      const days = p.days.map((d) => ({
        ...d,
        exercises: d.exercises.map((e) => {
          if (e.exerciseId !== fromId) return e
          changed = true
          return { ...e, exerciseId: toId }
        }),
      }))
      if (changed) {
        plans++
        await db.plans.put({ ...p, days })
      }
    }
  })
  const rest = preferredRest(fromId)
  if (rest != null && preferredRest(toId) == null) savePreferredRest(toId, rest)
  return { logs, plans }
}

/** Quante volte un esercizio compare nel diario e nelle schede. */
export async function exerciseUsage(id: string): Promise<{ logs: number; plans: number }> {
  const logs = await db.logs.where('exerciseId').equals(id).count()
  const plans = (await db.plans.toArray()).filter((p) =>
    p.days.some((d) => d.exercises.some((e) => e.exerciseId === id)),
  ).length
  return { logs, plans }
}
