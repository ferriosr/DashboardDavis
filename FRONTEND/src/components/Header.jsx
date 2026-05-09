function formatTs(isoStr) {
  if (!isoStr) return '--'
  const [date, time] = isoStr.split(' ')
  if (!date) return '--'
  const [y, m, d] = date.split('-')
  const hhmm = time ? time.slice(0, 5) : '--:--'
  return `${d}/${m}/${y} ${hhmm}`
}

export default function Header({ lastTs, theme, onToggleTheme, onReload, reloading, unreadCount, onOpenNotifications }) {
  return (
    <div className="header">
      <div className="header-brand">
        <div className="header-icon">🍃</div>
        <div>
          <div className="header-title">Estado del Ambiente</div>
          <div className="header-subtitle">📡 Monitoreo en Tiempo Real</div>
        </div>
      </div>

      <div className="header-controls">
        <button
          className="ctrl-btn"
          onClick={onReload}
          disabled={reloading}
          title="Recargar datos"
        >
          <span className={`btn-icon${reloading ? ' spinning' : ''}`}>🔄</span>
        </button>

        <button
          className="ctrl-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          <span className="btn-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
        </button>

        <button
          className="ctrl-btn"
          onClick={onOpenNotifications}
          title="Notificaciones"
        >
          <span className="btn-icon">🔔</span>
          {unreadCount > 0 && (
            <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>
      </div>

      <div className="header-time">
        <span className="header-time-label">{lastTs ? 'En vivo ●' : 'Última lectura'}</span>
        <span className="header-time-value">{formatTs(lastTs)}</span>
      </div>
    </div>
  )
}
