import { Icon } from './Icon'
import { MONTHS, WEEKDAYS, toISO, todayISO } from '../utils'

interface Props {
  month: Date // primo giorno del mese visualizzato
  selected: string
  marks: Map<string, 'done' | 'pending'>
  onSelect: (iso: string) => void
  onMonthChange: (d: Date) => void
}

export function Calendar({ month, selected, marks, onSelect, onMonthChange }: Props) {
  const y = month.getFullYear()
  const m = month.getMonth()
  const first = new Date(y, m, 1)
  const offset = (first.getDay() + 6) % 7 // lunedì = 0
  const start = new Date(y, m, 1 - offset)
  const weeks = Math.ceil((offset + new Date(y, m + 1, 0).getDate()) / 7)
  const today = todayISO()

  const days = Array.from({ length: weeks * 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })

  return (
    <div className="card">
      <div className="cal-head">
        <button className="icon-btn" aria-label="Mese precedente" onClick={() => onMonthChange(new Date(y, m - 1, 1))}>
          <Icon name="chevronLeft" />
        </button>
        <strong>
          {MONTHS[m]} {y}
        </strong>
        <button className="icon-btn" aria-label="Mese successivo" onClick={() => onMonthChange(new Date(y, m + 1, 1))}>
          <Icon name="chevronRight" />
        </button>
      </div>
      <div className="cal-grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="cal-wd">
            {w.charAt(0)}
          </div>
        ))}
        {days.map((d) => {
          const iso = toISO(d)
          const mark = marks.get(iso)
          const cls = [
            'cal-day',
            d.getMonth() !== m && 'out',
            iso === today && 'today',
            iso === selected && 'selected',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button
              key={iso}
              className={cls}
              onClick={() => {
                onSelect(iso)
                if (d.getMonth() !== m) onMonthChange(new Date(d.getFullYear(), d.getMonth(), 1))
              }}
            >
              {d.getDate()}
              {mark && <span className={`cal-dot ${mark === 'pending' ? 'pending' : ''}`} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
