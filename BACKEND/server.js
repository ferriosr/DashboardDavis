import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 3001

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Faltan SUPABASE_URL o SUPABASE_KEY en .env')
  process.exit(1)
}

app.use(cors())
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
