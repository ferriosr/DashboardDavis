import { useEffect, useState } from 'react'

async function parseModelError(response) {
  const text = await response.text()
  if (text.trim().startsWith('<')) {
    return 'No se pudo conectar con el backend. Asegúrate de que el servidor esté arrancado.'
  }
  try {
    const json = JSON.parse(text)
    if (json?.error) return json.error
  } catch {
    // ignore invalid JSON
  }
  return text || 'Error al obtener la predicción'
}

function getFriendlyError(message) {
  if (message.includes('4 bloques')) {
    return 'Aún no hay suficientes datos recientes para generar la predicción. Vuelve a intentarlo más tarde cuando haya más lecturas en los últimos 15 minutos.'
  }
  if (message.includes('No se encontraron datos')) {
    return 'No se encontraron datos recientes de Davis. Verifica que la fuente de datos esté disponible.'
  }
  if (message.includes('Python exited') || message.includes('Error al ejecutar Python')) {
    return 'Ocurrió un error interno al ejecutar el modelo. Revisa que Python y las dependencias estén instaladas en el backend.'
  }
  return message
}

export default function Modelo() {
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [simPrediction, setSimPrediction] = useState(null)
  const [simLoading, setSimLoading] = useState(false)
  const [simError, setSimError] = useState(null)
  const [validation, setValidation] = useState(null)
  const [validationLoading, setValidationLoading] = useState(false)
  const [validationError, setValidationError] = useState(null)

  useEffect(() => {
    fetch('/api/modelo')
      .then(async (res) => {
        if (!res.ok) {
          const message = await parseModelError(res)
          throw new Error(message)
        }
        return res.json()
      })
      .then((data) => {
        setPrediction(data)
      })
      .catch((err) => {
        setError(getFriendlyError(err.message))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  function handleValidate() {
    setValidationLoading(true)
    setValidationError(null)
    setValidation(null)

    fetch('/api/modelo/simulacion?validate=true')
      .then(async (res) => {
        if (!res.ok) {
          const message = await parseModelError(res)
          throw new Error(message)
        }
        return res.json()
      })
      .then((data) => {
        setValidation(data)
      })
      .catch((err) => {
        setValidationError(getFriendlyError(err.message))
      })
      .finally(() => {
        setValidationLoading(false)
      })
  }

  function handleSimulate() {
    setSimLoading(true)
    setSimError(null)
    setSimPrediction(null)

    fetch('/api/modelo/simulacion')
      .then(async (res) => {
        if (!res.ok) {
          const message = await parseModelError(res)
          throw new Error(message)
        }
        return res.json()
      })
      .then((data) => {
        setSimPrediction(data)
      })
      .catch((err) => {
        setSimError(getFriendlyError(err.message))
      })
      .finally(() => {
        setSimLoading(false)
      })
  }

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
          <div className="modelo-card-badge badge-coming">En vivo</div>
        </div>

        <div className="modelo-card">
          <div className="modelo-card-icon">🌫️</div>
          <div className="modelo-card-title">Predicción de PM2.5</div>
          <div className="modelo-card-desc">
            Modelo de regresión para anticipar concentraciones de partículas finas en el ambiente.
          </div>
          <div className="modelo-card-badge badge-coming">En vivo</div>
        </div>

        <div className="modelo-card">
          <div className="modelo-card-icon">📈</div>
          <div className="modelo-card-title">Análisis de Tendencias</div>
          <div className="modelo-card-desc">
            Detección automática de patrones y anomalías en los datos de calidad del aire.
          </div>
          <div className="modelo-card-badge badge-coming">En vivo</div>
        </div>
      </div>

      <div className="modelo-result">
        {loading && <p>Cargando predicción del modelo...</p>}
        {error && (
          <div className="modelo-error-card">
            <div className="modelo-error-title">Predicción no disponible</div>
            <div className="modelo-error-text">{error}</div>
          </div>
        )}
        {!loading && !error && prediction && (
          <div className="modelo-prediction-card">
            <div className="modelo-prediction-title">Predicción PM2.5</div>
            <div className="modelo-prediction-value">{prediction.prediction.toFixed(1)} µg/m³</div>
            <div className="modelo-prediction-meta">
              <div>Modelo: {prediction.modelName}</div>
              <div>Umbral de anomalía: {prediction.threshold}</div>
            </div>
            <div className="modelo-prediction-info">
              <div>Bloque más reciente: {prediction.recentBlocks[0]?.pm25?.toFixed(1)} µg/m³</div>
              <div>Últimos 4 bloques 15 min:</div>
              <ul>
                {prediction.recentBlocks.map((block) => (
                  <li key={block.date}>{block.date}: {block.pm25.toFixed(1)} µg/m³</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="modelo-sim-header">
          <div>
            <div className="modelo-prediction-title">Verificación histórica</div>
            <div className="modelo-card-desc">
              Compara una predicción con el siguiente valor real registrado para saber si puedes relajar la alerta.
            </div>
          </div>
          <button className="ctrl-btn" onClick={handleValidate} disabled={validationLoading}>
            {validationLoading ? 'Comparando...' : 'Comparar con valor real'}
          </button>
        </div>

        {validationError && (
          <div className="modelo-error-card">
            <div className="modelo-error-title">Validación no disponible</div>
            <div className="modelo-error-text">{validationError}</div>
          </div>
        )}

        {validation && (
          <div className="modelo-prediction-card">
            <div className="modelo-prediction-title">Validación de predicción</div>
            <div className="modelo-prediction-value">{validation.prediction.toFixed(1)} µg/m³</div>
            <div className="modelo-prediction-meta">
              <div>Valor real siguiente: {validation.actualNext.pm25.toFixed(1)} µg/m³</div>
              <div>Diferencia: {validation.delta.toFixed(1)} µg/m³</div>
            </div>
            <div className="modelo-prediction-info">
              <div>{validation.recommendation}</div>
              <div>Umbral del modelo: {validation.threshold}</div>
              <div>Fecha del valor real: {new Date(validation.actualNext.date).toLocaleString()}</div>
            </div>
          </div>
        )}

        <div className="modelo-sim-header">
          <div>
            <div className="modelo-prediction-title">Simulación temporal</div>
            <div className="modelo-card-desc">Genera una predicción con datos sintéticos para ver cómo responde el modelo en tiempo real.</div>
          </div>
          <button className="ctrl-btn" onClick={handleSimulate} disabled={simLoading}>
            {simLoading ? 'Simulando...' : 'Ejecutar simulación'}
          </button>
        </div>

        {simError && (
          <div className="modelo-error-card">
            <div className="modelo-error-title">Simulación no disponible</div>
            <div className="modelo-error-text">{simError}</div>
          </div>
        )}

        {simPrediction && (
          <div className="modelo-sim-card">
            <div className="modelo-prediction-title">Resultado de simulación</div>
            <div className="modelo-prediction-value">{simPrediction.prediction.toFixed(1)} µg/m³</div>
            <div className="modelo-prediction-meta">
              <div>Generado: {new Date(simPrediction.simulatedAt).toLocaleString()}</div>
              <div>Modelo: {simPrediction.modelName}</div>
            </div>
            <div className="modelo-prediction-info">
              <div>Bloque más reciente simulado: {simPrediction.recentBlocks[3]?.pm25?.toFixed(1)} µg/m³</div>
              <div>Últimos 4 bloques simulados:</div>
              <ul>
                {simPrediction.recentBlocks.map((block) => (
                  <li key={block.date}>{block.date}: {block.pm25.toFixed(1)} µg/m³</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="modelo-info">
        <span className="modelo-info-icon">ℹ️</span>
        <span>La predicción usa el modelo XGBoost cargado desde el backend y los datos más recientes de Davis.</span>
      </div>
    </div>
  )
}
