import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles.css'

registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    // Su iPhone la app installata resta "sospesa" in memoria: controlliamo gli aggiornamenti
    // ogni volta che torna in primo piano, non solo all'avvio.
    const check = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) void registration.update().catch(() => {})
    }
    document.addEventListener('visibilitychange', check)
    setInterval(check, 60 * 60 * 1000)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
