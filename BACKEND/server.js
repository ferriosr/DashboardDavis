import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { writeFileSync } from 'fs'

const app = express()
const PORT = process.env.PORT || 3001

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PREDICT_SCRIPT = path.join(__dirname, 'predict_model.py')

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Faltan SUPABASE_URL o SUPABASE_KEY en .env')
  process.exit(1)
}

app.use(cors())
app.use(express.json())
app.use(express.raw({ type: 'video/*', limit: '100mb' }))
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  next()
})

async function supabaseFetch(path) {
  const res = await fetch(path, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`Supabase ${res.status}`)
  return res.json()
}

function runPythonPrediction(features) {
  return new Promise((resolve, reject) => {
    const pythonCmd = process.platform === 'win32' ? 'py' : 'python'
    const proc = spawn(pythonCmd, [PREDICT_SCRIPT], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    proc.on('error', (err) => {
      reject(new Error(`Error al ejecutar Python: ${err.message}`))
    })

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python exited ${code}: ${stderr}`))
      }
      try {
        resolve(JSON.parse(stdout))
      } catch (err) {
        reject(new Error(`JSON parse failed: ${err.message}\n${stdout}`))
      }
    })

    proc.stdin.write(JSON.stringify(features))
    proc.stdin.end()
  })
}

function floorTo15(date) {
  const minutes = date.getUTCMinutes()
  const floored = Math.floor(minutes / 15) * 15
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    floored,
    0,
    0,
  ))
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min)
}

app.get('/api/modelo/simulacion', async (req, res) => {
  try {
    const now = new Date()
    const blocks = []
    for (let i = 4; i >= 0; i -= 1) {
      const date = new Date(now.getTime() - i * 15 * 60 * 1000)
      blocks.push({
        date,
        pm25: randomBetween(25, 70),
        pm10: randomBetween(40, 80),
        temp: randomBetween(24, 31),
        hum: randomBetween(30, 55),
        aqi: randomBetween(60, 110),
        pm1: randomBetween(15, 45),
      })
    }

    const current = blocks[4]
    const h1 = blocks[3]
    const h2 = blocks[2]
    const h3 = blocks[1]
    const actualNext = {
      date: new Date(now.getTime() + 15 * 60 * 1000),
      pm25: +Math.max(0, Math.min(250, current.pm25 + randomBetween(-5, 12))).toFixed(2),
      pm10: +Math.max(0, Math.min(300, current.pm10 + randomBetween(-10, 15))).toFixed(2),
      temp: +Math.max(0, Math.min(40, current.temp + randomBetween(-1.5, 1.5))).toFixed(2),
      hum: +Math.max(0, Math.min(100, current.hum + randomBetween(-4, 4))).toFixed(2),
      aqi: +Math.max(0, Math.min(200, current.aqi + randomBetween(-10, 12))).toFixed(2),
      pm1: +Math.max(0, Math.min(80, current.pm1 + randomBetween(-4, 8))).toFixed(2),
    }

    const recentBlocks = [h1, h2, h3, current].map((block) => ({
      date: block.date.toISOString(),
      pm25: +block.pm25.toFixed(2),
      pm10: +block.pm10.toFixed(2),
    }))

    const features = {
      temp: current.temp,
      hum: current.hum,
      pm10: current.pm10,
      aqi: current.aqi,
      pm1: current.pm1,
      pm25_lag_1: current.pm25,
      pm10_lag_1: current.pm10,
      pm25_lag_2: h1.pm25,
      pm10_lag_2: h1.pm10,
      pm25_lag_3: h2.pm25,
      pm10_lag_3: h2.pm10,
      diff_pm25: current.pm25 - h1.pm25,
      rolling_mean_pm25: average([current.pm25, h1.pm25, h2.pm25, h3.pm25]),
      rolling_std_pm25: Math.sqrt(
        average([
          current.pm25,
          h1.pm25,
          h2.pm25,
          h3.pm25,
        ].map((value) => Math.pow(value - average([current.pm25, h1.pm25, h2.pm25, h3.pm25]), 2))),
      ),
      hour: current.date.getUTCHours(),
      day_of_week: current.date.getUTCDay(),
      time_gap: 15.0,
    }

    const pythonResult = await runPythonPrediction(features)
    const prediction = +pythonResult.prediction.toFixed(2)
    const actualValue = actualNext.pm25
    const delta = +((actualValue - prediction).toFixed(2))

    const response = {
      simulation: true,
      simulatedAt: now.toISOString(),
      modelName: pythonResult.modelName,
      prediction,
      threshold: pythonResult.threshold,
      features,
      recentBlocks,
      actualNext,
    }

    if (req.query.validate === 'true') {
      response.delta = delta
      response.canRelease = actualValue <= prediction
      response.recommendation = actualValue <= prediction
        ? 'La simulación indica que el valor real de referencia queda por debajo de la predicción; por ahora puedes relajar la alerta.'
        : 'La simulación indica que el valor real de referencia supera la predicción; mantén la alerta activa.'
    }

    return res.json(response)
  } catch (err) {
    console.error('Simulación error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/modelo', async (req, res) => {
  try {
    const url =
      `${SUPABASE_URL}/rest/v1/lecturas_davis` +
      `?select=hora_sensor_utc,pm2_5,pm10,temperatura,humedad,aqi,pm1` +
      `&order=hora_sensor_utc.desc&limit=50`

    const rows = await supabaseFetch(url)
    if (!rows?.length) {
      return res.status(404).json({ error: 'No se encontraron datos de Davis' })
    }

    const bucketsMap = new Map()
    for (const row of rows) {
      const dt = new Date(row.hora_sensor_utc.replace(' ', 'T') + 'Z')
      if (Number.isNaN(dt.getTime())) continue

      const key = floorTo15(dt).toISOString()
      const bucket = bucketsMap.get(key) ?? {
        date: new Date(key),
        pm25: [],
        pm10: [],
        temp: [],
        hum: [],
        aqi: [],
        pm1: [],
      }

      bucket.pm25.push(parseFloat(row.pm2_5) || 0)
      bucket.pm10.push(parseFloat(row.pm10) || 0)
      bucket.temp.push(parseFloat(row.temperatura) || 0)
      bucket.hum.push(parseFloat(row.humedad) || 0)
      bucket.aqi.push(parseFloat(row.aqi) || 0)
      bucket.pm1.push(parseFloat(row.pm1) || 0)
      bucketsMap.set(key, bucket)
    }

    const buckets = Array.from(bucketsMap.values()).sort((a, b) => b.date - a.date)
    if (buckets.length < 4) {
      return res.status(400).json({ error: 'Se requieren al menos 4 bloques de 15 minutos para generar la predicción' })
    }

    const [actual, h1, h2, h3] = buckets
    const recentBlocks = [actual, h1, h2, h3].map((block) => ({
      date: block.date.toISOString(),
      pm25: +average(block.pm25).toFixed(2),
      pm10: +average(block.pm10).toFixed(2),
    }))

    const recentPm25 = [
      average(actual.pm25),
      average(h1.pm25),
      average(h2.pm25),
      average(h3.pm25),
    ]
    const rollingMean = average(recentPm25)
    const rollingStd = Math.sqrt(
      average(recentPm25.map((value) => Math.pow(value - rollingMean, 2)))
    )

    const features = {
      temp: average(actual.temp),
      hum: average(actual.hum),
      pm10: average(actual.pm10),
      aqi: average(actual.aqi),
      pm1: average(actual.pm1),
      pm25_lag_1: average(actual.pm25),
      pm10_lag_1: average(actual.pm10),
      pm25_lag_2: average(h1.pm25),
      pm10_lag_2: average(h1.pm10),
      pm25_lag_3: average(h2.pm25),
      pm10_lag_3: average(h2.pm10),
      diff_pm25: average(actual.pm25) - average(h1.pm25),
      rolling_mean_pm25: rollingMean,
      rolling_std_pm25: rollingStd,
      hour: actual.date.getUTCHours(),
      day_of_week: actual.date.getUTCDay(),
      time_gap: 15.0,
    }

    const pythonResult = await runPythonPrediction(features)
    return res.json({
      modelName: pythonResult.modelName,
      prediction: +pythonResult.prediction.toFixed(2),
      threshold: pythonResult.threshold,
      features,
      recentBlocks,
    })
  } catch (err) {
    console.error('Modelo error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/modelo/validacion', async (req, res) => {
  try {
    const url =
      `${SUPABASE_URL}/rest/v1/lecturas_davis` +
      `?select=hora_sensor_utc,pm2_5,pm10,temperatura,humedad,aqi,pm1` +
      `&order=hora_sensor_utc.desc&limit=60`

    const rows = await supabaseFetch(url)
    if (!rows?.length) {
      return res.status(404).json({ error: 'No se encontraron datos de Davis para validación' })
    }

    const bucketsMap = new Map()
    for (const row of rows) {
      const dt = new Date(row.hora_sensor_utc.replace(' ', 'T') + 'Z')
      if (Number.isNaN(dt.getTime())) continue

      const key = floorTo15(dt).toISOString()
      const bucket = bucketsMap.get(key) ?? {
        date: new Date(key),
        pm25: [],
        pm10: [],
        temp: [],
        hum: [],
        aqi: [],
        pm1: [],
      }

      bucket.pm25.push(parseFloat(row.pm2_5) || 0)
      bucket.pm10.push(parseFloat(row.pm10) || 0)
      bucket.temp.push(parseFloat(row.temperatura) || 0)
      bucket.hum.push(parseFloat(row.humedad) || 0)
      bucket.aqi.push(parseFloat(row.aqi) || 0)
      bucket.pm1.push(parseFloat(row.pm1) || 0)
      bucketsMap.set(key, bucket)
    }

    const buckets = Array.from(bucketsMap.values()).sort((a, b) => b.date - a.date)
    if (buckets.length < 5) {
      return res.status(400).json({ error: 'Se requieren al menos 5 bloques de 15 minutos para validar la predicción con el siguiente valor real' })
    }

    const [actualNext, current, h1, h2, h3] = buckets
    const recentBlocks = [actualNext, current, h1, h2, h3].map((block) => ({
      date: block.date.toISOString(),
      pm25: +average(block.pm25).toFixed(2),
      pm10: +average(block.pm10).toFixed(2),
    }))

    const currentPm25 = average(current.pm25)
    const h1Pm25 = average(h1.pm25)
    const h2Pm25 = average(h2.pm25)
    const h3Pm25 = average(h3.pm25)

    const features = {
      temp: average(current.temp),
      hum: average(current.hum),
      pm10: average(current.pm10),
      aqi: average(current.aqi),
      pm1: average(current.pm1),
      pm25_lag_1: currentPm25,
      pm10_lag_1: average(current.pm10),
      pm25_lag_2: h1Pm25,
      pm10_lag_2: average(h1.pm10),
      pm25_lag_3: h2Pm25,
      pm10_lag_3: average(h2.pm10),
      diff_pm25: currentPm25 - h1Pm25,
      rolling_mean_pm25: average([currentPm25, h1Pm25, h2Pm25, h3Pm25]),
      rolling_std_pm25: Math.sqrt(
        average([currentPm25, h1Pm25, h2Pm25, h3Pm25].map((value) => Math.pow(value - average([currentPm25, h1Pm25, h2Pm25, h3Pm25]), 2)))
      ),
      hour: current.date.getUTCHours(),
      day_of_week: current.date.getUTCDay(),
      time_gap: 15.0,
    }

    const pythonResult = await runPythonPrediction(features)
    const prediction = +pythonResult.prediction.toFixed(2)
    const actualValue = +average(actualNext.pm25).toFixed(2)
    const delta = +((actualValue - prediction).toFixed(2))
    const absDelta = Math.abs(delta)
    const isBelowThreshold = actualValue <= pythonResult.threshold

    const recommendation = isBelowThreshold
      ? 'El valor real quedó por debajo del umbral del modelo; puedes relajar la alerta parcialmente.'
      : actualValue <= prediction
        ? 'El valor real quedó por debajo de la predicción, pero sigue cerca del umbral. Mantén vigilancia moderada.'
        : 'El valor real superó la predicción. Conserva la alerta activa y revisa posibles incrementos.'

    return res.json({
      modelName: pythonResult.modelName,
      prediction,
      threshold: pythonResult.threshold,
      features,
      recentBlocks,
      actualNext: {
        date: actualNext.date.toISOString(),
        pm25: actualValue,
        pm10: +average(actualNext.pm10).toFixed(2),
      },
      delta,
      absDelta,
      canRelease: actualValue <= prediction,
      recommendation,
    })
  } catch (err) {
    console.error('Validación error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/video/stream', async (req, res) => {
  try {
    const metadata = req.headers['x-video-metadata']
    const videoData = req.body

    if (!videoData || videoData.length === 0) {
      return res.status(400).json({ error: 'No video data received' })
    }

    const timestamp = Date.now()
    const filename = `video_${timestamp}.mp4`
    const filepath = path.join(__dirname, 'uploads', filename)

    try {
      writeFileSync(filepath, videoData)
    } catch (err) {
      console.warn('Could not save video file locally:', err.message)
    }

    const response = {
      status: 'received',
      timestamp,
      filename,
      videoSize: videoData.length,
      metadata: metadata ? JSON.parse(metadata) : null,
    }

    console.log(`Video stream received: ${filename} (${videoData.length} bytes)`)
    return res.json(response)
  } catch (err) {
    console.error('Video stream error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/video/metadata', async (req, res) => {
  try {
    const { 
      source, 
      latitude, 
      longitude, 
      altitude, 
      camera, 
      resolution, 
      fps, 
      quality,
      extra 
    } = req.body

    if (!source) {
      return res.status(400).json({ error: 'source is required' })
    }

    const metadata = {
      timestamp: new Date().toISOString(),
      source,
      location: { latitude, longitude, altitude },
      camera: { name: camera, resolution, fps, quality },
      extra,
    }

    console.log('Video metadata received:', metadata)
    return res.json({ status: 'metadata received', metadata })
  } catch (err) {
    console.error('Metadata error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/video/status', async (req, res) => {
  try {
    return res.json({
      status: 'online',
      endpoints: {
        'POST /api/video/stream': 'Send video binary data with metadata in X-Video-Metadata header',
        'POST /api/video/metadata': 'Send video metadata (JSON body)',
        'GET /api/video/status': 'Check video stream service status',
      },
      examples: {
        curl_stream: 'curl -X POST http://localhost:3001/api/video/stream -H "X-Video-Metadata: {\\"source\\":\\"camera1\\"}" --data-binary @video.mp4',
        python_metadata: 'requests.post("http://localhost:3001/api/video/metadata", json={"source":"camera1", "camera":"IP Camera"})',
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/davis', async (req, res) => {
  const type = req.query.type ?? 'latest'

  try {
    if (type === 'latest') {
      const url = `${SUPABASE_URL}/rest/v1/lecturas_davis?select=*&order=hora_sensor_utc.desc&limit=1`
      const rows = await supabaseFetch(url)
      return res.json(rows?.length ? rows[0] : null)
    }

    if (type === 'history') {
      const since = new Date(Date.now() - 3 * 60 * 60 * 1000)
        .toISOString()
        .replace('T', ' ')
        .slice(0, 19)
      const url =
        `${SUPABASE_URL}/rest/v1/lecturas_davis` +
        `?select=hora_sensor_utc,aqi,pm2_5,pm10` +
        `&order=hora_sensor_utc.asc` +
        `&hora_sensor_utc=gte.${encodeURIComponent(since)}` +
        `&limit=180`
      const rows = await supabaseFetch(url)
      return res.json(rows ?? [])
    }

    if (type === 'historico') {
      const fromDate = req.query.from  // optional YYYY-MM-DD
      const toDate   = req.query.to    // optional YYYY-MM-DD

      const allRows = []
      const batchSize = 1000
      let offset = 0
      while (true) {
        let url =
          `${SUPABASE_URL}/rest/v1/lecturas_davis` +
          `?select=hora_sensor_utc,aqi,pm1,pm2_5,pm10,temperatura,humedad` +
          `&order=hora_sensor_utc.asc`
        if (fromDate) url += `&hora_sensor_utc=gte.${encodeURIComponent(fromDate + ' 00:00:00')}`
        if (toDate)   url += `&hora_sensor_utc=lte.${encodeURIComponent(toDate + ' 23:59:59')}`
        url += `&limit=${batchSize}&offset=${offset}`
        const rows = await supabaseFetch(url)
        if (!rows?.length) break
        allRows.push(...rows)
        if (rows.length < batchSize) break
        offset += batchSize
      }

      const seen = new Set()
      const uniqueRows = allRows.filter(r => {
        if (seen.has(r.hora_sensor_utc)) return false
        seen.add(r.hora_sensor_utc)
        return true
      })
      allRows.length = 0; allRows.push(...uniqueRows)

      const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
      const monthlyMap = {}
      const hourlyMap = {}
      const dist = { good: 0, moderate: 0, usg: 0, unhealthy: 0, veryUnhealthy: 0 }

      for (const row of allRows) {
        const dt = new Date(row.hora_sensor_utc.replace(' ', 'T') + 'Z')
        const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`
        const h = dt.getUTCHours()
        const aqi = parseFloat(row.aqi) || 0

        if (!monthlyMap[key]) monthlyMap[key] = { aqi: [], pm1: [], pm25: [], pm10: [], temp: [], hum: [] }
        monthlyMap[key].aqi.push(aqi)
        monthlyMap[key].pm1.push(parseFloat(row.pm1) || 0)
        monthlyMap[key].pm25.push(parseFloat(row.pm2_5) || 0)
        monthlyMap[key].pm10.push(parseFloat(row.pm10) || 0)
        monthlyMap[key].temp.push(parseFloat(row.temperatura) || 0)
        monthlyMap[key].hum.push(parseFloat(row.humedad) || 0)

        if (!hourlyMap[h]) hourlyMap[h] = { aqi: [], pm25: [] }
        hourlyMap[h].aqi.push(aqi)
        hourlyMap[h].pm25.push(parseFloat(row.pm2_5) || 0)

        if (aqi <= 50) dist.good++
        else if (aqi <= 100) dist.moderate++
        else if (aqi <= 150) dist.usg++
        else if (aqi <= 200) dist.unhealthy++
        else dist.veryUnhealthy++
      }

      const total = allRows.length
      const pct = n => total > 0 ? +((n / total) * 100).toFixed(1) : 0

      const monthly = Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, d]) => ({
          month,
          aqi: +avg(d.aqi).toFixed(1),
          pm1: +avg(d.pm1).toFixed(1),
          pm25: +avg(d.pm25).toFixed(1),
          pm10: +avg(d.pm10).toFixed(1),
          temp: +avg(d.temp).toFixed(1),
          hum: +avg(d.hum).toFixed(1),
        }))

      const hourly = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        aqi: hourlyMap[h] ? +avg(hourlyMap[h].aqi).toFixed(1) : 0,
        pm25: hourlyMap[h] ? +avg(hourlyMap[h].pm25).toFixed(1) : 0,
      }))

      const allAqi = allRows.map(r => parseFloat(r.aqi) || 0)
      const allPm25 = allRows.map(r => parseFloat(r.pm2_5) || 0)
      const allPm10 = allRows.map(r => parseFloat(r.pm10) || 0)

      return res.json({
        total,
        monthly,
        hourly,
        distribution: {
          good: pct(dist.good),
          moderate: pct(dist.moderate),
          usg: pct(dist.usg),
          unhealthy: pct(dist.unhealthy),
          veryUnhealthy: pct(dist.veryUnhealthy),
        },
        overallAvg: {
          aqi: +avg(allAqi).toFixed(1),
          pm25: +avg(allPm25).toFixed(1),
          pm10: +avg(allPm10).toFixed(1),
          temp: +avg(allRows.map(r => parseFloat(r.temperatura) || 0)).toFixed(1),
          hum: +avg(allRows.map(r => parseFloat(r.humedad) || 0)).toFixed(1),
          maxPm25: allPm25.length ? +Math.max(...allPm25).toFixed(0) : 0,
          maxPm10: allPm10.length ? +Math.max(...allPm10).toFixed(0) : 0,
        },
      })
    }

    if (type === 'heatmap') {
      const from  = req.query.from   // YYYY-MM-DD
      const to    = req.query.to     // YYYY-MM-DD
      const group = req.query.group ?? 'day'  // 'day' | 'month'

      if (!from || !to) return res.status(400).json({ error: 'from and to are required' })

      const fromTs = `${from} 00:00:00`
      const toTs   = `${to} 23:59:59`

      const allRows = []
      const batchSize = 1000
      let offset = 0
      while (true) {
        const url =
          `${SUPABASE_URL}/rest/v1/lecturas_davis` +
          `?select=hora_sensor_utc,aqi` +
          `&order=hora_sensor_utc.asc` +
          `&hora_sensor_utc=gte.${encodeURIComponent(fromTs)}` +
          `&hora_sensor_utc=lte.${encodeURIComponent(toTs)}` +
          `&limit=${batchSize}&offset=${offset}`
        const rows = await supabaseFetch(url)
        if (!rows?.length) break
        allRows.push(...rows)
        if (rows.length < batchSize) break
        offset += batchSize
      }

      const seenHm = new Set()
      const uniqueHm = allRows.filter(r => {
        if (seenHm.has(r.hora_sensor_utc)) return false
        seenHm.add(r.hora_sensor_utc)
        return true
      })
      allRows.length = 0; allRows.push(...uniqueHm)

      const buckets = {}
      for (const row of allRows) {
        const dt  = new Date(row.hora_sensor_utc.replace(' ', 'T') + 'Z')
        const h   = dt.getUTCHours()
        const aqi = parseFloat(row.aqi) || 0
        const key = group === 'month'
          ? `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`
          : `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
        if (!buckets[key]) buckets[key] = {}
        if (!buckets[key][h]) buckets[key][h] = []
        buckets[key][h].push(aqi)
      }

      const labels = Object.keys(buckets).sort()
      const avgArr = arr => arr.reduce((a, b) => a + b, 0) / arr.length

      const matrix = Array.from({ length: 24 }, (_, h) =>
        labels.map(lbl => {
          const arr = buckets[lbl]?.[h]
          return arr?.length ? +avgArr(arr).toFixed(1) : null
        })
      )

      const allAqi = allRows.map(r => parseFloat(r.aqi) || 0)
      const globalAvg = allAqi.length ? +(allAqi.reduce((a, b) => a + b, 0) / allAqi.length).toFixed(1) : 0

      return res.json({
        labels,
        matrix,
        total: allRows.length,
        summary: {
          avg: globalAvg,
          min: allAqi.length ? +Math.min(...allAqi).toFixed(1) : 0,
          max: allAqi.length ? +Math.max(...allAqi).toFixed(1) : 0,
        },
      })
    }

    res.status(400).json({ error: 'type must be latest, history, historico, or heatmap' })
  } catch (err) {
    console.error('API error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => console.log(`Backend corriendo en http://localhost:${PORT}`))
