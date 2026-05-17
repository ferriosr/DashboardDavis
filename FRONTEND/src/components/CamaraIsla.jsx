import { useEffect, useState } from 'react'

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

  if (loading) return <div className="camera-loading">Cargando...</div>

  return (
    <div className="camera-dashboard">
      <div className="camera-hero">
        <div className="camera-hero-icon">📹</div>
        <h1 className="camera-title">Cámara Isla - Detección YOLO</h1>
        <p className="camera-subtitle">Video en vivo con inferencia en tiempo real</p>
      </div>

      <div className="camera-grid">
        {/* Tarjeta de Video en Vivo */}
        <div className="camera-card camera-video-card">
          <div className="camera-card-title">Video en Vivo</div>
          <div className="camera-feed-container">
            <iframe
              src="http://192.168.100.180:5000/video_feed"
              title="Video Isla"
              className="camera-stream"
              frameBorder="0"
              allowFullScreen
            />
          </div>
        </div>

        {/* Tarjeta de Metadatos */}
        <div className="camera-card">
        <div className="camera-card-title">Estado del Sistema</div>

        <div className="camera-metadata">
            {metadatos ? (
            <>
                {/* Cámara */}
                <div className="metadata-item">
                <span>Cámara:</span>

                <span className="status-badge status-online">
                    {metadatos.camera || 'Desconectada'}
                </span>
                </div>

                {/* Backend */}
                <div className="metadata-item">
                <span>Backend:</span>

                <span
                    className={`status-badge ${
                    metadatos.backend === 'online'
                        ? 'status-online'
                        : 'status-offline'
                    }`}
                >
                    {metadatos.backend || 'Desconectado'}
                </span>
                </div>

                {/* Personas detectadas */}
                <div className="metadata-item">
                <span>Personas detectadas:</span>

                <strong>
                    {metadatos.personas || 0}
                </strong>
                </div>

                {/* Presencia de cigarro */}
                <div className="metadata-item">
                <span>Cigarro detectado:</span>

                <span
                    className={`status-badge ${
                    metadatos.hay_cigarro
                        ? 'status-offline'
                        : 'status-online'
                    }`}
                >
                    {metadatos.hay_cigarro ? 'SÍ' : 'NO'}
                </span>
                </div>

                {/* Total detecciones */}
                <div className="metadata-item">
                <span>Total detecciones:</span>

                <strong>
                    {metadatos.detecciones_ultimas || 0}
                </strong>
                </div>

                {/* Fuente */}
                <div className="metadata-item">
                <span>Fuente:</span>

                <code>
                    {metadatos.fuente}
                </code>
                </div>
            </>
            ) : (
            <p>No hay datos disponibles</p>
            )}
        </div>
        </div>

        {/* Tarjeta de Detecciones */}
        <div className="camera-card">
          <div className="camera-card-title">Detecciones Recientes</div>
          <div className="camera-detecciones">
            {metadatos?.detecciones_ultimas > 0 ? (
              <div className="detecciones-list">
                <p className="detecciones-count">
                  {metadatos.detecciones_ultimas} objeto(s) detectado(s)
                </p>
                <div className="detecciones-info">
                  Los metadatos se envían automáticamente al backend cada 5
                  segundos.
                </div>
              </div>
            ) : (
              <p className="detecciones-empty">Sin detecciones en este momento</p>
            )}
          </div>
        </div>

        {/* Tarjeta de Flujo de Datos */}
        <div className="camera-card">
          <div className="camera-card-title">Flujo de Datos</div>
          <div className="camera-flow">
            <div className="flow-step">
              <div className="flow-icon">📷</div>
              <div>Captura local</div>
            </div>
            <div className="flow-arrow">→</div>
            <div className="flow-step">
              <div className="flow-icon">🤖</div>
              <div>YOLO Inference</div>
            </div>
            <div className="flow-arrow">→</div>
            <div className="flow-step">
              <div className="flow-icon">📡</div>
              <div>Backend</div>
            </div>
            <div className="flow-arrow">→</div>
            <div className="flow-step">
              <div className="flow-icon">📊</div>
              <div>Dashboard</div>
            </div>
          </div>
          <div className="flow-info">
            Metadatos cada 5s | Video cada 30s
          </div>
        </div>
      </div>

      {error && (
        <div className="camera-error">
          <div className="camera-error-title">Error de Conexión</div>
          <div className="camera-error-text">{error}</div>
          <div className="camera-error-hint">
            Asegúrate de que <code>cam_isla.py</code> esté corriendo en
            <code>http://192.168.100.180:5000</code> y el backend en
            <code>localhost:3001</code>
          </div>
        </div>
      )}

      <style jsx>{`
        .camera-dashboard {
          padding: 20px;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          min-height: 100vh;
        }

        .camera-hero {
          text-align: center;
          margin-bottom: 40px;
        }

        .camera-hero-icon {
          font-size: 3rem;
          margin-bottom: 10px;
        }

        .camera-title {
          font-size: 2.5rem;
          color: #00ff88;
          margin: 0 0 10px 0;
        }

        .camera-subtitle {
          font-size: 1.1rem;
          color: #aaa;
          margin: 0;
        }

        .camera-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .camera-video-card {
          grid-column: 1 / -1;
        }

        .camera-card {
          background: #0f1419;
          border: 2px solid #00ff88;
          border-radius: 10px;
          padding: 20px;
          color: #fff;
        }

        .camera-card-title {
          font-size: 1.3rem;
          font-weight: bold;
          color: #00ff88;
          margin-bottom: 15px;
          border-bottom: 2px solid #00ff88;
          padding-bottom: 10px;
        }

        .camera-feed-container {
          position: relative;
          width: 100%;
          padding-bottom: 75%;
          background: #000;
          border-radius: 8px;
          overflow: hidden;
        }

        .camera-stream {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
        }

        .camera-stream-fallback {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          color: #666;
          font-size: 0.9rem;
        }

        .camera-metadata {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .metadata-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          background: #1a1f2e;
          border-radius: 5px;
          font-size: 0.95rem;
        }

        .metadata-item span:first-child {
          color: #aaa;
          font-weight: 600;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: bold;
        }

        .status-online {
          background: #00ff88;
          color: #000;
        }

        .status-offline {
          background: #ff4444;
          color: #fff;
        }

        code {
          background: #1a1f2e;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: monospace;
          font-size: 0.9rem;
          color: #00ff88;
        }

        .camera-detecciones {
          text-align: center;
        }

        .detecciones-list {
          padding: 15px;
          background: #1a1f2e;
          border-radius: 8px;
        }

        .detecciones-count {
          font-size: 1.5rem;
          color: #00ff88;
          margin: 0 0 10px 0;
          font-weight: bold;
        }

        .detecciones-info {
          font-size: 0.85rem;
          color: #999;
        }

        .detecciones-empty {
          color: #666;
          font-style: italic;
          padding: 20px;
        }

        .camera-flow {
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding: 15px;
          background: #1a1f2e;
          border-radius: 8px;
          overflow-x: auto;
        }

        .flow-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          min-width: 80px;
        }

        .flow-icon {
          font-size: 1.8rem;
        }

        .flow-step div:last-child {
          font-size: 0.8rem;
          color: #aaa;
          text-align: center;
        }

        .flow-arrow {
          color: #00ff88;
          font-weight: bold;
          margin: 0 5px;
        }

        .flow-info {
          text-align: center;
          font-size: 0.85rem;
          color: #999;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #333;
        }

        .camera-error {
          background: #ff4444;
          border: 2px solid #ff0000;
          border-radius: 10px;
          padding: 20px;
          margin-top: 30px;
          color: #fff;
        }

        .camera-error-title {
          font-size: 1.3rem;
          font-weight: bold;
          margin-bottom: 10px;
        }

        .camera-error-text {
          margin-bottom: 10px;
        }

        .camera-error-hint {
          font-size: 0.9rem;
          background: rgba(0, 0, 0, 0.3);
          padding: 10px;
          border-radius: 5px;
        }

        .camera-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          font-size: 1.5rem;
          color: #00ff88;
        }

        @media (max-width: 768px) {
          .camera-grid {
            grid-template-columns: 1fr;
          }

          .camera-flow {
            flex-wrap: wrap;
          }

          .camera-title {
            font-size: 1.8rem;
          }
        }
      `}</style>
    </div>
  )
}
