import { useState } from 'react'
import MetricCard from '../components/MetricCard'
import RecCard from '../components/RecCard'
import TrendChart from '../components/TrendChart'
import DetailModal from '../components/DetailModal'
import {
  aqiColor, aqiLabel,
  pm25Color, pm25Label,
  pm10Color, pm10Label,
  humColor, humLabel,
  tempColor, tempLabel,
} from '../utils/aqi'

export default function DashboardCalidadAire({ data, history, theme }) {
  const [modalType, setModalType] = useState(null)

  return (
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
