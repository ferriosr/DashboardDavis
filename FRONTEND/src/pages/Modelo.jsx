export default function Modelo() {
  return (
    <div className="modelo-page">
      <div className="modelo-hero">
        <div className="modelo-hero-icon">🤖</div>
        <h1 className="modelo-title">Modelo</h1>
        <p className="modelo-subtitle">Predicción y análisis con inteligencia artificial</p>
      </div>

      <div className="modelo-grid">
        <div className="modelo-card">
          <div className="modelo-card-icon">📊</div>
          <div className="modelo-card-title">Predicción de AQI</div>
          <div className="modelo-card-desc">
            Estimación de la calidad del aire para las próximas horas basada en tendencias históricas.
          </div>
          <div className="modelo-card-badge badge-coming">Próximamente</div>
        </div>

        <div className="modelo-card">
          <div className="modelo-card-icon">🌫️</div>
          <div className="modelo-card-title">Predicción de PM2.5</div>
          <div className="modelo-card-desc">
            Modelo de regresión para anticipar concentraciones de partículas finas en el ambiente.
          </div>
          <div className="modelo-card-badge badge-coming">Próximamente</div>
        </div>

        <div className="modelo-card">
          <div className="modelo-card-icon">📈</div>
          <div className="modelo-card-title">Análisis de Tendencias</div>
          <div className="modelo-card-desc">
            Detección automática de patrones y anomalías en los datos de calidad del aire.
          </div>
          <div className="modelo-card-badge badge-coming">Próximamente</div>
        </div>
      </div>

      <div className="modelo-info">
        <span className="modelo-info-icon">ℹ️</span>
        <span>Esta sección está en desarrollo. Los modelos predictivos estarán disponibles próximamente.</span>
      </div>
    </div>
  )
}
