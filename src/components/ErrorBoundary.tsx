import { Component, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="screen">
        <div className="card empty">
          <strong>Qualcosa è andato storto</strong>
          I tuoi dati sono al sicuro. Ricarica l'app per continuare.
          <div className="small" style={{ marginTop: 10, color: 'var(--text-3)' }}>
            {this.state.error.message}
          </div>
          <div style={{ marginTop: 14 }}>
            <button className="btn primary" onClick={() => location.reload()}>
              Ricarica
            </button>
          </div>
        </div>
      </div>
    )
  }
}
