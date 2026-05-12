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

    res.status(400).json({ error: 'type must be latest or history' })
  } catch (err) {
    console.error('API error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => console.log(`Backend corriendo en http://localhost:${PORT}`))
