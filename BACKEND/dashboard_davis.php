<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Estado del Ambiente · Monitoreo en Tiempo Real</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;0,900;1,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #F4F6FB;
    --card-bg: #FFFFFF;
    --border: #F1F2F6;
    --text-dark: #2D3436;
    --text-muted: #B2BEC3;
    --text-sub: #4b5357;
    --blue: #2D62ED;
    --blue-light: #EBF1FF;
    --green: #00E676;
    --yellow: #FFFF00;
    --orange: #FF9800;
    --red: #FF5252;
    --purple: #9C27B0;
    --maroon: #7E0023;
    --card-shadow: 0 10px 20px rgba(0,0,0,0.05);
    --card-radius: 25px;
    --font: 'DM Sans', sans-serif;
  }

  body {
    font-family: var(--font);
    background: var(--bg);
    min-height: 100vh;
    padding: 20px;
    color: var(--text-dark);
  }

  .dashboard {
    max-width: 1280px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 15px;
  }

  .header-brand {
    display: flex;
    align-items: center;
    background: #BEDABE;
    padding: 15px 30px;
    border-radius: 20px;
    box-shadow: 0 8px 20px rgba(0,0,0,0.04);
    border: 1px solid var(--border);
    flex-grow: 1;
    gap: 18px;
    animation: fadeSlideDown 0.5s ease both;
  }

  .header-icon {
    background: var(--blue-light);
    padding: 12px;
    border-radius: 15px;
    font-size: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .header-title {
    font-size: 24px;
    font-weight: 900;
    color: var(--text-dark);
    letter-spacing: -1px;
    line-height: 1;
  }

  .header-subtitle {
    font-size: 12px;
    color: var(--text-sub);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    margin-top: 2px;
  }

  .header-time {
    background: #F0F4F8;
    padding: 15px 25px;
    border-radius: 20px;
    text-align: center;
    box-shadow: 0 5px 15px rgba(45, 98, 237, 0.1);
    border: 2px solid var(--blue);
    min-width: 200px;
    animation: fadeSlideDown 0.5s 0.1s ease both;
  }

  .header-time-label {
    font-size: 10px;
    color: #718096;
    font-weight: 800;
    text-transform: uppercase;
    display: block;
    margin-bottom: 2px;
    letter-spacing: 1.5px;
  }

  .header-time-value {
    font-size: 22px;
    font-weight: 900;
    color: var(--blue);
    font-family: 'DM Mono', monospace;
  }

  .cards-row {
    display: flex;
    gap: 18px;
  }

  .card {
    background: var(--card-bg);
    padding: 28px;
    border-radius: var(--card-radius);
    box-shadow: var(--card-shadow);
    border: 1px solid var(--border);
    flex: 1;
    position: relative;
    overflow: hidden;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
    animation: fadeSlideUp 0.5s ease both;
    cursor: pointer;
  }

  .card:hover {
    transform: translateY(-3px);
    box-shadow: 0 18px 35px rgba(0,0,0,0.09);
  }

  .card-emoji {
    position: absolute;
    right: 14px;
    top: 18px;
    font-size: 60px;
    filter: drop-shadow(0px 4px 4px rgba(0,0,0,0.1));
    pointer-events: none;
    transition: transform 0.3s ease;
  }

  .card:hover .card-emoji { transform: scale(1.1) rotate(-5deg); }

  .card-content { position: relative; z-index: 2; }

  .card-title {
    font-size: 28px;
    font-weight: 900;
    color: var(--text-dark);
    letter-spacing: 1px;
  }

  .card-subtitle {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .card-value {
    font-size: 52px;
    font-weight: 800;
    line-height: 1;
  }

  .card-unit {
    font-size: 24px;
    margin-left: 2px;
    vertical-align: middle;
  }

  .card-badge {
    margin-top: 18px;
    display: inline-block;
    padding: 6px 16px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .rec-card {
    display: flex;
    align-items: center;
    padding: 20px 28px;
    border-radius: var(--card-radius);
    border: 2px solid;
    font-family: var(--font);
    box-shadow: 0 10px 15px rgba(0,0,0,0.05);
    gap: 20px;
    animation: fadeSlideUp 0.5s 0.3s ease both;
    transition: transform 0.25s ease;
  }

  .rec-card:hover { transform: translateY(-2px); }

  .rec-icon { font-size: 45px; flex-shrink: 0; }

  .rec-label {
    font-size: 13px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 5px;
  }

  .rec-text {
    font-size: 17px;
    font-weight: 600;
    color: var(--text-dark);
    line-height: 1.4;
  }

  .card-muted .card-value { color: var(--text-muted); }

  .chart-section {
    background: var(--card-bg);
    border-radius: var(--card-radius);
    padding: 28px;
    box-shadow: var(--card-shadow);
    border: 1px solid var(--border);
    animation: fadeSlideUp 0.5s 0.4s ease both;
  }

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .chart-title {
    font-size: 18px;
    font-weight: 900;
    color: var(--text-dark);
  }

  .chart-legend {
    display: flex;
    gap: 16px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 700;
    color: var(--text-sub);
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  canvas { width: 100% !important; }

  .footer {
    text-align: center;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 4px 0 8px;
  }

  @keyframes fadeSlideDown {
    from { opacity: 0; transform: translateY(-16px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .row-sensors .card:nth-child(1) { animation-delay: 0.15s; }
  .row-sensors .card:nth-child(2) { animation-delay: 0.25s; }
  .row-sensors .card:nth-child(3) { animation-delay: 0.35s; }
  .row-particles .card:nth-child(1) { animation-delay: 0.2s; }
  .row-particles .card:nth-child(2) { animation-delay: 0.3s; }
  .row-alerts .card:nth-child(1) { animation-delay: 0.2s; }
  .row-alerts .card:nth-child(2) { animation-delay: 0.3s; }

  @media (max-width: 900px) {
    .cards-row { flex-direction: column; }
    .header { flex-direction: column; }
    .header-time { min-width: unset; width: 100%; }
  }

  .modal-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(45,52,54,0.45);
    backdrop-filter: blur(4px);
    z-index: 1000;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .modal-overlay.open { display: flex; }

  .modal {
    background: #fff;
    border-radius: 28px;
    padding: 36px;
    max-width: 520px;
    width: 100%;
    box-shadow: 0 30px 60px rgba(0,0,0,0.18);
    position: relative;
    animation: modalPop 0.25s cubic-bezier(.34,1.56,.64,1) both;
  }

  @keyframes modalPop {
    from { opacity: 0; transform: scale(0.88) translateY(20px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }

  .modal-close {
    position: absolute;
    top: 18px; right: 20px;
    background: #F1F2F6;
    border: none;
    border-radius: 50%;
    width: 36px; height: 36px;
    font-size: 18px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    color: #636e72;
    transition: background 0.2s;
  }
  .modal-close:hover { background: #dfe6e9; }

  .modal-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
  }

  .modal-icon { font-size: 48px; line-height: 1; }

  .modal-title {
    font-size: 26px;
    font-weight: 900;
    color: var(--text-dark);
    letter-spacing: -0.5px;
  }

  .modal-subtitle {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .modal-value-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 20px;
  }

  .modal-value {
    font-size: 64px;
    font-weight: 900;
    line-height: 1;
  }

  .modal-unit {
    font-size: 22px;
    font-weight: 600;
    color: var(--text-muted);
  }

  .modal-badge {
    display: inline-block;
    padding: 6px 18px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 22px;
  }

  .modal-desc {
    font-size: 14px;
    color: var(--text-sub);
    line-height: 1.65;
    margin-bottom: 24px;
  }

  .modal-scale-title {
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: var(--text-muted);
    margin-bottom: 10px;
  }

  .modal-scale {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .scale-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    transition: opacity 0.2s;
  }

  .scale-row.active {
    outline: 2px solid currentColor;
    font-weight: 800;
  }

  .scale-dot {
    width: 12px; height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .scale-range {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    color: var(--text-muted);
    margin-left: auto;
  }
</style>
</head>
<body>

<div class="dashboard">

  <div class="header">
    <div class="header-brand">
      <div class="header-icon">🍃</div>
      <div>
        <div class="header-title">Estado del Ambiente</div>
        <div class="header-subtitle">📡 Monitoreo en Tiempo Real</div>
      </div>
    </div>
    <div class="header-time">
      <span class="header-time-label" id="liveLabel">Última lectura</span>
      <span class="header-time-value" id="clock">--</span>
    </div>
  </div>

  <div class="cards-row row-sensors" id="sensor-cards"></div>
  <div id="rec-container"></div>
  <div class="cards-row row-particles" id="particle-cards"></div>

  <div class="cards-row row-alerts" id="alert-cards">
    <div class="card card-muted">
      <div class="card-content">
        <div class="card-title">Humo</div>
        <div class="card-subtitle">De Tabaco</div>
        <div class="card-value">--</div>
        <div class="card-badge" style="background:#F1F2F6;color:#B2BEC3">En proceso de conexión</div>
      </div>
      <div class="card-emoji">🚭</div>
    </div>
    <div class="card card-muted">
      <div class="card-content">
        <div class="card-title">Personas</div>
        <div class="card-subtitle">Ocupación</div>
        <div class="card-value">-- <span style="font-size:24px;color:#B2BEC3">Detectadas</span></div>
        <div class="card-badge" style="background:#F1F2F6;color:#B2BEC3">En proceso de conexión</div>
      </div>
      <div class="card-emoji">👥</div>
    </div>
  </div>

  <div class="chart-section">
    <div class="chart-header">
      <div class="chart-title">📈 Tendencia · Últimas mediciones</div>
      <div class="chart-legend">
        <div class="legend-item"><div class="legend-dot" style="background:#2D62ED"></div> AQI</div>
        <div class="legend-item"><div class="legend-dot" style="background:#00E676"></div> PM 2.5</div>
        <div class="legend-item"><div class="legend-dot" style="background:#FF9800"></div> PM 10</div>
      </div>
    </div>
    <canvas id="trendChart" height="180"></canvas>
  </div>

  <div class="footer">Davis AirLink · WeatherLink API · UrbanDataIsland</div>
</div>

<div class="modal-overlay" id="detailModal" onclick="closeDetail(event)">
  <div class="modal">
    <button class="modal-close" onclick="closeModal()">✕</button>
    <div id="modalContent"></div>
  </div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js"></script>
<script>
/* ─── ESTADO ─── */
const data = { aqi: 0, humedad: 0, temperatura: 0, pm25: 0, pm10: 0 };
let chartInstance = null;
const MAX_HISTORY = 180;
const hist = { labels: [], aqi: [], pm25: [], pm10: [] };
let lastTimestamp = null;

function applyRow(row) {
  console.log("applyRow raw:", JSON.stringify(row));
  data.aqi         = parseFloat(row.aqi)         || 0;
  data.humedad     = parseFloat(row.humedad)     || 0;
  data.temperatura = parseFloat(row.temperatura) || 0;
  data.pm25        = parseFloat(row.pm2_5)       || 0;
  data.pm10        = parseFloat(row.pm10)        || 0;
  console.log("applyRow parsed:", data);
}

function toHHMM(isoStr) {
  const timePart = isoStr.split(" ")[1] || "";
  return timePart.slice(0, 5);
}

function pushHistory(row) {
  hist.labels.push(toHHMM(row.hora_sensor_utc));
  hist.aqi.push(parseFloat(row.aqi)   || 0);
  hist.pm25.push(parseFloat(row.pm2_5) || 0);
  hist.pm10.push(parseFloat(row.pm10)  || 0);
  if (hist.labels.length > MAX_HISTORY) {
    hist.labels.shift(); hist.aqi.shift(); hist.pm25.shift(); hist.pm10.shift();
  }
}

function showSensorTime(isoStr) {
  // Mostrar hora_sensor_utc tal como viene de la BD: "YYYY-MM-DD HH:MM:SS"
  const [datePart, timePart] = isoStr.split(" ");
  const [y, m, d] = datePart.split("-");
  const hhmm = timePart ? timePart.slice(0, 5) : "--:--";
  document.getElementById("clock").textContent = `${d}/${m}/${y} ${hhmm}`;
}

/* ─── UTILIDADES AQI ─── */
function aqiColor(v) {
  if (v <= 50)  return "#00E676";
  if (v <= 100) return "#F6D72B";
  if (v <= 150) return "#FF9800";
  if (v <= 200) return "#FF5252";
  if (v <= 300) return "#9C27B0";
  return "#7E0023";
}
function aqiLabel(v) {
  if (v <= 50)  return "Bueno";
  if (v <= 100) return "Moderado";
  if (v <= 150) return "Insalubre (Sensibles)";
  if (v <= 200) return "Insalubre";
  if (v <= 300) return "Muy Insalubre";
  return "Peligroso";
}

/* ─── TARJETAS ─── */
function renderSensorCards() {
  const aColor = aqiColor(data.aqi);
  const aLabel = aqiLabel(data.aqi);
  const cards = [
    { title:"AQI",    sub:"Calidad del Aire",   value:Math.round(data.aqi),       unit:"",   color:aColor,    badge:aLabel,             badgeBg:"",        emoji:"🍃"  },
    { title:"Humedad",sub:"Humedad Relativa",   value:Math.round(data.humedad),   unit:"%",  color:"#2D62ED", badge:"Ambiente Estable", badgeBg:"#EBF1FF", emoji:"💧"  },
    { title:"Temp.",  sub:"Grados Celsius",     value:data.temperatura.toFixed(1),unit:"°C", color:"#FF9800", badge:"En Tiempo Real",   badgeBg:"#FFF3E0", emoji:"🌡️" },
  ];
  const types = ["aqi","humedad","temperatura"];
  document.getElementById("sensor-cards").innerHTML = cards.map((c,i) => `
    <div class="card" onclick="openDetail('${types[i]}')">
      <div class="card-content">
        <div class="card-title">${c.title}</div>
        <div class="card-subtitle">${c.sub}</div>
        <div class="card-value" style="color:${c.color}">
          ${c.value}<span class="card-unit" style="color:${c.color}">${c.unit}</span>
        </div>
        <div class="card-badge" style="background:${c.badgeBg||c.color+'22'};color:${c.color}">${c.badge}</div>
      </div>
      <div class="card-emoji">${c.emoji}</div>
    </div>`).join("");
}

function renderRec() {
  const v = data.aqi;
  let rec, fondo, texto, icon;
  if (v > 150) {
    rec="😷 Calidad del aire crítica. Evite actividades físicas y use purificadores de aire."; fondo="#FFF5F5"; texto="#C53030"; icon="📢";
  } else if (v > 100) {
    rec="⚠️ Nivel insalubre para grupos sensibles. Limiten el tiempo al aire libre."; fondo="#FFF3E0"; texto="#E65100"; icon="📢";
  } else if (v > 50) {
    rec="⚠️ Nivel moderado. Personas sensibles deben limitar actividades al aire libre."; fondo="#FFFBEB"; texto="#B45309"; icon="📢";
  } else {
    rec="✅ Calidad de aire excelente. El ambiente es seguro para todas las personas."; fondo="#F0FFF4"; texto="#2F855A"; icon="💡";
  }
  document.getElementById("rec-container").innerHTML = `
    <div class="rec-card" style="background:${fondo};border-color:${texto}33">
      <div class="rec-icon">${icon}</div>
      <div><div class="rec-label" style="color:${texto}">Recomendación</div>
      <div class="rec-text">${rec}</div></div>
    </div>`;
}

function renderParticles() {
  const pm25color = data.pm25 > 25 ? "#FF5252" : "#00E676";
  const pm25label = data.pm25 > 25 ? "Sobre el límite" : "Nivel Seguro";
  const pm10color = data.pm10 > 50 ? "#FF5252" : "#00E676";
  const pm10label = data.pm10 > 50 ? "Sobre el límite" : "Nivel Seguro";
  document.getElementById("particle-cards").innerHTML = `
    <div class="card" onclick="openDetail('pm25')">
      <div class="card-content">
        <div class="card-title">PM 2.5</div>
        <div class="card-subtitle">Partículas Finas</div>
        <div class="card-value" style="color:${pm25color}">
          ${data.pm25.toFixed(1)}<span style="font-size:20px;color:#B2BEC3;margin-left:6px">µg/m³</span>
        </div>
        <div class="card-badge" style="background:${pm25color}22;color:${pm25color}">${pm25label}</div>
      </div>
      <div class="card-emoji">🌫️</div>
    </div>
    <div class="card" onclick="openDetail('pm10')">
      <div class="card-content">
        <div class="card-title">PM 10</div>
        <div class="card-subtitle">Partículas Gruesas</div>
        <div class="card-value" style="color:${pm10color}">
          ${data.pm10.toFixed(1)}<span style="font-size:20px;color:#B2BEC3;margin-left:6px">µg/m³</span>
        </div>
        <div class="card-badge" style="background:${pm10color}22;color:${pm10color}">${pm10label}</div>
      </div>
      <div class="card-emoji">☁️</div>
    </div>`;
}

function renderAll() {
  renderSensorCards();
  renderRec();
  renderParticles();
}

/* ─── GRÁFICA ─── */
function renderChart() {
  const ctx = document.getElementById("trendChart").getContext("2d");
  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: hist.labels,
      datasets: [
        { label:"AQI",   data:hist.aqi,  borderColor:"#2D62ED", backgroundColor:"rgba(45,98,237,0.07)",  tension:0.4, pointRadius:0, borderWidth:2.5, fill:true },
        { label:"PM2.5", data:hist.pm25, borderColor:"#00C853", backgroundColor:"rgba(0,230,118,0.05)",  tension:0.4, pointRadius:0, borderWidth:2,   fill:true },
        { label:"PM10",  data:hist.pm10, borderColor:"#FF9800", backgroundColor:"rgba(255,152,0,0.05)",  tension:0.4, pointRadius:0, borderWidth:2,   fill:true },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode:"index", intersect:false },
      plugins: {
        legend: { display:false },
        tooltip: {
          backgroundColor:"rgba(255,255,255,0.95)", titleColor:"#2D3436", bodyColor:"#4b5357",
          borderColor:"#F1F2F6", borderWidth:1, padding:12,
          titleFont:{ family:"'DM Sans'", weight:"700" }, bodyFont:{ family:"'DM Sans'" },
        },
      },
      scales: {
        x: { grid:{color:"rgba(0,0,0,0.04)"}, ticks:{font:{family:"'DM Mono'",size:10},color:"#B2BEC3",maxTicksLimit:8}, border:{display:false} },
        y: { grid:{color:"rgba(0,0,0,0.04)"}, ticks:{font:{family:"'DM Mono'",size:10},color:"#B2BEC3"},                 border:{display:false} },
      },
    },
  });
}

function updateChart() {
  if (!chartInstance) return;
  chartInstance.data.labels        = hist.labels;
  chartInstance.data.datasets[0].data = hist.aqi;
  chartInstance.data.datasets[1].data = hist.pm25;
  chartInstance.data.datasets[2].data = hist.pm10;
  chartInstance.update("none");
}

/* ─── MODAL ─── */
const DETAIL_INFO = {
  aqi: {
    icon:"🍃", title:"AQI", subtitle:"Índice de Calidad del Aire", unit:"",
    desc:"El AQI (Air Quality Index) es una escala numérica que indica qué tan limpio o contaminado está el aire. Combina las concentraciones de PM2.5, PM10, ozono, CO y otros contaminantes en un único valor comprensible.\nFuente: Estándares SEMARNAT 2019.",
    scale:[
      {label:"Bueno",range:"0 – 50",color:"#00E676"},{label:"Moderado",range:"51 – 100",color:"#F6D72B"},
      {label:"Insalubre (sensibles)",range:"101 – 150",color:"#FF9800"},{label:"Insalubre",range:"151 – 200",color:"#FF5252"},
      {label:"Muy insalubre",range:"201 – 300",color:"#9C27B0"},{label:"Peligroso",range:"301+",color:"#7E0023"},
    ],
    getValue:()=>Math.round(data.aqi), getColor:()=>aqiColor(data.aqi), getLabel:()=>aqiLabel(data.aqi),
    activeIndex:()=>{ const v=data.aqi; if(v<=50)return 0;if(v<=100)return 1;if(v<=150)return 2;if(v<=200)return 3;if(v<=300)return 4;return 5; },
  },
  pm25: {
    icon:"🌫️", title:"PM 2.5", subtitle:"Partículas finas suspendidas", unit:"µg/m³",
    desc:"Las PM2.5 son partículas con diámetro inferior a 2.5 micrómetros. Penetran profundamente en los pulmones y pueden pasar al torrente sanguíneo.\nFuente: Estándares SEMARNAT 2019.",
    scale:[
      {label:"Bueno",range:"0 – 12",color:"#00E676"},{label:"Moderado",range:"12.1 – 35",color:"#F6D72B"},
      {label:"Insalubre (sensibles)",range:"35.1 – 55",color:"#FF9800"},{label:"Insalubre",range:"55.1 – 150",color:"#FF5252"},
      {label:"Muy insalubre",range:"150.1 – 250",color:"#9C27B0"},{label:"Peligroso",range:"250.1+",color:"#7E0023"},
    ],
    getValue:()=>data.pm25.toFixed(1), getColor:()=>data.pm25>35?"#FF5252":data.pm25>12?"#F6D72B":"#00E676",
    getLabel:()=>data.pm25>35?"Sobre el límite":data.pm25>12?"Moderado":"Nivel seguro",
    activeIndex:()=>{ const v=data.pm25; if(v<=12)return 0;if(v<=35)return 1;if(v<=55)return 2;if(v<=150)return 3;if(v<=250)return 4;return 5; },
  },
  pm10: {
    icon:"☁️", title:"PM 10", subtitle:"Partículas gruesas suspendidas", unit:"µg/m³",
    desc:"Las PM10 incluyen partículas de entre 2.5 y 10 micrómetros. Afectan el sistema respiratorio superior.\nFuente: Estándares SEMARNAT 2019.",
    scale:[
      {label:"Bueno",range:"0 – 54",color:"#00E676"},{label:"Moderado",range:"55 – 154",color:"#F6D72B"},
      {label:"Insalubre (sensibles)",range:"155 – 254",color:"#FF9800"},{label:"Insalubre",range:"255 – 354",color:"#FF5252"},
      {label:"Muy insalubre",range:"355 – 424",color:"#9C27B0"},{label:"Peligroso",range:"425+",color:"#7E0023"},
    ],
    getValue:()=>data.pm10.toFixed(1), getColor:()=>data.pm10>154?"#FF5252":data.pm10>54?"#F6D72B":"#00E676",
    getLabel:()=>data.pm10>154?"Sobre el límite":data.pm10>54?"Moderado":"Nivel seguro",
    activeIndex:()=>{ const v=data.pm10; if(v<=54)return 0;if(v<=154)return 1;if(v<=254)return 2;if(v<=354)return 3;if(v<=424)return 4;return 5; },
  },
  humedad: {
    icon:"💧", title:"Humedad", subtitle:"Humedad relativa del aire", unit:"%",
    desc:"La humedad relativa indica el porcentaje de vapor de agua presente en el aire. Niveles entre 40% y 60% son óptimos para el confort y la salud respiratoria.",
    scale:[
      {label:"Muy seco",range:"< 20%",color:"#FF9800"},{label:"Seco",range:"20 – 39%",color:"#F6D72B"},
      {label:"Confortable",range:"40 – 60%",color:"#00E676"},{label:"Húmedo",range:"61 – 80%",color:"#F6D72B"},
      {label:"Muy húmedo",range:"> 80%",color:"#FF9800"},
    ],
    getValue:()=>Math.round(data.humedad),
    getColor:()=>{ const v=data.humedad; return(v>=40&&v<=60)?"#00E676":(v<20||v>80)?"#FF9800":"#F6D72B"; },
    getLabel:()=>{ const v=data.humedad; if(v<20)return"Muy seco";if(v<40)return"Seco";if(v<=60)return"Confortable";if(v<=80)return"Húmedo";return"Muy húmedo"; },
    activeIndex:()=>{ const v=data.humedad; if(v<20)return 0;if(v<40)return 1;if(v<=60)return 2;if(v<=80)return 3;return 4; },
  },
  temperatura: {
    icon:"🌡️", title:"Temperatura", subtitle:"Temperatura ambiente", unit:"°C",
    desc:"La temperatura influye en el confort térmico y la calidad del aire. Entre 18°C y 24°C es óptima para la mayoría de las personas.\nFuente: NWS.",
    scale:[
      {label:"Seguro",range:"< 26°C",color:"#2D62ED"},{label:"Precaución",range:"27 – 32°C",color:"#00BCD4"},
      {label:"Precaución Extrema",range:"33 – 40°C",color:"#00E676"},{label:"Peligro",range:"41 – 51°C",color:"#FF9800"},
      {label:"Muy caliente",range:"52 – 92°C",color:"#FF5252"},
    ],
    getValue:()=>data.temperatura.toFixed(1),
    getColor:()=>{ const v=data.temperatura; if(v<10)return"#2D62ED";if(v<18)return"#00BCD4";if(v<=24)return"#00E676";if(v<=32)return"#FF9800";return"#FF5252"; },
    getLabel:()=>{ const v=data.temperatura; if(v<10)return"Muy frío";if(v<18)return"Fresco";if(v<=24)return"Confortable";if(v<=32)return"Cálido";return"Muy caliente"; },
    activeIndex:()=>{ const v=data.temperatura; if(v<10)return 0;if(v<18)return 1;if(v<=24)return 2;if(v<=32)return 3;return 4; },
  },
};

function openDetail(type) {
  const info = DETAIL_INFO[type]; if (!info) return;
  const val=info.getValue(), color=info.getColor(), label=info.getLabel(), active=info.activeIndex();
  document.getElementById("modalContent").innerHTML = `
    <div class="modal-header">
      <div class="modal-icon">${info.icon}</div>
      <div><div class="modal-title">${info.title}</div><div class="modal-subtitle">${info.subtitle}</div></div>
    </div>
    <div class="modal-value-row">
      <span class="modal-value" style="color:${color}">${val}</span>
      <span class="modal-unit">${info.unit}</span>
    </div>
    <div class="modal-badge" style="background:${color}22;color:${color}">${label}</div>
    <p class="modal-desc">${info.desc}</p>
    <div class="modal-scale-title">Escala de referencia</div>
    <div class="modal-scale">
      ${info.scale.map((s,i)=>`
        <div class="scale-row ${i===active?"active":""}" style="background:${s.color}${i===active?"22":"0D"};color:${i===active?s.color:"var(--text-sub)"}">
          <div class="scale-dot" style="background:${s.color}"></div>
          <span>${s.label}</span><span class="scale-range">${s.range}</span>
        </div>`).join("")}
    </div>`;
  document.getElementById("detailModal").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("detailModal").classList.remove("open");
  document.body.style.overflow = "";
}
function closeDetail(e) { if (e.target===document.getElementById("detailModal")) closeModal(); }
document.addEventListener("keydown", e => { if (e.key==="Escape") closeModal(); });

/* ─── API PROXY (api_davis.php) ─── */
async function fetchLatest() {
  try {
    const res = await fetch("api_davis.php?type=latest", { cache: "no-store" });
    if (!res.ok) { console.error("API error", res.status); return; }
    const row = await res.json();
    if (!row || !row.hora_sensor_utc) return;

    const ts = row.hora_sensor_utc;
    const isNew = ts !== lastTimestamp;
    lastTimestamp = ts;

    applyRow(row);
    showSensorTime(row.hora_sensor_utc);
    renderAll();

    if (isNew) {
      pushHistory(row);
      updateChart();
    }

    console.log("Dato más reciente:", ts,
      "AQI:", row.aqi, "PM2.5:", row.pm2_5, "PM10:", row.pm10,
      "Hum:", row.humedad, "Temp:", row.temperatura);
  } catch (err) {
    console.warn("fetchLatest error:", err);
  }
}

async function fetchHistory() {
  try {
    const res = await fetch("api_davis.php?type=history", { cache: "no-store" });
    if (!res.ok) return;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return;
    hist.labels = []; hist.aqi = []; hist.pm25 = []; hist.pm10 = [];
    rows.forEach(r => pushHistory(r));
    lastTimestamp = rows[rows.length - 1].hora_sensor_utc;
  } catch (err) {
    console.warn("fetchHistory error:", err);
  }
}

/* ─── INIT ─── */
(async () => {
  await fetchHistory();
  await fetchLatest();
  renderChart();

  // Etiqueta "En vivo"
  document.getElementById("liveLabel").textContent = "En vivo ●";

  // Polling cada 30 s
  setInterval(fetchLatest, 30000);
})();
</script>
</body>
</html>
