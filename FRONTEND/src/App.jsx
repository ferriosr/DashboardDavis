import { useState, useEffect, useCallback } from 'react'
import { useAirQuality } from './hooks/useAirQuality'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import MetricCard from './components/MetricCard'
import RecCard from './components/RecCard'
import TrendChart from './components/TrendChart'
import DetailModal from './components/DetailModal'
import NotificationsPanel from './components/NotificationsPanel'
import Modelo from './pages/Modelo'
import {
  aqiColor, aqiLabel,
  pm25Color, pm25Label,
  pm10Color, pm10Label,
  humColor, humLabel,
  tempColor, tempLabel,
} from './utils/aqi'

export default function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme') || 'light'
    document.documentElement.setAttribute('data-theme', saved)
    return saved
  })
  const [modalType, setModalType] = useState(null)
  const [showNotifs, setShowNotifs] = useState(false)
  const [currentPage, setCurrentPage] = useState('dashboard')

  const {
    data,
    history,
    lastTs,
    reloading,
    notifications,
    reload,
    markAllRead,
    clearAll,
  } = useAirQuality()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', next)
      return next
    })
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleBellClick = useCallback(() => {
    setShowNotifs(true)
    markAllRead()
  }, [markAllRead])

  return (
    <div className="app-layout">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="dashboard">
      <Header
        lastTs={lastTs}
        theme={theme}
        onToggleTheme={toggleTheme}
        onReload={reload}
        reloading={reloading}
        unreadCount={unreadCount}
        onOpenNotifications={handleBellClick}
      />

      {currentPage === 'modelo' && <Modelo />}

      {currentPage === 'dashboard' && (
      <>
      <div className="cards-row row-sensors">
        <MetricCard
          title="AQI" subtitle="Calidad del Aire"
          value={Math.round(data.aqi)} unit=""
          color={aqiColor(data.aqi)} badge={aqiLabel(data.aqi)}
          emoji="🍃" onClick={() => setModalType('aqi')}
        />
        <MetricCard
          title="Humedad" subtitle="Humedad Relativa"
          value={Math.round(data.humedad)} unit="%"
          color={humColor(data.humedad)} badge={humLabel(data.humedad)}
          emoji="💧" onClick={() => setModalType('humedad')}
        />
        <MetricCard
          title="Temp." subtitle="Grados Celsius"
          value={data.temperatura.toFixed(1)} unit="°C"
          color={tempColor(data.temperatura)} badge={tempLabel(data.temperatura)}
          emoji="🌡️" onClick={() => setModalType('temperatura')}
        />
      </div>

      <RecCard aqi={data.aqi} />

      <div className="cards-row row-particles">
        <MetricCard
          title="PM 2.5" subtitle="Partículas Finas"
          value={data.pm25.toFixed(1)} unit=" µg/m³"
          color={pm25Color(data.pm25)} badge={pm25Label(data.pm25)}
          emoji="🌫️" onClick={() => setModalType('pm25')}
        />
        <MetricCard
          title="PM 10" subtitle="Partículas Gruesas"
          value={data.pm10.toFixed(1)} unit=" µg/m³"
          color={pm10Color(data.pm10)} badge={pm10Label(data.pm10)}
          emoji="☁️" onClick={() => setModalType('pm10')}
        />
      </div>

      <div className="cards-row row-alerts">
        <div className="card card-muted">
          <div className="card-content">
            <div className="card-title">Humo</div>
            <div className="card-subtitle">De Tabaco</div>
            <div className="card-value" style={{ color: 'var(--text-muted)' }}>--</div>
            <div className="card-badge badge-muted">En proceso de conexión</div>
          </div>
          <div className="card-emoji">🚭</div>
        </div>
        <div className="card card-muted">
          <div className="card-content">
            <div className="card-title">Personas</div>
            <div className="card-subtitle">Ocupación</div>
            <div className="card-value" style={{ color: 'var(--text-muted)' }}>
              -- <span className="card-value-sub">Detectadas</span>
            </div>
            <div className="card-badge badge-muted">En proceso de conexión</div>
          </div>
          <div className="card-emoji">👥</div>
        </div>
      </div>

      <TrendChart history={history} theme={theme} />

      <div className="footer">Davis AirLink · WeatherLink API · UrbanDataIsland</div>

      {modalType && (
        <DetailModal
          type={modalType}
          data={data}
          onClose={() => setModalType(null)}
        />
      )}

      {showNotifs && (
        <NotificationsPanel
          notifications={notifications}
          onClose={() => setShowNotifs(false)}
          onMarkRead={markAllRead}
          onClear={clearAll}
        />
      )}
      </>
      )}
    </div>
    </div>
  )
}
