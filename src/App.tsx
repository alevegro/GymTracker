import { useEffect, useState } from 'react'
import { Icon } from './components/Icon'
import { useExercises } from './hooks'
import { requestPersistence } from './db'
import { DiaryScreen } from './screens/DiaryScreen'
import { PlansScreen } from './screens/PlansScreen'
import { ProgressScreen } from './screens/ProgressScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { todayISO } from './utils'

type Tab = 'diary' | 'plans' | 'progress' | 'settings'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'diary', label: 'Diario', icon: 'calendar' },
  { id: 'plans', label: 'Scheda', icon: 'clipboard' },
  { id: 'progress', label: 'Progressi', icon: 'chart' },
  { id: 'settings', label: 'Altro', icon: 'more' },
]

function initialTab(): Tab {
  try {
    const t = sessionStorage.getItem('gt-tab') as Tab | null
    return t && TABS.some((x) => x.id === t) ? t : 'diary'
  } catch {
    return 'diary'
  }
}

export default function App() {
  const lookup = useExercises()
  const [tab, setTab] = useState<Tab>(initialTab)
  const [date, setDate] = useState(todayISO)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  // Cambiando chiave si rimonta il diario (per sincronizzare il mese visualizzato).
  const [diaryKey, setDiaryKey] = useState(0)

  useEffect(() => {
    requestPersistence()
  }, [])

  useEffect(() => {
    try {
      sessionStorage.setItem('gt-tab', tab)
    } catch {
      /* ignora */
    }
    window.scrollTo(0, 0)
  }, [tab])

  useEffect(() => {
    let timer: number | undefined
    const onToast = (e: Event) => {
      setToastMsg((e as CustomEvent<string>).detail)
      clearTimeout(timer)
      timer = window.setTimeout(() => setToastMsg(null), 2600)
    }
    window.addEventListener('app-toast', onToast)
    return () => window.removeEventListener('app-toast', onToast)
  }, [])

  return (
    <>
      {tab === 'diary' && <DiaryScreen key={diaryKey} lookup={lookup} date={date} setDate={setDate} goTo={setTab} />}
      {tab === 'plans' && (
        <PlansScreen
          lookup={lookup}
          onStarted={(d) => {
            setDate(d)
            setDiaryKey((k) => k + 1)
            setTab('diary')
          }}
        />
      )}
      {tab === 'progress' && <ProgressScreen lookup={lookup} />}
      {tab === 'settings' && <SettingsScreen />}

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} />
            {t.label}
          </button>
        ))}
      </nav>
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </>
  )
}
