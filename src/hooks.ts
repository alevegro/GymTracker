import { useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { BUILTIN_EXERCISES } from './exercises'
import type { Exercise } from './types'

const UNKNOWN: Exercise = {
  id: '?',
  name: 'Esercizio eliminato',
  muscle: 'Full body',
  kind: 'gym',
  measure: 'reps',
  equipment: '',
}

export function useExercises() {
  const custom = useLiveQuery(() => db.customExercises.toArray(), [], [] as Exercise[])
  return useMemo(() => {
    const list = [...BUILTIN_EXERCISES, ...custom].sort((a, b) => a.name.localeCompare(b.name, 'it'))
    const map = new Map(list.map((e) => [e.id, e]))
    const get = (id: string): Exercise => map.get(id) ?? { ...UNKNOWN, id }
    return { list, get }
  }, [custom])
}

export type ExerciseLookup = ReturnType<typeof useExercises>

/** Blocca lo scroll della pagina sotto ai pannelli a schermo intero. */
let locks = 0
export function useBodyLock() {
  useEffect(() => {
    locks++
    document.body.classList.add('locked')
    return () => {
      locks--
      if (locks === 0) document.body.classList.remove('locked')
    }
  }, [])
}
