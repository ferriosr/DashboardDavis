import { useState, useEffect, Fragment } from 'react'

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmtLabel(key, group) {
  if (group === 'month') {
    const [y, m] = key.split('-')
    return `${MONTHS[+m - 1]} '${y.slice(2)}`
  }
  const [, m, d] = key.split('-')
  return `${d} ${MONTHS[+m - 1]}`
}

function cellBg(v, dark) {
  if (v == null) return dark ? '#111622' : '#e8ecf2'
  if (v <= 50)   return 'rgba(52,201,140,0.78)'
  if (v <= 75)   return 'rgba(245,200,66,0.82)'
  if (v <= 100)  return 'rgba(240,124,58,0.87)'
  if (v <= 150)  return 'rgba(232,75,75,0.87)'
  return 'rgba(120,20,20,0.95)'
}

function cellFg(v) {
  if (v == null) return 'transparent'
  if (v <= 50)   return '#04180e'
  if (v <= 75)   return '#1a1200'
  if (v <= 100)  return '#1a0900'
  if (v <= 150)  return '#180404'
  return '#ffaaaa'
}

const LEGEND = [
  ['rgba(52,201,140,0.78)',  'Bueno ≤50'],
  ['rgba(245,200,66,0.82)',  'Moderado 51–75'],
  ['rgba(240,124,58,0.87)',  'Mod. alto 76–100'],
  ['rgba(232,75,75,0.87)',   'No saludable GS 101–150'],
  ['rgba(120,20,20,0.95)',   'No saludable >150'],
]

const STAT = ({ label, value, color, dark }) => (
  <div style={{
    background: dark ? '#161b25' : '#f0f4f8',
    border: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
    borderRadius: 10,
    padding: '10px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  }}>
    <span style={{ fontSize: 10, color: dark ? '#7b8799' : '#718096', fontWeight: 500 }}>{label}</span>
    <span style={{ fontSize: 20, fontWeight: 600, color: color ?? (dark ? '#e8edf5' : '#2d3436'), fontFamily: 'DM Mono, monospace' }}>
      {value}
    </span>
  </div>
)

export default function HeatmapAQI({ from, to, theme }) {
  const dark = theme === 'dark'
  const [group, setGroup] = useState('day')
  const [data,  setData]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!from || !to) return
    setLoading(true)
    setError(null)
    fetch(`/api/davis?type=heatmap&from=${from}&to=${to}&group=${group}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [from, to, group])

  const cellW = group === 'day' ? 34 : 56
  const HOUR_COL = 42

  const mutedColor   = dark ? '#7b8799' : '#718096'
  const subColor     = dark ? '#4a5568' : '#b2bec3'
  const wrapBg       = dark ? '#0e1117' : 'var(--hist-wrap-bg)'
  const toggleBg     = dark ? '#1e2535' : '#e2e8f0'

  return (
    <div>
      {/* ── Group toggle ── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 2, background: toggleBg, borderRadius: 10, padding: 3 }}>
          {[['day', 'Por día'], ['month', 'Por mes']].map(([g, label]) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              style={{
                background: group === g ? '#2d62ed' : 'transparent',
                border: 'none',
                borderRadius: 8,
                color: group === g ? '#fff' : mutedColor,
                fontSize: 12,
                fontWeight: 700,
                padding: '6px 14px',
                cursor: 'pointer',
                transition: 'background 0.2s, color 0.2s',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {data && !loading && (
          <span style={{ fontSize: 11, color: subColor, fontFamily: 'DM Mono, monospace' }}>
            {data.labels.length} {group === 'day' ? 'días' : 'meses'} · {data.total.toLocaleString()} registros
          </span>
        )}
      </div>

      {/* ── Summary stats ── */}
      {data && !loading && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <STAT dark={dark} label="AQI promedio" value={data.summary.avg} color={
            data.summary.avg <= 50 ? '#34c98c' : data.summary.avg <= 100 ? '#f5c842' : '#f07c3a'
          } />
          <STAT dark={dark} label="AQI mínimo" value={data.summary.min} color="#34c98c" />
          <STAT dark={dark} label="AQI máximo" value={data.summary.max} color="#e84b4b" />
        </div>
      )}

      {error && (
        <div style={{ color: '#e84b4b', fontSize: 12, fontFamily: 'DM Mono, monospace', padding: '20px 0' }}>
          Error al cargar: {error}
        </div>
      )}

      {loading && (
        <div style={{ color: subColor, fontSize: 12, fontFamily: 'DM Mono, monospace', padding: '30px 0', textAlign: 'center' }}>
          Cargando mapa de calor…
        </div>
      )}

      {data && !loading && data.labels.length === 0 && (
        <div style={{ color: subColor, fontSize: 12, fontFamily: 'DM Mono, monospace', padding: '30px 0', textAlign: 'center' }}>
          Sin datos para el período seleccionado.
        </div>
      )}

      {data && !loading && data.labels.length > 0 && (
        <div style={{ overflowX: 'auto', overflowY: 'visible', paddingBottom: 8 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `${HOUR_COL}px repeat(${data.labels.length}, ${cellW}px)`,
            gap: 2,
            minWidth: HOUR_COL + data.labels.length * (cellW + 2),
          }}>
            <div />
            {data.labels.map((lbl, i) => (
              <div
                key={i}
                style={{
                  fontSize: 9,
                  color: mutedColor,
                  textAlign: 'center',
                  fontFamily: 'DM Mono, monospace',
                  paddingBottom: 4,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.3,
                }}
              >
                {fmtLabel(lbl, group)}
              </div>
            ))}

            {Array.from({ length: 24 }, (_, h) => (
              <Fragment key={h}>
                <div
                  style={{
                    fontSize: 10,
                    color: subColor,
                    fontFamily: 'DM Mono, monospace',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: 6,
                    position: 'sticky',
                    left: 0,
                    background: wrapBg,
                    zIndex: 2,
                    height: 24,
                  }}
                >
                  {h}h
                </div>
                {data.matrix[h].map((v, ci) => (
                  <div
                    key={ci}
                    title={v !== null
                      ? `${fmtLabel(data.labels[ci], group)} ${h}:00 — AQI ${v}`
                      : `${fmtLabel(data.labels[ci], group)} ${h}:00 — sin datos`}
                    style={{
                      height: 24,
                      background: cellBg(v, dark),
                      color: cellFg(v),
                      borderRadius: 3,
                      fontSize: 8,
                      fontWeight: 600,
                      fontFamily: 'DM Mono, monospace',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'default',
                      transition: 'opacity 0.15s, transform 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.transform = 'scale(1.06)' }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1';   e.currentTarget.style.transform = 'scale(1)' }}
                  >
                    {v !== null ? v : ''}
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {data && !loading && (
        <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
          {LEGEND.map(([color, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: mutedColor }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
