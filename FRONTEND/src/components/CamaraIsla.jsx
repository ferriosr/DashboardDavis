import { useEffect, useState } from 'react'
import { Video, Camera, Bot, Radio, BarChart2, AlertCircle } from 'lucide-react'

export default function CamaraIslaDashboard() {
  const [videoData, setVideoData] = useState(null)
  const [detecciones, setDetecciones] = useState([])
  const [metadatos, setMetadatos] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener metadatos de la cámara
        const metaRes = await fetch('http://192.168.100.180:5000/status') // Cambiar por la IP de la isla
        if (metaRes.ok) {
          const metaData = await metaRes.json()
          setMetadatos(metaData)
        }
        setLoading(false)
      } catch (err) {
        console.error('Error al obtener datos:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return (
    <div className="cam-loading">
      <div className="cam-loading-spinner" />
      <span className="cam-loading-text">Conectando con la cámara...</span>
    </div>
  )

  return (
    <div className="cam-page">

      {/* ── Hero ── */}
      <div className="cam-hero">
        <div className="cam-hero-icon">
          <Video size={28} />
        </div>
        <div className="cam-hero-text">
          <h1 className="cam-hero-title">Cámara Isla</h1>
          <p className="cam-hero-sub">Detección YOLO · Inferencia en tiempo real</p>
        </div>
        <span className="cam-live-badge">EN VIVO</span>
      </div>

      {/* ── Grid ── */}
      <div className="cam-grid">

        {/* Video en Vivo – ancho completo */}
        <div className="cam-card cam-card-full">
          <div className="cam-card-header">
            <span className="cam-card-title">Video en Vivo</span>
            <span className="cam-pill cam-pill-blue">192.168.100.180</span>
          </div>
          <div className="cam-feed-wrap">
            <iframe
              src="http://192.168.100.180:5000/video_feed"
              title="Video Isla"
              className="cam-stream"
              frameBorder="0"
              allowFullScreen
            />
          </div>
        </div>

        {/* Estado del Sistema */}
        <div className="cam-card">
          <div className="cam-card-header">
            <span className="cam-card-title">Estado del Sistema</span>
          </div>
          <div className="cam-meta-list">
            {metadatos ? (
              <>
                <div className="cam-meta-row">
                  <span className="cam-meta-label">Cámara</span>
                  <span className="cam-status-badge cam-status-online">
                    {metadatos.camera || 'Desconectada'}
                  </span>
                </div>

                <div className="cam-meta-row">
                  <span className="cam-meta-label">Backend</span>
                  <span className={`cam-status-badge ${metadatos.backend === 'online' ? 'cam-status-online' : 'cam-status-offline'}`}>
                    {metadatos.backend || 'Desconectado'}
                  </span>
                </div>

                <div className="cam-meta-row">
                  <span className="cam-meta-label">Personas detectadas</span>
                  <strong className="cam-meta-value">{metadatos.personas || 0}</strong>
                </div>

                <div className="cam-meta-row">
                  <span className="cam-meta-label">Cigarro detectado</span>
                  <span className={`cam-status-badge ${metadatos.hay_cigarro ? 'cam-status-offline' : 'cam-status-online'}`}>
                    {metadatos.hay_cigarro ? 'SÍ' : 'NO'}
                  </span>
                </div>

                <div className="cam-meta-row">
                  <span className="cam-meta-label">Total detecciones</span>
                  <strong className="cam-meta-value">{metadatos.detecciones_ultimas || 0}</strong>
                </div>

                <div className="cam-meta-row">
                  <span className="cam-meta-label">Fuente</span>
                  <code className="cam-code">{metadatos.fuente}</code>
                </div>
              </>
            ) : (
              <p className="cam-empty">Sin datos disponibles</p>
            )}
          </div>
        </div>

        {/* Detecciones Recientes */}
        <div className="cam-card">
          <div className="cam-card-header">
            <span className="cam-card-title">Detecciones Recientes</span>
          </div>
          <div className="cam-detections-body">
            {metadatos?.detecciones_ultimas > 0 ? (
              <div className="cam-detections-found">
                <span className="cam-detections-count">{metadatos.detecciones_ultimas}</span>
                <span className="cam-detections-label">objeto(s) detectado(s)</span>
                <p className="cam-detections-sub">
                  Los metadatos se envían automáticamente al backend cada 5 segundos.
                </p>
              </div>
            ) : (
              <p className="cam-empty">Sin detecciones en este momento</p>
            )}
          </div>
        </div>

        {/* Flujo de Datos */}
        <div className="cam-card">
          <div className="cam-card-header">
            <span className="cam-card-title">Flujo de Datos</span>
          </div>
          <div className="cam-flow">
            <div className="cam-flow-step">
              <div className="cam-flow-icon"><Camera size={22} /></div>
              <span>Captura</span>
            </div>
            <div className="cam-flow-arrow">→</div>
            <div className="cam-flow-step">
              <div className="cam-flow-icon"><Bot size={22} /></div>
              <span>YOLO</span>
            </div>
            <div className="cam-flow-arrow">→</div>
            <div className="cam-flow-step">
              <div className="cam-flow-icon"><Radio size={22} /></div>
              <span>Backend</span>
            </div>
            <div className="cam-flow-arrow">→</div>
            <div className="cam-flow-step">
              <div className="cam-flow-icon"><BarChart2 size={22} /></div>
              <span>Dashboard</span>
            </div>
          </div>
          <div className="cam-flow-footer">Metadatos cada 5s · Video cada 30s</div>
        </div>

      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="cam-error">
          <AlertCircle size={20} className="cam-error-icon" />
          <div>
            <div className="cam-error-title">Error de Conexión</div>
            <div className="cam-error-text">{error}</div>
            <div className="cam-error-hint">
              Asegúrate de que <code>cam_isla.py</code> esté corriendo en{' '}
              <code>http://192.168.100.180:5000</code> y el backend en{' '}
              <code>localhost:3001</code>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
