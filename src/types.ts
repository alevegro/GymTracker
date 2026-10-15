export type Measure = 'reps' | 'time'
export type Kind = 'gym' | 'calisthenics'

export const MUSCLES = [
  'Petto',
  'Dorso',
  'Spalle',
  'Bicipiti',
  'Tricipiti',
  'Avambracci',
  'Quadricipiti',
  'Femorali',
  'Glutei',
  'Polpacci',
  'Addome',
  'Skill',
  'Full body',
  'Cardio',
] as const
export type Muscle = (typeof MUSCLES)[number]

export interface Exercise {
  id: string
  name: string
  muscle: Muscle
  kind: Kind
  measure: Measure
  equipment: string
  custom?: boolean
}

/** Una serie: ripetizioni oppure tempo (in secondi), più il carico in kg (0 = corpo libero). */
export interface SetEntry {
  reps?: number
  seconds?: number
  weight: number
}

/** Un esercizio svolto in un certo giorno. */
export interface LogEntry {
  id?: number
  date: string // YYYY-MM-DD
  exerciseId: string
  measure: Measure
  sets: SetEntry[]
  note?: string
  /** Creato dalla scheda e non ancora confermato: escluso dai progressi. */
  pending?: boolean
  createdAt: number
}

export interface PlanExercise {
  exerciseId: string
  measure: Measure
  sets: number
  reps?: number
  repsMax?: number
  seconds?: number
  weight?: number
  rest?: number // secondi
  note?: string
}

export interface PlanDay {
  id: string
  name: string
  exercises: PlanExercise[]
}

export interface Plan {
  id?: number
  name: string
  notes?: string
  active: number // 1 = scheda attiva (numero per poterlo indicizzare)
  days: PlanDay[]
  createdAt: number
}
