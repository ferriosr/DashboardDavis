export default function RecCard({ aqi }) {
  let rec, bg, color, icon

  if (aqi > 150) {
    rec = '😷 Calidad del aire crítica. Evite actividades físicas y use purificadores de aire.'
    bg = 'var(--rec-danger-bg)'; color = '#C53030'; icon = '📢'
  } else if (aqi > 100) {
    rec = '⚠️ Nivel insalubre para grupos sensibles. Limiten el tiempo al aire libre.'
    bg = 'var(--rec-warn-bg)'; color = '#E65100'; icon = '📢'
  } else if (aqi > 50) {
    rec = '⚠️ Nivel moderado. Personas sensibles deben limitar actividades al aire libre.'
    bg = 'var(--rec-mod-bg)'; color = '#B45309'; icon = '📢'
  } else {
    rec = '✅ Calidad de aire excelente. El ambiente es seguro para todas las personas.'
    bg = 'var(--rec-good-bg)'; color = '#2F855A'; icon = '💡'
  }

  return (
    <div className="rec-card" style={{ background: bg, borderColor: `${color}33` }}>
      <div className="rec-icon">{icon}</div>
      <div>
        <div className="rec-label" style={{ color }}>Recomendación</div>
        <div className="rec-text">{rec}</div>
      </div>
    </div>
  )
}
