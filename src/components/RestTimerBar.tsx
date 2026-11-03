import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { addRest, beep, stopRest, useRestTimer } from '../restTimer'

function fmt(sec: number) {
  const s = Math.max(0, Math.ceil(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Barra flottante del recupero, visibile sopra a tutte le schermate e ai pannelli. */
export function RestTimerBar() {
  const { endAt, duration } = useRestTimer()
  const [now, setNow] = useState(Date.now)
  const beeped = useRef<number | null>(null)

  useEffect(() => {
    if (!endAt) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    setNow(Date.now())
    return () => clearInterval(id)
  }, [endAt])

  const remaining = endAt ? (endAt - now) / 1000 : 0
  const finished = endAt != null && remaining <= 0

  // Suono alla fine, una sola volta per ogni recupero.
  useEffect(() => {
    if (finished && beeped.current !== endAt) {
      beeped.current = endAt
      // Se la app era chiusa quando il recupero è finito, niente suono in ritardo.
      if (now - endAt! < 5000) beep()
    }
  }, [finished, endAt, now])

  // Il recupero finito sparisce da solo dopo qualche secondo.
  useEffect(() => {
    if (!finished) return
    const id = window.setTimeout(stopRest, 8000)
    return () => clearTimeout(id)
  }, [finished])

  // Tiene acceso lo schermo durante il recupero (dove supportato).
  useEffect(() => {
    if (!endAt || finished || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = () =>
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (cancelled) void l.release()
          else lock = l
        })
        .catch(() => {})
    const onVisible = () => document.visibilityState === 'visible' && acquire()
    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release().catch(() => {})
    }
  }, [endAt, finished])

  useEffect(() => {
    document.body.classList.toggle('timer-on', endAt != null)
  }, [endAt])

  if (!endAt) return null

  const progress = duration ? Math.min(1, Math.max(0, 1 - remaining / duration)) : 1

  if (finished) {
    return (
      <button className="rest-bar done" onClick={stopRest} aria-live="assertive">
        <Icon name="check" />
        <span style={{ flex: 1, textAlign: 'left' }}>
          <b>Recupero finito!</b>
          <span className="small"> Via con la prossima serie</span>
        </span>
        <Icon name="close" />
      </button>
    )
  }

  return (
    <div className="rest-bar" role="timer" aria-label="Recupero">
      <div className="rest-progress" style={{ width: `${progress * 100}%` }} />
      <div className="rest-label">
        <span className="small">Recupero</span>
        <b>{fmt(remaining)}</b>
      </div>
      <button className="rest-btn" onClick={() => addRest(-15)} aria-label="Togli 15 secondi">
        −15
      </button>
      <button className="rest-btn" onClick={() => addRest(15)} aria-label="Aggiungi 15 secondi">
        +15
      </button>
      <button className="rest-btn icon" onClick={stopRest} aria-label="Ferma il recupero">
        <Icon name="close" />
      </button>
    </div>
  )
}
