import type { ReactNode } from 'react'
import { useBodyLock } from '../hooks'

interface Props {
  title: string
  onClose: () => void
  closeLabel?: string
  right?: ReactNode
  footer?: ReactNode
  children: ReactNode
}

export function Sheet({ title, onClose, closeLabel = 'Chiudi', right, footer, children }: Props) {
  useBodyLock()
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-head">
          <div>
            <button className="link" onClick={onClose}>
              {closeLabel}
            </button>
          </div>
          <h2>{title}</h2>
          <div className="right">{right}</div>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </>
  )
}
