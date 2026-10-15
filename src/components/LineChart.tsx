import { useEffect, useRef, useState } from 'react'
import { formatDateShort, fromISO } from '../utils'

export interface Point {
  date: string
  value: number
}

interface Props {
  points: Point[]
  /** Formato delle etichette dell'asse Y. */
  format: (v: number) => string
  /** Formato dei valori (tooltip ed etichetta finale), con unità. */
  formatValue?: (v: number) => string
  height?: number
}

function niceStep(range: number, count: number): number {
  const raw = range / count
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const n = raw / mag
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag
}

function niceDomain(min: number, max: number): { lo: number; hi: number; ticks: number[] } {
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1
    min -= pad
    max += pad
  }
  const step = niceStep(max - min, 4)
  let lo = Math.floor(min / step) * step
  if (min >= 0 && lo < 0) lo = 0
  const hi = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000)
  return { lo, hi, ticks }
}

export function LineChart({ points, format, formatValue = format, height = 210 }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(340)
  const [active, setActive] = useState<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(240, e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => setActive(null), [points])

  if (!points.length) return null

  const padL = 40
  const padR = 16
  const padT = 22
  const padB = 26
  const w = width
  const h = height
  const innerW = w - padL - padR
  const innerH = h - padT - padB

  const ts = points.map((p) => fromISO(p.date).getTime())
  const t0 = ts[0]
  const t1 = ts[ts.length - 1]
  const values = points.map((p) => p.value)
  const { lo, hi, ticks } = niceDomain(Math.min(...values), Math.max(...values))

  const x = (i: number) => (t1 === t0 ? padL + innerW / 2 : padL + ((ts[i] - t0) / (t1 - t0)) * innerW)
  const y = (v: number) => padT + innerH - ((v - lo) / (hi - lo || 1)) * innerH

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join('')
  const area = `${line}L${x(points.length - 1).toFixed(1)},${padT + innerH}L${x(0).toFixed(1)},${padT + innerH}Z`
  const showDots = points.length <= 24
  const lastI = points.length - 1

  function pick(clientX: number) {
    const rect = ref.current!.getBoundingClientRect()
    const px = clientX - rect.left
    let best = 0
    let bestD = Infinity
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(x(i) - px)
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    setActive(best)
  }

  // Etichette dell'asse X: prima, ultima ed eventualmente quella centrale.
  const xLabels = t1 === t0 ? [0] : innerW > 260 && points.length > 2 ? [0, Math.floor(lastI / 2), lastI] : [0, lastI]
  const withYear = fromISO(points[0].date).getFullYear() !== fromISO(points[lastI].date).getFullYear()

  const a = active != null ? points[active] : null
  const tipX = active != null ? Math.min(Math.max(x(active), 70), w - 70) : 0

  return (
    <div
      className="chart"
      ref={ref}
      onPointerDown={(e) => pick(e.clientX)}
      onPointerMove={(e) => (e.pointerType === 'mouse' || e.buttons) && pick(e.clientX)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
    >
      <svg viewBox={`0 0 ${w} ${h}`} height={h} role="img" aria-label="Andamento nel tempo">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" className="axis-text">
              {format(t)}
            </text>
          </g>
        ))}
        {xLabels.map((i, k) => (
          <text
            key={i}
            x={x(i)}
            y={h - 6}
            textAnchor={xLabels.length === 1 ? 'middle' : k === 0 ? 'start' : k === xLabels.length - 1 ? 'end' : 'middle'}
            className="axis-text"
          >
            {formatDateShort(points[i].date, withYear)}
          </text>
        ))}
        <path d={area} fill="var(--accent)" opacity={0.1} />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {showDots &&
          points.map((p, i) => (
            <circle key={i} cx={x(i)} cy={y(p.value)} r={4} fill="var(--accent)" stroke="var(--card)" strokeWidth={2} />
          ))}
        {!showDots && <circle cx={x(lastI)} cy={y(points[lastI].value)} r={4} fill="var(--accent)" stroke="var(--card)" strokeWidth={2} />}
        {active == null && (
          <text
            x={Math.min(x(lastI), w - padR)}
            y={y(points[lastI].value) - 10}
            textAnchor={x(lastI) > w - 60 ? 'end' : 'middle'}
            className="end-label"
          >
            {formatValue(points[lastI].value)}
          </text>
        )}
        {a && active != null && (
          <g>
            <line x1={x(active)} x2={x(active)} y1={padT - 6} y2={padT + innerH} stroke="var(--text-3)" strokeWidth={1} />
            <circle cx={x(active)} cy={y(a.value)} r={6} fill="var(--accent)" stroke="var(--card)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {a && (
        <div className="chart-tip" style={{ left: tipX, top: -14 }}>
          <span className="k" />
          <b>{formatValue(a.value)}</b> · {formatDateShort(a.date, true)}
        </div>
      )}
    </div>
  )
}
