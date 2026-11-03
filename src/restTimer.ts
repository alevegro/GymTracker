import { useSyncExternalStore } from 'react'

/**
 * Timer di recupero globale: sopravvive alla chiusura dei pannelli, al cambio di schermata
 * e al ricaricamento della app (la scadenza è salvata come timestamp).
 */
export interface RestState {
  endAt: number | null // timestamp di fine, null = fermo
  duration: number // secondi totali (per la barra di avanzamento)
}

const KEY = 'gt-rest-timer'
const EX_KEY = 'gt-rest-by-exercise'

function load(): RestState {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '') as RestState
    // Un recupero finito da più di un minuto non ha più senso mostrarlo.
    if (s.endAt && s.endAt > Date.now() - 60_000) return s
  } catch {
    /* nessuno stato salvato */
  }
  return { endAt: null, duration: 0 }
}

let state: RestState = load()
const listeners = new Set<() => void>()

function set(next: RestState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage non disponibile */
  }
  listeners.forEach((l) => l())
}

export function useRestTimer(): RestState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

export function startRest(seconds: number) {
  unlockAudio()
  set({ endAt: Date.now() + seconds * 1000, duration: seconds })
}

export function addRest(seconds: number) {
  if (!state.endAt) return
  const endAt = Math.max(Date.now() + 1000, state.endAt + seconds * 1000)
  set({ endAt, duration: Math.max(1, state.duration + seconds) })
}

export function stopRest() {
  set({ endAt: null, duration: 0 })
}

// ---------- Recupero preferito per esercizio ----------

export function preferredRest(exerciseId: string): number | undefined {
  try {
    const map = JSON.parse(localStorage.getItem(EX_KEY) ?? '{}') as Record<string, number>
    return map[exerciseId]
  } catch {
    return undefined
  }
}

export function savePreferredRest(exerciseId: string, seconds: number) {
  try {
    const map = JSON.parse(localStorage.getItem(EX_KEY) ?? '{}') as Record<string, number>
    map[exerciseId] = seconds
    localStorage.setItem(EX_KEY, JSON.stringify(map))
  } catch {
    /* storage non disponibile */
  }
}

// ---------- Suono ----------

let audio: AudioContext | null = null

/** iOS permette l'audio solo se il contesto viene attivato da un tocco: lo facciamo all'avvio del timer. */
function unlockAudio() {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    audio = null
  }
}

export function beep() {
  try {
    navigator.vibrate?.([250, 120, 250])
    if (!audio) return
    if (audio.state === 'suspended') void audio.resume()
    const t0 = audio.currentTime
    for (let i = 0; i < 3; i++) {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.type = 'sine'
      osc.frequency.value = i === 2 ? 1320 : 880
      const t = t0 + i * 0.28
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.5, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + (i === 2 ? 0.5 : 0.18))
      osc.connect(gain).connect(audio.destination)
      osc.start(t)
      osc.stop(t + 0.55)
    }
  } catch {
    /* audio non disponibile */
  }
}
