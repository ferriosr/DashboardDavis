import { useState, useEffect } from 'react'
import { fetchRecomendacion } from '../api/davis'

const POLL_MS = 30_000

const NIVEL_STYLE = {
  0: { bg: 'var(--rec-good-bg)',    color: '#2F855A' },
  1: { bg: 'var(--rec-mod-bg)',     color: '#B45309' },
  2: { bg: 'var(--rec-warn-bg)',    color: '#E65100' },
  3: { bg: 'var(--rec-danger-bg)',  color: '#C53030' },
}

function fallbackFromAqi(aqi) {
  if (aqi > 150) return { nivel: 3, msg: 'Calidad del aire crítica. Evite actividades físicas y use purificadores de aire.' }
  if (aqi > 100) return { nivel: 2, msg: 'Nivel insalubre para grupos sensibles. Limiten el tiempo al aire libre.' }
  if (aqi > 50)  return { nivel: 1, msg: 'Nivel moderado. Personas sensibles deben limitar actividades al aire libre.' }
  return           { nivel: 0, msg: 'Calidad de aire excelente. El ambiente es seguro para todas las personas.' }
}

export default function RecCard({ aqi }) {
  const [rec, setRec] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await fetchRecomendacion()
        if (!cancelled) setRec(data)
      } catch {
        if (!cancelled) setRec(null)
      }
    }
    load()
    const id = setInterval(load, POLL_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  if (rec) {
    const nivel = Math.min(rec.nivel_alerta, 3)
    const { bg, color } = NIVEL_STYLE[nivel]
    const iconoTendencia = rec.icono_tendencia ?? '→'
    const delta = rec.delta_pm25 != null ? rec.delta_pm25.toFixed(1) : null

    return (
      <div className="rec-card" style={{ background: bg, borderColor: `${color}33` }}>
        <div className="rec-icon">📢</div>
        <div className="rec-body">
          <div className="rec-label" style={{ color }}>
            Recomendación · {rec.banda_nombre}
            {delta !== null && (
              <span className="rec-tendencia" style={{ color }}>
                {iconoTendencia} {delta > 0 ? '+' : ''}{delta} µg/m³
              </span>
            )}
          </div>
          <div className="rec-text">{rec.mensaje_general}</div>
          {rec.mensaje_expuesto && rec.nivel_alerta >= 1 && (
            <div className="rec-exposed" style={{ color }}>{rec.mensaje_expuesto}</div>
          )}
          {rec.contexto_activo && (
            <div className="rec-contexto">{rec.contexto_activo}</div>
          )}
        </div>
      </div>
    )
  }

  // Fallback AQI estático mientras la API no responde
  const { nivel, msg } = fallbackFromAqi(aqi)
  const { bg, color } = NIVEL_STYLE[nivel]
  const icon = nivel === 0 ? '💡' : '📢'

  return (
    <div className="rec-card" style={{ background: bg, borderColor: `${color}33` }}>
      <div className="rec-icon">{icon}</div>
      <div className="rec-body">
        <div className="rec-label" style={{ color }}>Recomendación</div>
        <div className="rec-text">{msg}</div>
      </div>
    </div>
  )
}
