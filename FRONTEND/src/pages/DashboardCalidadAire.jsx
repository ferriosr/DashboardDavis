import { useState, useEffect } from 'react'
import { Leaf, Droplets, Thermometer, Wind, Cloud, CigaretteOff, Users, Video, AlertCircle } from 'lucide-react'
import MetricCard from '../components/MetricCard'
import IARecomCard from '../components/IARecomCard'
import TrendChart from '../components/TrendChart'
import DetailModal from '../components/DetailModal'
import {
  aqiColor, aqiLabel,
  pm25Color, pm25Label,
  pm10Color, pm10Label,
  humColor, humLabel,
  tempColor, tempLabel,
} from '../utils/aqi'

export default function DashboardCalidadAire({ data, history, theme, cameraOnline, detecciones }) {
  const [modalType, setModalType] = useState(null)
  const [videoError, setVideoError] = useState(false)

  useEffect(() => {
    if (cameraOnline) {
      setVideoError(false)
    }
  }, [cameraOnline])

  const handleVideoError = () => {
    setVideoError(true)
  }

  const statusBadge = cameraOnline && !videoError ? 'En Vivo' : 'Sin Conexión'
  const statusBadgeClass = cameraOnline && !videoError ? 'badge-success' : 'badge-muted'

  return (
    <>
      <div className="cards-row row-sensors">
        <MetricCard
          title="AQI" subtitle="Calidad del Aire"
          value={Math.round(data.aqi)} unit=""
          color={aqiColor(data.aqi)} badge={aqiLabel(data.aqi)}
          icon={<Leaf size={44} />} onClick={() => setModalType('aqi')}
        />
        <MetricCard
          title="Humedad" subtitle="Humedad Relativa"
          value={Math.round(data.humedad)} unit="%"
          color={humColor(data.humedad)} badge={humLabel(data.humedad)}
          icon={<Droplets size={44} />} onClick={() => setModalType('humedad')}
        />
        <MetricCard
          title="Temp." subtitle="Grados Celsius"
          value={data.temperatura.toFixed(1)} unit="°C"
          color={tempColor(data.temperatura)} badge={tempLabel(data.temperatura)}
          icon={<Thermometer size={44} />} onClick={() => setModalType('temperatura')}
        />
      </div>

      <IARecomCard />

      <div className="cards-row row-particles">
        <MetricCard
          title="PM 2.5" subtitle="Partículas Finas"
          value={data.pm25.toFixed(1)} unit=" µg/m³"
          color={pm25Color(data.pm25)} badge={pm25Label(data.pm25)}
          icon={<Wind size={44} />} onClick={() => setModalType('pm25')}
        />
        <MetricCard
          title="PM 10" subtitle="Partículas Gruesas"
          value={data.pm10.toFixed(1)} unit=" µg/m³"
          color={pm10Color(data.pm10)} badge={pm10Label(data.pm10)}
          icon={<Cloud size={44} />} onClick={() => setModalType('pm10')}
        />
      </div>

      <div className="cards-row row-alerts">
        {cameraOnline ? (
          <>
            <div className="card card-success">
              <div className="card-content">
                <div className="card-title">Humo</div>
                <div className="card-subtitle">De Tabaco</div>
                <div className="card-value" style={{ color: detecciones.cigarro ? '#e74c3c' : '#2ecc71' }}>
                  {detecciones.cigarro ? 'SÍ' : 'NO'}
                </div>
                <div className={`card-badge ${detecciones.cigarro ? 'badge-danger' : 'badge-success'}`}>
                  {detecciones.cigarro ? 'Detectado' : 'No detectado'}
                </div>
              </div>
              <div className="card-emoji"><CigaretteOff size={44} /></div>
            </div>
            <div className="card card-success">
              <div className="card-content">
                <div className="card-title">Personas</div>
                <div className="card-subtitle">Ocupación</div>
                <div className="card-value" style={{ color: 'var(--blue)' }}>
                  {detecciones.personas} <span className="card-value-sub">Detectadas</span>
                </div>
                <div className="card-badge badge-success">En Vivo</div>
              </div>
              <div className="card-emoji"><Users size={44} /></div>
            </div>
          </>
        ) : (
          <>
            <div className="card card-muted">
              <div className="card-content">
                <div className="card-title">Humo</div>
                <div className="card-subtitle">De Tabaco</div>
                <div className="card-value" style={{ color: 'var(--text-muted)' }}>--</div>
                <div className="card-badge badge-muted">Sin Conexión</div>
              </div>
              <div className="card-emoji"><CigaretteOff size={44} /></div>
            </div>
            <div className="card card-muted">
              <div className="card-content">
                <div className="card-title">Personas</div>
                <div className="card-subtitle">Ocupación</div>
                <div className="card-value" style={{ color: 'var(--text-muted)' }}>
                  -- <span className="card-value-sub">Detectadas</span>
                </div>
                <div className="card-badge badge-muted">Sin Conexión</div>
              </div>
              <div className="card-emoji"><Users size={44} /></div>
            </div>
          </>
        )}
      </div>

      <div className="cards-row row-video">
        <div className="card card-video">
          <div className="card-content">
            <div className="card-title">Isla de Datos Urbanos</div>
            <div className="card-subtitle">Cámara de Monitoreo</div>
            <div className="video-placeholder">
              {cameraOnline && !videoError ? (
                <img
                  src="http://192.168.100.180:5000/video_feed"
                  alt="Video Isla"
                  className="video-feed-preview"
                  onError={handleVideoError}
                />
              ) : (
                <>
                  <div className="video-placeholder-icon"><AlertCircle size={44} /></div>
                  <div className="video-placeholder-text">Video no disponible</div>
                  <div className="video-placeholder-sub">Verificar el estado de la cámara</div>
                </>
              )}
            </div>
            <div className={`card-badge ${statusBadgeClass}`}>{statusBadge}</div>
          </div>
        </div>
      </div>

      <div className="footer">Davis AirLink · WeatherLink API · UrbanDataIsland</div>

      {modalType && (
        <DetailModal
          type={modalType}
          data={data}
          onClose={() => setModalType(null)}
        />
      )}
    </>
  )
}
