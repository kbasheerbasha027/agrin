import cors from 'cors'
import express from 'express'
import { z } from 'zod'
import { buildAdvisory, cropRecommendations, farmHealthScore, generateAlerts, type FarmContext } from './domain.js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const app = express()
const port = Number(process.env.PORT ?? 4174)
app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))

const farm: FarmContext & { id: string; name: string; farmer: string; village: string; district: string; country: string; latitude: number; longitude: number; cropVariety: string } = {
  id: 'farm-001', name: 'Sundar Field', farmer: 'Ananya Rao', village: 'Waghala', district: 'Nanded', country: 'India',
  latitude: 19.1383, longitude: 77.3210, crop: 'Cotton', cropVariety: 'Bt cotton', cropStage: 'Flowering',
  soilType: 'Black cotton', irrigation: 'Drip', previousCrop: 'Legumes', farmSizeHa: 2.4,
  weather: { precipitationProbability: 88, rainfallMm: 12, temperatureC: 31, humidity: 67, windKph: 9 },
}
const weather = {
  ...farm.weather, feelsLikeC: 33, description: 'Clouds building', provider: 'Offline demo weather',
  forecast: [
    { day: 'Today', high: 31, low: 23, rain: 88, mm: 12 }, { day: 'Tue', high: 29, low: 22, rain: 68, mm: 8 },
    { day: 'Wed', high: 30, low: 22, rain: 35, mm: 3 }, { day: 'Thu', high: 32, low: 23, rain: 18, mm: 0 },
    { day: 'Fri', high: 33, low: 24, rain: 12, mm: 0 }, { day: 'Sat', high: 32, low: 23, rain: 25, mm: 1 },
    { day: 'Sun', high: 31, low: 23, rain: 42, mm: 4 },
  ],
}
const storagePath = join(process.cwd(), 'data', 'demo-store.json')
type StoredData = { activities: Array<{ id: string; type: string; note: string; date: string }>; diagnoses: Array<{ id: string; crop: string; symptoms: string[]; result: string; confidence: string; date: string }> }
const seed: StoredData = {
  activities: [
    { id: 'a1', type: 'Sowing', note: 'Cotton sowing recorded', date: '2026-06-18' },
    { id: 'a2', type: 'Irrigation', note: 'Drip irrigation, 3 hours', date: '2026-09-25' },
    { id: 'a3', type: 'Field check', note: 'Flowering stage observed', date: '2026-09-27' },
  ],
  diagnoses: [{ id: 'd1', crop: 'Cotton', symptoms: ['Leaf spots'], result: 'Possible fungal leaf spot', confidence: 'Low', date: '2026-09-21' }],
}
function readStore(): StoredData {
  try { return JSON.parse(readFileSync(storagePath, 'utf8')) as StoredData } catch { mkdirSync(dirname(storagePath), { recursive: true }); writeFileSync(storagePath, JSON.stringify(seed, null, 2)); return structuredClone(seed) }
}
let store = readStore()
function saveStore() { mkdirSync(dirname(storagePath), { recursive: true }); writeFileSync(storagePath, JSON.stringify(store, null, 2)) }
const alerts = generateAlerts(weather)

app.get('/api/health', (_req, res) => res.json({ status: 'ok', mode: 'offline-demo', timestamp: new Date().toISOString() }))
app.get('/api/farms', (_req, res) => res.json([farm]))
app.get('/api/weather', (_req, res) => res.json(weather))
app.get('/api/soil', (_req, res) => res.json({ soilType: farm.soilType, provider: 'Farmer profile', measurements: { ph: null, organicMatter: null, nitrogen: null, phosphorus: null, potassium: null, moisture: null }, missing: ['pH', 'organic matter', 'N', 'P', 'K', 'moisture'], message: 'More data needed: no lab or sensor measurements are on file.' }))
app.get('/api/crops', (_req, res) => res.json(cropRecommendations({ soilType: farm.soilType, rainfallMm: weather.rainfallMm, temperatureC: weather.temperatureC, irrigation: farm.irrigation, previousCrop: farm.previousCrop })))
app.get('/api/advisories', (_req, res) => res.json(buildAdvisory(farm)))
app.get('/api/alerts', (_req, res) => res.json(alerts))
app.get('/api/disease', (_req, res) => res.json(store.diagnoses))
app.get('/api/satellite', (_req, res) => res.json({ provider: 'DemoSatelliteProvider', label: 'Demo Satellite Data', vegetationIndex: 0.68, previousIndex: 0.71, trend: -0.03, observedAt: '2026-09-27', history: [0.72, 0.73, 0.71, 0.70, 0.70, 0.69, 0.68], note: 'Synthetic demonstration values. Vegetation index is an indicator, not a direct diagnosis.' }))
app.get('/api/dashboard', (_req, res) => res.json({ farm, weather, health: farmHealthScore(farm), alerts, activities: store.activities, mode: 'Offline Demo Mode' }))
app.get('/api/officer', (_req, res) => res.json({ farms: 248, atRisk: 31, diseaseHotspots: 4, waterStress: 18, district: 'Nanded', alerts: alerts.length, priority: alerts }))
app.post('/api/demo/reset', (_req, res) => { store = structuredClone(seed); saveStore(); res.json({ ok: true, message: 'Demo farm reloaded', farm }) })
app.post('/api/activities', (req, res) => {
  const parsed = z.object({ type: z.string().trim().min(2).max(40), note: z.string().trim().min(3).max(240) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Activity needs a type and a note (3-240 characters).' })
  const activity = { id: crypto.randomUUID(), ...parsed.data, date: new Date().toISOString().slice(0, 10) }
  store.activities.unshift(activity); saveStore(); return res.status(201).json(activity)
})
app.post('/api/disease', (req, res) => {
  const parsed = z.object({ crop: z.string().trim().min(2).max(50), symptoms: z.array(z.string().max(50)).min(1).max(8) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Choose a crop and at least one visible symptom.' })
  const hasSpots = parsed.data.symptoms.some((symptom) => /spot|mold|powder/i.test(symptom))
  const diagnosis = { id: crypto.randomUUID(), crop: parsed.data.crop, symptoms: parsed.data.symptoms, result: hasSpots ? 'Possible fungal leaf spot' : 'Visual stress indicator; cause unclear', confidence: 'Low', date: new Date().toISOString().slice(0, 10) }
  store.diagnoses.unshift(diagnosis); saveStore()
  return res.status(201).json({ ...diagnosis, causes: ['Weather stress', 'Nutrient imbalance', 'Pathogen (unconfirmed)'], action: 'Photograph both sides of affected leaves and compare across several plants. Seek local agronomy support before treatment.', prevention: 'Avoid wetting foliage late in the day; maintain field airflow.', model: 'Rule-based demo triage, not image-recognition AI.' })
})
app.use((_req, res) => res.status(404).json({ error: 'API route not found' }))
app.listen(port, () => console.log(`AgriN API listening at http://localhost:${port}`))
