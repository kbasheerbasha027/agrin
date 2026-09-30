import { createContext, startTransition, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, Check, ChevronDown,
  CloudRain, Droplets, FileText, Globe2, Leaf, LocateFixed, Map as MapIcon, Maximize2, Menu, Mic,
  Minimize2, Search, ShieldCheck, Sprout, Tractor, TrendingDown, Wind, X,
} from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CircleMarker, MapContainer, Polygon, Popup, TileLayer, useMap } from 'react-leaflet'
import type { LatLngTuple, Map as LeafletMap } from 'leaflet'
import NationalDashboard from './NationalDashboard'
import 'leaflet/dist/leaflet.css'
import './App.css'

type Farm = { id: string; name: string; farmer: string; village: string; district: string; country: string; latitude: number; longitude: number; crop: string; cropVariety: string; cropStage: string; soilType: string; irrigation: string; previousCrop: string; farmSizeHa: number }
type AlertItem = { id: string; level: string; title: string; why: string; action: string }
type Advisory = { category: string; action: string; why: string; confidence: string; data: string }
type CropResult = { name: string; score: number; water: string; rotation: string; reason: string }
type Dashboard = { farm: Farm; weather: { temperatureC: number; feelsLikeC: number; humidity: number; windKph: number; rainfallMm: number; precipitationProbability: number; description: string; forecast: { day: string; high: number; low: number; rain: number; mm: number }[] }; health: { score: number; components: Record<string, number> }; alerts: AlertItem[]; activities: { id: string; type: string; note: string; date: string }[] }
type OfficerSummary = { farms: number; atRisk: number; diseaseHotspots: number; waterStress: number; district: string; alerts: number; priority: AlertItem[] }
type Diagnosis = { id: string; crop: string; symptoms: string[]; result: string; confidence: string; date: string; action?: string; prevention?: string; model?: string }
type NotificationItem = { id: string; title: string; message: string; priority: 'high' | 'medium' | 'low'; read: boolean; destination: string }
type SatelliteData = { provider: string; label: string; vegetationIndex: number; previousIndex: number; trend: number; observedAt: string; history: number[]; note: string }
type AdvisorReply = { title: string; answer: string; confidence: string; source: string }

const smartSuiteData = {
  calendar: [
    { stage: 'Land preparation', status: 'Complete', note: 'Ploughing and field levelling ready for sowing' },
    { stage: 'Sowing', status: 'Complete', note: 'Bt cotton sown on 2026-06-18' },
    { stage: 'Germination', status: 'Complete', note: 'Stand establishment stable across field' },
    { stage: 'Irrigation', status: 'Active', note: 'Light irrigation delayed due to rain watch' },
    { stage: 'Fertilizer', status: 'Due soon', note: 'Top dress N after canopy assessment' },
    { stage: 'Pest monitoring', status: 'Scheduled', note: 'Check thrips and bollworm hotspots every 3 days' },
    { stage: 'Disease monitoring', status: 'Monitoring', note: 'Leaf spot checks on lower canopy' },
    { stage: 'Flowering', status: 'Current', note: 'Critical stage for boll retention and pollination' },
    { stage: 'Harvesting', status: 'Forecast', note: 'Expected in 20-30 days' },
  ],
  pestRisk: {
    level: 'MEDIUM',
    why: 'Humidity remains moderate, flowering is active, and local weather supports pest pressure.',
    monitor: ['Thrips pressure in new growth', 'Bollworm activity on flowering plants', 'Leaf hopper movement after rain showers'],
    confidence: 'Medium',
    evidence: 'Weather + crop stage + historical local patterns + pest notes',
  },
  harvest: {
    window: 'Oct 12 - Oct 22, 2026',
    maturity: '82% mature',
    risks: ['Late rainfall could delay opening of bolls', 'Market volatility around harvest window', 'Warm nights may increase stress if irrigation is reduced'],
    confidence: 'Model prediction',
  },
  market: [
    { market: 'Nanded APMC', price: '₹5,630 / quintal', trend: '+7% vs last month' },
    { market: 'Parbhani mandi', price: '₹5,480 / quintal', trend: '+4% vs last month' },
    { market: 'Hingoli market', price: '₹5,710 / quintal', trend: '+8% vs last month' },
  ],
  profitability: {
    revenue: '₹2,24,000',
    expenses: [
      { label: 'Seed', value: '₹18,000' },
      { label: 'Fertilizer', value: '₹27,500' },
      { label: 'Irrigation', value: '₹16,200' },
      { label: 'Labour', value: '₹34,000' },
      { label: 'Other', value: '₹21,000' },
    ],
    roi: '18.6%',
    breakEven: '2.6 seasons',
    estimate: 'AI-based estimate; actual returns depend on yield, grade, and market access.',
  },
  water: {
    recommendation: 'Reduce irrigation',
    status: 'Rainfall is likely to cover near-term water demand',
    trend: [
      { label: 'Rainfall', value: 'Strong' },
      { label: 'Water stress', value: 'Low' },
      { label: 'Availability', value: 'Moderate' },
    ],
    data: 'Rainfall, crop water demand, irrigation history, root-zone moisture proxy',
  },
  soil: {
    current: [
      { label: 'pH', value: '6.4' },
      { label: 'Organic matter', value: '1.9%' },
      { label: 'Moisture', value: '24%' },
      { label: 'Nutrients', value: 'Balanced' },
    ],
    trend: 'Organic matter stable; nitrogen slightly below target in the northern block.',
    recommendation: 'Apply compost and reduce bare-soil exposure between rows.',
  },
  carbon: {
    soilImprovement: 'Moderate',
    waterSavings: 'Good',
    chemicalInput: 'Lower than last season',
    biodiversity: 'Improving',
    estimate: 'Estimated climate impact',
  },
  riskProfile: {
    weather: 'Medium',
    water: 'Low',
    disease: 'Medium',
    pest: 'Medium',
    crop: 'Low',
    market: 'Medium',
    soil: 'Medium',
    overall: 'Medium',
    actions: ['Keep drains clear', 'Monitor flowering-stage plants', 'Stage irrigation to rainfall updates'],
  },
  simulator: {
    scenario: 'rainfall decreases by 25%',
    cropSuitability: 'Sorghum suitability rises to 82%',
    waterRequirement: '+14% water stress',
    risk: 'Weather and crop risk increase to medium-high',
    harvestWindow: 'Expected harvest shifts by 7-10 days later',
    farmHealth: 'Farm health drops from 81 to 73 in this simulation',
  },
  rotation: {
    recommendation: 'Sorghum next season',
    reasoning: 'Black cotton soil and prior legume history support a cereal rotation that can improve nutrient balance and reduce pest carry-over.',
    regen: ['Diversifies the crop sequence', 'Potentially lowers disease pressure', 'Can improve soil structure in rotation'],
  },
  digitalTwin: {
    location: 'Nanded, Maharashtra',
    crop: 'Cotton / Flowering',
    soil: 'Black cotton, moderate moisture',
    weather: 'Storm risk + high humidity',
    water: 'Drip, with rainfall buffer',
    risk: 'Medium overall',
  },
  tasks: {
    today: ['Check 5 plants per zone for pest signs', 'Review drainage channel before evening shower', 'Confirm fertilizer timing after rainfall'],
    upcoming: ['Week 2: targeted disease scouting', 'Week 3: calibration of drip lines', 'Week 4: preparation for harvest forecast'],
    completed: ['Sowing recorded', 'Soil test logged', 'Rain watch acknowledged'],
  },
  knowledge: ['Crop stage guidance', 'Disease monitoring', 'Soil health root causes', 'Irrigation efficiency'],
  community: [
    { author: 'Sharad Patil', note: 'Leaf hopper pressure increased after three cloudy days in nearby villages.' },
    { author: 'Meera Kulkarni', note: 'Farmers in the west block are reporting better drainage after residue cover.' },
  ],
  localAlerts: [
    { title: 'Rainfall alert', region: 'Nanded district', detail: 'Heavy showers expected in the next 24 hours; clear drains and postpone top dressing.' },
    { title: 'Pest watch', region: 'Parbhani belt', detail: 'Scouting suggested rising bollworm pressure in flowering crops.' },
  ],
  resourcePlanner: {
    seeds: '420 kg',
    fertilizer: '220 kg NPK',
    water: '1.8 ML',
    labour: '18 person-days',
    equipment: '3 tractor days',
  },
}

const demoDashboard: Dashboard = {
  farm: { id: 'farm-001', name: 'Sundar Field', farmer: 'Ananya Rao', village: 'Waghala', district: 'Nanded', country: 'India', latitude: 19.1383, longitude: 77.321, crop: 'Cotton', cropVariety: 'Bt cotton', cropStage: 'Flowering', soilType: 'Black cotton', irrigation: 'Drip', previousCrop: 'Legumes', farmSizeHa: 2.4 },
  weather: { temperatureC: 31, feelsLikeC: 33, humidity: 67, windKph: 9, rainfallMm: 12, precipitationProbability: 88, description: 'Clouds building', forecast: [{ day: 'Today', high: 31, low: 23, rain: 88, mm: 12 }, { day: 'Tue', high: 29, low: 22, rain: 68, mm: 8 }, { day: 'Wed', high: 30, low: 22, rain: 35, mm: 3 }, { day: 'Thu', high: 32, low: 23, rain: 18, mm: 0 }, { day: 'Fri', high: 33, low: 24, rain: 12, mm: 0 }, { day: 'Sat', high: 32, low: 23, rain: 25, mm: 1 }, { day: 'Sun', high: 31, low: 23, rain: 42, mm: 4 }] },
  health: { score: 81, components: { crop: 84, water: 88, weather: 68, soil: 72, disease: 86, regenerative: 82 } },
  alerts: [{ id: 'rain-watch', level: 'high', title: 'Heavy rain watch', why: '12 mm forecast with 78% precipitation probability.', action: 'Pause irrigation, clear field drains, and delay fertilizer application.' }, { id: 'field-check', level: 'low', title: 'Flowering-stage field check', why: 'Cotton is in a sensitive flowering period.', action: 'Inspect five plants in each field zone for leaf spots or wilting.' }],
  activities: [{ id: 'a1', type: 'Sowing', note: 'Cotton sowing recorded', date: '2026-06-18' }, { id: 'a2', type: 'Irrigation', note: 'Drip irrigation, 3 hours', date: '2026-09-25' }, { id: 'a3', type: 'Field check', note: 'Flowering stage observed', date: '2026-09-27' }],
}
const demoOfficerSummary: OfficerSummary = { farms: 248, atRisk: 31, diseaseHotspots: 4, waterStress: 18, district: 'Nanded', alerts: demoDashboard.alerts.length, priority: demoDashboard.alerts }
const demoAdvisories: Advisory[] = [
  { category: 'Water', action: 'Delay irrigation until the rain forecast clears.', why: 'Forecast rainfall may meet near-term crop water needs.', confidence: 'Medium', data: 'Local demo weather; crop stage; irrigation type' },
  { category: 'Crop care', action: 'Inspect five plants in each field zone for leaf spots or wilting.', why: 'A short, repeatable field check can catch visible changes early.', confidence: 'Medium', data: 'Crop and growth stage from farm profile' },
  { category: 'Soil', action: 'Keep crop residue on the soil surface where practical.', why: 'Residue cover can reduce bare-soil exposure and help limit evaporation.', confidence: 'Medium', data: 'Farm profile; regenerative practice guidance' },
]
const demoCrops: CropResult[] = [
  { name: 'Sorghum', score: 86, water: 'Low', rotation: 'Medium', reason: 'Fits black cotton soil and the recorded temperature range.' },
  { name: 'Chickpea', score: 81, water: 'Low', rotation: 'High', reason: 'Good cool-season option; consider sequence after cotton.' },
  { name: 'Maize', score: 70, water: 'Medium', rotation: 'Medium', reason: 'Suitable where rainfall or irrigation is reliable.' },
]
const demoSatellite: SatelliteData = { provider: 'DemoSatelliteProvider', label: 'Demo Satellite Data', vegetationIndex: 0.68, previousIndex: 0.71, trend: -0.03, observedAt: '2026-09-27', history: [0.72, 0.73, 0.71, 0.70, 0.70, 0.69, 0.68], note: 'Synthetic demonstration values. Vegetation index is an indicator, not a direct diagnosis.' }
const SatelliteContext = createContext(demoSatellite)
const navigation = [
  { name: 'Overview', icon: Activity, group: 'FARM' }, { name: 'Smart field suite', icon: Sprout, group: 'FARM' }, { name: 'AI Action Center', icon: ShieldCheck, group: 'FARM' }, { name: 'Farm profile', icon: FileText, group: 'FARM' },
  { name: 'Farm map', icon: MapIcon, group: 'FARM' }, { name: 'AI advisor', icon: Sprout, group: 'FARM' }, { name: 'Regenerative', icon: Leaf, group: 'FARM' },
  { name: 'Crop planner', icon: Tractor, group: 'FARM' }, { name: 'Disease check', icon: ShieldCheck, group: 'FARM' },
  { name: 'Farm timeline', icon: FileText, group: 'FARM' }, { name: 'Officer view', icon: Globe2, group: 'NETWORK' },
  { name: 'National dashboard', icon: Globe2, group: 'NETWORK' }, { name: 'BRICS network', icon: Globe2, group: 'NETWORK' },
]

const pageRouteNames: Record<string, string> = Object.fromEntries(navigation.map((item) => [item.name, item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')]))
const pageFromHash = () => {
  const hash = window.location.hash.replace(/^#/, '').trim().toLowerCase()
  if (!hash) return 'Overview'
  const match = Object.entries(pageRouteNames).find(([, route]) => route === hash)
  return match ? match[0] : 'Overview'
}
const words: Record<string, Record<string, string>> = {
  en: { overview: 'Farm command center', today: 'Today on your farm', actions: "Today's actions", weather: 'Weather outlook', advisor: 'Ask your farm advisor', offline: 'Offline Demo Mode', demo: 'Run demo', map: 'Farm intelligence map' },
  hi: { overview: 'खेत कमांड सेंटर', today: 'आज आपके खेत पर', actions: 'आज के काम', weather: 'मौसम पूर्वानुमान', advisor: 'अपने कृषि सलाहकार से पूछें', offline: 'ऑफ़लाइन डेमो मोड', demo: 'डेमो चलाएँ', map: 'खेत बुद्धिमत्ता मानचित्र' },
  te: { overview: 'వ్యవసాయ నియంత్రణ కేంద్రం', today: 'ఈ రోజు మీ పొలంలో', actions: 'ఈ రోజు పనులు', weather: 'వాతావరణ అంచనా', advisor: 'వ్యవసాయ సలహాదారుని అడగండి', offline: 'ఆఫ్‌లైన్ డెమో మోడ్', demo: 'డెమో ప్రారంభించు', map: 'వ్యవసాయ మ్యాప్' },
}

async function getJson<T>(path: string, fallback: T): Promise<{ data: T; source: 'api' | 'demo' }> {
  try {
    const response = await fetch(`/api${path}`)
    if (!response.ok) throw new Error('API unavailable')
    return { data: await response.json() as T, source: 'api' }
  } catch {
    return { data: fallback, source: 'demo' }
  }
}

type MapLayer = 'Risk' | 'Weather' | 'Vegetation' | 'Disease'
type MapTileStatus = 'loading' | 'ready' | 'error'
type MapRef = { current: LeafletMap | null }
const mapLayers: MapLayer[] = ['Risk', 'Weather', 'Vegetation', 'Disease']

function getFarmBoundary(farm: Farm): LatLngTuple[] {
  const sideMeters = Math.sqrt(farm.farmSizeHa * 10_000)
  const latitudeRadius = sideMeters / (2 * 111_320)
  const longitudeRadius = sideMeters / (2 * 111_320 * Math.cos(farm.latitude * Math.PI / 180))
  return [
    [farm.latitude - latitudeRadius, farm.longitude - longitudeRadius],
    [farm.latitude - latitudeRadius, farm.longitude + longitudeRadius],
    [farm.latitude + latitudeRadius, farm.longitude + longitudeRadius],
    [farm.latitude + latitudeRadius, farm.longitude - longitudeRadius],
  ]
}

function getFarmRiskLevel(dashboard: Dashboard) {
  if (dashboard.alerts.some((alert) => alert.level === 'critical')) return 'Critical'
  if (dashboard.alerts.some((alert) => alert.level === 'high')) return 'High'
  if (dashboard.alerts.some((alert) => alert.level === 'medium')) return 'Medium'
  return 'Low'
}

function MapResizeHandler({ mapRef, farm }: { mapRef?: MapRef; farm: Farm }) {
  const map = useMap()
  useEffect(() => {
    if (mapRef) mapRef.current = map
    const invalidate = () => map.invalidateSize({ pan: false })
    const observer = new ResizeObserver(invalidate)
    observer.observe(map.getContainer())
    window.addEventListener('resize', invalidate)
    const frame = window.requestAnimationFrame(invalidate)
    const timer = window.setTimeout(invalidate, 180)
    map.setView([farm.latitude, farm.longitude], map.getZoom(), { animate: false })
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', invalidate)
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
      if (mapRef?.current === map) mapRef.current = null
    }
  }, [farm.latitude, farm.longitude, map, mapRef])
  return null
}

function FarmMap({ dashboard, layer = 'Risk', mapRef, onTileStatus, hasDiseaseHistory = false }: { dashboard: Dashboard; layer?: MapLayer; mapRef?: MapRef; onTileStatus?: (status: MapTileStatus) => void; hasDiseaseHistory?: boolean }) {
  const failedTiles = useRef(false)
  const satellite = useContext(SatelliteContext)
  const { farm } = dashboard
  const center: LatLngTuple = [farm.latitude, farm.longitude]
  const boundary = getFarmBoundary(farm)
  const riskLevel = getFarmRiskLevel(dashboard)
  const styles: Record<MapLayer, { color: string; fillColor: string; fillOpacity: number }> = {
    Risk: { color: '#a84d3e', fillColor: riskLevel === 'Critical' || riskLevel === 'High' ? '#d87560' : riskLevel === 'Medium' ? '#e4bd69' : '#8caf79', fillOpacity: 0.48 },
    Weather: { color: '#477b9b', fillColor: dashboard.weather.precipitationProbability >= 70 ? '#78b3d0' : '#a5cadc', fillOpacity: 0.48 },
    Vegetation: { color: '#3d6b47', fillColor: satellite.vegetationIndex >= 0.65 ? '#80a95c' : '#d7aa5b', fillOpacity: 0.62 },
    Disease: { color: '#a94442', fillColor: '#d87570', fillOpacity: hasDiseaseHistory ? 0.35 : 0 },
  }
  const tileEventHandlers = useMemo(() => ({
    loading: () => { failedTiles.current = false; onTileStatus?.('loading') },
    load: () => onTileStatus?.(failedTiles.current ? 'error' : 'ready'),
    tileerror: () => { failedTiles.current = true; onTileStatus?.('error') },
  }), [onTileStatus])
  return <MapContainer center={center} zoom={14} scrollWheelZoom={false} className="farm-map" aria-label="Interactive demo farm boundary map">
    <MapResizeHandler mapRef={mapRef} farm={farm} />
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" eventHandlers={tileEventHandlers} />
    <Polygon positions={boundary} pathOptions={{ color: layer === 'Disease' ? '#66806a' : styles[layer].color, weight: 2.5, fillColor: styles[layer].fillColor, fillOpacity: layer === 'Disease' ? 0 : styles[layer].fillOpacity }} />
    <CircleMarker center={center} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: '#315a3b', fillOpacity: 1 }}>
      <Popup><b>{farm.name}</b><br />{farm.village}, {farm.district}, {farm.country}<br />{farm.farmSizeHa} ha · {farm.crop}<br />Health {dashboard.health.score}/100 · {riskLevel} risk</Popup>
    </CircleMarker>
  </MapContainer>
}

function App() {
  const [dashboard, setDashboard] = useState(demoDashboard)
  const [officerSummary, setOfficerSummary] = useState(demoOfficerSummary)
  const [satellite, setSatellite] = useState(demoSatellite)
  const [advisories, setAdvisories] = useState(demoAdvisories)
  const [crops, setCrops] = useState(demoCrops)
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([])
  const [active, setActiveState] = useState(() => pageFromHash())
  const [role, setRole] = useState('Farmer')
  const [language, setLanguage] = useState('en')
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [readAlerts, setReadAlerts] = useState(false)
  const [demoToast, setDemoToast] = useState('')
  const [activityType, setActivityType] = useState('Field check')
  const [activityNote, setActivityNote] = useState('')
  const [photoName, setPhotoName] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [diagnosisResult, setDiagnosisResult] = useState<Diagnosis | null>(null)
  const [layer, setLayer] = useState<MapLayer>('Risk')
  const [mapTileStatus, setMapTileStatus] = useState<MapTileStatus>('loading')
  const [isMapFullscreen, setIsMapFullscreen] = useState(false)
  const mapInstanceRef = useRef<LeafletMap | null>(null)
  const mapFrameRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [voiceMessage, setVoiceMessage] = useState('')
  const [voiceListening, setVoiceListening] = useState(false)
  const [advisorReply, setAdvisorReply] = useState<AdvisorReply | null>(null)
  const [apiStatus, setApiStatus] = useState<'loading' | 'ready' | 'fallback'>('loading')
  const [apiFallbacks, setApiFallbacks] = useState<string[]>([])
  const t = words[language]

  const searchRecords = useMemo(() => {
    const records = [
      { label: dashboard.farm.name, type: 'Farm', destination: 'Farm profile' },
      { label: dashboard.farm.farmer, type: 'Farmer', destination: 'Farm profile' },
      { label: dashboard.farm.district, type: 'District', destination: 'National dashboard' },
      { label: dashboard.farm.crop, type: 'Crop', destination: 'Crop planner' },
      { label: 'Heavy rain watch', type: 'Alert', destination: 'Overview' },
      { label: 'Pest risk', type: 'Risk', destination: 'Smart field suite' },
      { label: 'Disease check', type: 'Disease', destination: 'Disease check' },
      { label: 'Field check', type: 'Activity', destination: 'Farm timeline' },
      ...diagnoses.map((item) => ({ label: item.result, type: 'Disease', destination: 'Disease check' })),
    ]
    return records.filter((record, index) => records.findIndex((candidate) => candidate.label === record.label && candidate.destination === record.destination) === index)
  }, [dashboard, diagnoses])

  async function refresh() {
    startTransition(() => setApiStatus('loading'))
    try {
      const [nextDashboard, nextSatellite, nextOfficer, nextAdvisories, nextCrops, nextDiagnoses] = await Promise.all([
        getJson('/dashboard', demoDashboard), getJson('/satellite', demoSatellite), getJson('/officer', demoOfficerSummary), getJson('/advisories', demoAdvisories), getJson('/crops', demoCrops), getJson('/disease', [] as Diagnosis[]),
      ])
      const fallbackEndpoints = [
        { path: '/dashboard', result: nextDashboard }, { path: '/satellite', result: nextSatellite },
        { path: '/officer', result: nextOfficer }, { path: '/advisories', result: nextAdvisories },
        { path: '/crops', result: nextCrops }, { path: '/disease', result: nextDiagnoses },
      ].filter((endpoint) => endpoint.result.source === 'demo').map((endpoint) => endpoint.path)
      startTransition(() => {
        setDashboard(nextDashboard.data); setSatellite(nextSatellite.data); setOfficerSummary(nextOfficer.data); setAdvisories(nextAdvisories.data); setCrops(nextCrops.data); setDiagnoses(nextDiagnoses.data)
        setApiFallbacks(fallbackEndpoints)
        setApiStatus(fallbackEndpoints.length ? 'fallback' : 'ready')
      })
    } catch {
      startTransition(() => {
        setApiFallbacks(['/dashboard', '/satellite', '/officer', '/advisories', '/crops', '/disease'])
        setApiStatus('fallback')
      })
    }
  }
  useEffect(() => { void refresh() }, [])
  useEffect(() => { if (!photoPreview) return; return () => URL.revokeObjectURL(photoPreview) }, [photoPreview])
  useEffect(() => {
    const handleSearchShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleSearchShortcut)
    return () => window.removeEventListener('keydown', handleSearchShortcut)
  }, [])
  useEffect(() => {
    const syncFullscreen = () => setIsMapFullscreen(document.fullscreenElement === mapFrameRef.current)
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])
  const notifications = useMemo<NotificationItem[]>(() => dashboard.alerts.map((alert, index) => ({
    id: alert.id,
    title: alert.title,
    message: alert.why,
    priority: alert.level === 'high' || alert.level === 'critical' ? 'high' : alert.level === 'medium' ? 'medium' : 'low',
    read: readAlerts || index < 1,
    destination: alert.level === 'high' || alert.level === 'critical' ? 'Farm map' : 'Overview',
  })), [dashboard.alerts, readAlerts])
  const unreadCount = notifications.filter((item) => !item.read).length || (readAlerts ? 0 : dashboard.alerts.filter((alert) => alert.level === 'high' || alert.level === 'critical').length)
  const filteredSearchResults = search.trim() ? searchRecords.filter((item) => item.label.toLowerCase().includes(search.toLowerCase()) || item.type.toLowerCase().includes(search.toLowerCase())).slice(0, 6) : []
  const actionCenter = useMemo(() => [
    { group: 'DO NOW', items: [{ title: 'Clear field drains before evening rain', detail: 'Rainfall probability is high and local drainage routes need to be checked to prevent standing water.', reason: 'Weather risk + crop stage + saturated soil signals', confidence: 'Medium' }, { title: 'Pause non-essential irrigation', detail: 'Your drip system should stay light or off until the rain window clears.', reason: 'Forecast rainfall and current moisture levels', confidence: 'High' }] },
    { group: 'DO TODAY', items: [{ title: 'Inspect five plants in each field zone', detail: 'Check for wilting, yellowing, and pest signs on flowering cotton plants.', reason: 'Crop stage and local demo notes', confidence: 'Medium' }, { title: 'Confirm fertilizer timing after drainage check', detail: 'Delay top-dressing until the soil drains and the next irrigation slot is clear.', reason: 'Local weather + crop demand window', confidence: 'Medium' }] },
    { group: 'THIS WEEK', items: [{ title: 'Review residue cover and soil traffic', detail: 'Keep traffic off wet areas while the field remains soft.', reason: 'Soil moisture + early warning risk', confidence: 'Medium' }, { title: 'Prepare for a short market watch', detail: 'Monitor local mandi prices near the forecast harvest window.', reason: 'Market volatility + field readiness', confidence: 'Low' }] },
    { group: 'MONITOR', items: [{ title: 'Watch pest pressure around flowering zones', detail: 'Continue scouting near the north and west blocks after rainfall.', reason: 'Humidity and flowering stages align', confidence: 'Medium' }, { title: 'Track soil moisture near the drip line', detail: 'Compare current readings with rainfall to avoid overwatering.', reason: 'Water demand + rain forecast', confidence: 'High' }] },
  ], [])

  function setActive(page: string) {
    setActiveState(page)
    if (page === 'Farm map') setMapTileStatus('loading')
    const route = pageRouteNames[page] ?? 'overview'
    if (window.location.hash !== `#${route}`) {
      window.history.pushState({}, '', `#${route}`)
    }
  }

  function navigateTo(page: string) { setActive(page) }

  useEffect(() => {
    const syncRoute = () => {
      const page = pageFromHash()
      setActiveState(page)
      if (page === 'Farm map') setMapTileStatus('loading')
    }
    window.addEventListener('hashchange', syncRoute)
    window.addEventListener('popstate', syncRoute)
    return () => {
      window.removeEventListener('hashchange', syncRoute)
      window.removeEventListener('popstate', syncRoute)
    }
  }, [])

  const mapLayerStatus: Record<MapLayer, string> = {
    Risk: `${getFarmRiskLevel(dashboard)} risk · ${dashboard.alerts[0]?.title ?? 'No active alerts'}`,
    Weather: `${dashboard.weather.rainfallMm} mm rain · ${dashboard.weather.precipitationProbability}% probability`,
    Vegetation: `Vegetation index ${satellite.vegetationIndex.toFixed(2)} · ${satellite.label.toUpperCase()}`,
    Disease: diagnoses.length ? 'Disease history is farm-level, not georeferenced' : 'No georeferenced disease data · boundary only',
  }

  function fitFarmBounds() {
    mapInstanceRef.current?.fitBounds(getFarmBoundary(dashboard.farm), { padding: [32, 32], maxZoom: 18 })
  }

  async function toggleMapFullscreen() {
    const frame = mapFrameRef.current
    if (!frame) return
    try {
      if (document.fullscreenElement === frame) await document.exitFullscreen()
      else await frame.requestFullscreen()
    } catch {
      setDemoToast('Fullscreen is unavailable in this browser. The full map remains usable in this view.')
    }
  }

  function openNotification(item: { destination: string }) {
    setNoticeOpen(false)
    navigateTo(item.destination)
  }

  async function startDemo() {
    try { await fetch('/api/demo/reset', { method: 'POST' }); await refresh(); setDemoToast('Demo Mode: Extreme rainfall approaching. Field risk and intervention flow is active.') }
    catch { setDemoToast('Offline Demo Mode is active. Extreme rainfall approaching scenario is loaded.') }
    navigateTo('Smart field suite')
    window.setTimeout(() => setDemoToast(''), 5000)
  }

  function markNotificationsRead() {
    setReadAlerts(true)
  }
  async function addActivity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const response = await fetch('/api/activities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: activityType, note: activityNote }) })
      if (!response.ok) throw new Error('Could not save')
      setActivityNote(''); await refresh(); setDemoToast('Field activity saved to the farm timeline.')
    } catch { setDemoToast('Activity could not be saved. Check that the local API is running.') }
    window.setTimeout(() => setDemoToast(''), 3500)
  }
  async function submitDiagnosis(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!photoName || symptoms.length === 0) { setDemoToast('Choose a crop photo and at least one visible symptom.'); window.setTimeout(() => setDemoToast(''), 3500); return }
    try {
      const response = await fetch('/api/disease', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ crop: dashboard.farm.crop, symptoms }) })
      if (!response.ok) throw new Error('Could not analyze')
      const result = await response.json() as Diagnosis; setDiagnosisResult(result); await refresh()
    } catch { setDemoToast('Disease triage needs the local API. Your selected image stays on this device.') }
  }
  function answerAdvisorQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const question = voiceMessage.trim().toLowerCase()
    const advisory = /\b(irrigat\w*|water\w*|rain\w*|weather\w*)\b/.test(question)
      ? advisories.find((item) => item.category === 'Water')
      : /\b(soil|residue|nutrient|fertili[sz]er)\b/.test(question)
        ? advisories.find((item) => item.category === 'Soil')
        : /\b(crop\w*|leaf|spot\w*|wilting|pest\w*|disease\w*|flower\w*)\b/.test(question)
          ? advisories.find((item) => item.category === 'Crop care')
          : undefined

    setAdvisorReply(advisory
      ? { title: `${advisory.category} recommendation`, answer: `${advisory.action} ${advisory.why}`, confidence: advisory.confidence, source: advisory.data }
      : { title: 'No matching local guidance', answer: 'I cannot answer that from the farm data available here. Try asking about rain or irrigation, soil care, or crop checks.', confidence: 'Not rated', source: 'Local farm profile and demo advisories' })
  }
  function selectPhoto(file?: File) {
    if (!file) return
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) { setDemoToast('Use a JPG, PNG, or WEBP image under 8 MB.'); window.setTimeout(() => setDemoToast(''), 3500); return }
    setPhotoName(file.name); setPhotoPreview(URL.createObjectURL(file)); setDiagnosisResult(null)
  }
  function toggleSymptom(name: string) { setSymptoms((existing) => existing.includes(name) ? existing.filter((item) => item !== name) : [...existing, name]) }
  function askVoice() {
    const voiceWindow = window as Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
    type Recognition = { lang: string; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void }
    const Constructor = voiceWindow.SpeechRecognition ?? voiceWindow.webkitSpeechRecognition
    if (!Constructor) { setDemoToast('Voice input is not available in this browser. Type your question instead.'); return }
    const recognition = new Constructor(); recognition.lang = language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-IN'; setVoiceListening(true)
    recognition.onresult = (event) => { setVoiceMessage(event.results[0][0].transcript); setAdvisorReply(null) }
    recognition.onerror = () => setDemoToast('Voice input was unavailable. Type your question instead.')
    recognition.onend = () => setVoiceListening(false); recognition.start()
  }
  const speech = (text: string) => { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)) } }
  const visibleNavigation = navigation.filter((item) => role === 'Farmer' || item.group === 'NETWORK' || item.name === 'Overview' || item.name === 'Farm map')

  return <SatelliteContext.Provider value={satellite}><div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#overview" onClick={(event) => { event.preventDefault(); navigateTo('Overview') }}><span className="brand-mark"><Leaf size={22} /></span><span><strong>AgriN</strong><small>FIELD INTELLIGENCE</small></span></a>
      <div className="workspace-label">WORKSPACE <ChevronDown size={14} /></div>
      <button className="farm-switch" type="button" onClick={() => navigateTo('Farm profile')}><span className="farm-avatar">SF</span><span><b>{dashboard.farm.name}</b><small>{dashboard.farm.district} · Maharashtra</small></span><ChevronDown size={15} /></button>
      <div className="side-nav">{['FARM', 'NETWORK'].map((group) => <div key={group}><p className="nav-label">{group}</p>{visibleNavigation.filter((item) => item.group === group).map(({ name, icon: Icon }) => <button key={name} className={`nav-item ${active === name ? 'selected' : ''}`} onClick={() => navigateTo(name)}><Icon size={17} /><span>{name}</span>{name === 'Officer view' && <span className="nav-pill">31</span>}</button>)}</div>)}</div>
      <div className="sidebar-bottom"><div className="data-status"><span className="status-dot" /><div><b>{t.offline}</b><small>Local dataset · India</small></div></div><div className="profile-row"><div className="profile-avatar">AR</div><span><b>{dashboard.farm.farmer}</b><small>Farm owner</small></span><button aria-label="Profile menu" title="Profile menu" onClick={() => navigateTo('Farm profile')}><Menu size={17} /></button></div></div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="breadcrumb"><span>India</span><span>/</span><b>{active}</b></div>
        <div className="top-actions">
          <div className="search-box-wrap">
            <label className="search-box"><Search size={16} /><input ref={searchInputRef} aria-label="Search farms and alerts" placeholder="Search farms, alerts..." value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>Ctrl/⌘ K</kbd></label>
            {search.trim() && <div className="search-results" aria-label="Search results">{filteredSearchResults.length ? filteredSearchResults.map((item) => <button key={`${item.label}-${item.type}`} onClick={() => { setSearch(''); navigateTo(item.destination) }}><span>{item.label}</span><small>{item.type}</small></button>) : <div className="search-empty" role="status">No matching farms, alerts, or records.</div>}</div>}
          </div>
          <select aria-label="Language" value={language} onChange={(event) => setLanguage(event.target.value)}><option value="en">EN</option><option value="hi">हिं</option><option value="te">తె</option></select>
          <select aria-label="Workspace role" value={role} onChange={(event) => { const nextRole = event.target.value; setRole(nextRole); navigateTo(nextRole === 'Policy' ? 'National dashboard' : nextRole === 'Officer' ? 'Officer view' : 'Overview') }}><option>Farmer</option><option>Officer</option><option>Policy</option></select>
          <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNoticeOpen(!noticeOpen)}><Bell size={18} />{unreadCount > 0 && <i />}</button>
        </div>
      </header>
      {apiStatus === 'loading' && <div className="status-banner" role="status">Loading local AgriN data. Demo values remain available while loading.</div>}
      {apiStatus === 'fallback' && <div className="status-banner" role="alert">Using local demo fallback for {apiFallbacks.join(', ')}.</div>}
      <div className="content-area">
        <div className="page-heading"><div><div className="eyebrow"><span className="status-dot" /> {t.offline} <span className="eyebrow-divider">·</span> DEMO DATA</div><h1>{active === 'Overview' ? t.overview : active}</h1><p>{active === 'Overview' ? 'Signals for one farm, translated into clear next steps.' : `${dashboard.farm.name} · ${dashboard.farm.village}, ${dashboard.farm.district} district`}</p></div><div className="heading-actions"><button className="button secondary" onClick={() => setActive('Farm timeline')}><FileText size={16} /> Farm log</button><button className="button primary" onClick={() => void startDemo()}><Activity size={16} /> {t.demo}</button></div></div>

        {active === 'National dashboard' && <NationalDashboard officerSummary={officerSummary} />}
        {active === 'Overview' && <>
          <section className="metric-grid" aria-label="Today's farm status">
            <article className="metric-card health-card"><div className="metric-top"><span>FARM HEALTH</span><span className="trend-good"><ArrowUpRight size={15} /> +2</span></div><div className="health-body"><div className="score-ring" style={{ '--score': `${dashboard.health.score * 3.6}deg` } as React.CSSProperties}><div><b>{dashboard.health.score}</b><small>/100</small></div></div><div className="health-copy"><b>Good, watch the rain</b><p>Rain risk lowered the weather component today.</p><button onClick={() => setActive('Farm map')}>View score factors <ArrowRight size={14} /></button></div></div></article>
            <article className="metric-card weather-card"><div className="metric-top"><span>LOCAL WEATHER</span><CloudRain size={17} /></div><div className="weather-main"><strong>{dashboard.weather.temperatureC}°</strong><span><b>{dashboard.weather.description}</b><small>Feels like {dashboard.weather.feelsLikeC}°</small></span></div><div className="weather-details"><span><CloudRain size={15} /> {dashboard.weather.rainfallMm} mm rain</span><span><Droplets size={15} /> {dashboard.weather.humidity}% humidity</span><span><Wind size={15} /> {dashboard.weather.windKph} km/h</span></div></article>
            <article className="metric-card crop-card"><div className="metric-top"><span>CROP & SOIL</span><Sprout size={17} /></div><div className="crop-title"><div className="crop-symbol"><Leaf size={20} /></div><div><strong>{dashboard.farm.crop}</strong><small>{dashboard.farm.cropVariety} · {dashboard.farm.cropStage}</small></div></div><div className="crop-meta"><span><i className="soil-dot" /> {dashboard.farm.soilType}</span><span>{dashboard.farm.farmSizeHa} ha</span></div><div className="data-note">Soil lab data <b>Not available</b></div></article>
            <article className="metric-card risk-card"><div className="metric-top"><span>ACTIVE RISK</span><AlertTriangle size={17} /></div><div className="risk-value"><strong>{dashboard.alerts.filter((item) => item.level === 'high' || item.level === 'critical').length.toString().padStart(2, '0')}</strong><span>needs attention</span></div><div className="risk-highlight"><span className="risk-marker" /><div><b>Rain watch</b><small>{dashboard.weather.precipitationProbability}% chance today</small></div><ArrowRight size={15} /></div><button className="text-action" onClick={() => setNoticeOpen(true)}>Review alerts <ArrowRight size={14} /></button></article>
          </section>

          <section className="smart-demo-panel panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">SMART FARM DEMO MODE</span>
                <h2>Extreme rainfall approaching</h2>
              </div>
              <button className="button secondary" onClick={() => setActive('Smart field suite')}>Open intelligence suite</button>
            </div>
            <div className="demo-flow">
              <div><span>Weather detection</span><b>Heavy rain watch</b></div>
              <ArrowRight size={16} />
              <div><span>Farm risk</span><b>Medium risk</b></div>
              <ArrowRight size={16} />
              <div><span>Crop risk</span><b>Flowering-stage check</b></div>
              <ArrowRight size={16} />
              <div><span>Irrigation</span><b>Reduce irrigation</b></div>
              <ArrowRight size={16} />
              <div><span>Officer alert</span><b>District notice</b></div>
            </div>
            <div className="smart-readout"><span>AI confidence: Medium</span><span>Model prediction: Demo</span><span>Action: clear drains and stage irrigation</span></div>
          </section>

          <section className="main-grid"><div className="panel action-panel"><div className="panel-heading"><div><span className="section-kicker">FIELD PRIORITIES</span><h2>{t.actions}</h2></div><button className="subtle-button" onClick={() => setActive('AI advisor')}>Advisor details <ArrowRight size={14} /></button></div><div className="actions-list">{advisories.map((item, index) => <article className="action-row" key={item.category}><div className={`action-index tone-${index}`}>{String(index + 1).padStart(2, '0')}</div><div className="action-copy"><div className="action-meta"><b>{item.category}</b><span>{item.confidence} confidence</span></div><strong>{item.action}</strong><p>{item.why}</p></div><button className="round-action" title="Read recommendation aloud" aria-label={`Read ${item.category} recommendation aloud`} onClick={() => speech(item.action)}><Mic size={16} /></button></article>)}</div><div className="source-strip"><ShieldCheck size={15} /><span>Recommendations use the farm profile and local demo forecast.</span><span>Not a diagnosis</span></div></div>

            <div className="panel weather-panel"><div className="panel-heading"><div><span className="section-kicker">7-DAY FORECAST</span><h2>{t.weather}</h2></div><button className="map-link" onClick={() => setActive('Farm map')}>Nanded <ArrowRight size={14} /></button></div><div className="forecast-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={dashboard.weather.forecast} margin={{ top: 10, right: 3, left: -18, bottom: 0 }}><defs><linearGradient id="rainFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6b9d77" stopOpacity={0.3} /><stop offset="100%" stopColor="#6b9d77" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="#e8ebe5" vertical={false} /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#758078', fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#758078', fontSize: 10 }} /><Tooltip /><Area type="monotone" dataKey="rain" stroke="#618d6e" fill="url(#rainFill)" strokeWidth={2.5} name="Rain chance %" /><Line type="monotone" dataKey="high" stroke="#df9164" strokeWidth={2} dot={false} name="High °C" /></AreaChart></ResponsiveContainer></div><div className="chart-legend"><span><i className="legend-green" /> Rain probability</span><span><i className="legend-orange" /> Day high</span></div><div className="forecast-alert"><CloudRain size={16} /><span><b>Rain likely today.</b> Review drainage before the next shower.</span></div></div></section>

          <section className="bottom-grid">
            <div className="panel map-preview-panel">
              <div className="panel-heading"><div><span className="section-kicker">SATELLITE + FIELD BOUNDARY</span><h2>Farm intelligence map</h2></div><button className="subtle-button" onClick={() => setActive('Farm map')}>Open map <ArrowRight size={14} /></button></div>
              <div className="map-preview"><FarmMap dashboard={dashboard} hasDiseaseHistory={diagnoses.length > 0} /><div className="map-overlay"><span className="map-chip"><span className="status-dot" /> {satellite.label.toUpperCase()}</span><span className="map-location"><b>{dashboard.farm.name}</b><small>{dashboard.farm.village} · {dashboard.farm.farmSizeHa} ha</small></span></div></div>
              <div className="map-caption"><span>Vegetation index <b>{satellite.vegetationIndex.toFixed(2)}</b> <TrendingDown size={14} /></span><span>Previous reading <b>{satellite.previousIndex.toFixed(2)}</b> · {satellite.label}</span></div>
            </div>
            <div className="panel alert-panel"><div className="panel-heading"><div><span className="section-kicker">EARLY WARNING</span><h2>Attention needed</h2></div><span className="alert-count">{dashboard.alerts.filter((item) => item.level === 'high' || item.level === 'critical').length} active</span></div><div className="alert-list">{dashboard.alerts.slice(0, 2).map((alert) => <div className="alert-row" key={alert.id}><span className={`severity ${alert.level}`}>{alert.level}</span><div><b>{alert.title}</b><p>{alert.why}</p><small>Action: {alert.action}</small></div></div>)}</div></div>
          </section>
        </>}

        {active === 'Smart field suite' && <section className="smart-suite-layout">
          <div className="panel smart-hero"><div className="panel-heading"><div><span className="section-kicker">AGRI INTELLIGENCE</span><h2>Smart farm operations</h2></div><span className="demo-label">LIVE + DEMO</span></div>
            <div className="smart-grid">
              <article className="panel smart-module"><div className="section-kicker">CROP CALENDAR</div><h3>Lifecycle by stage</h3><ul>{smartSuiteData.calendar.map((item) => <li key={item.stage}><b>{item.stage}</b><span>{item.status}</span><small>{item.note}</small></li>)}</ul></article>
              <article className="panel smart-module"><div className="section-kicker">PEST RISK</div><h3>{smartSuiteData.pestRisk.level} risk</h3><p>{smartSuiteData.pestRisk.why}</p><ul>{smartSuiteData.pestRisk.monitor.map((item) => <li key={item}>{item}</li>)}</ul><small>AI confidence: {smartSuiteData.pestRisk.confidence}</small><small>Data: {smartSuiteData.pestRisk.evidence}</small></article>
              <article className="panel smart-module"><div className="section-kicker">HARVEST FORECAST</div><h3>{smartSuiteData.harvest.window}</h3><p>{smartSuiteData.harvest.maturity}</p><ul>{smartSuiteData.harvest.risks.map((item) => <li key={item}>{item}</li>)}</ul><small>{smartSuiteData.harvest.confidence}</small></article>
              <article className="panel smart-module"><div className="section-kicker">MARKET PRICE</div><h3>Nearby markets</h3><ul>{smartSuiteData.market.map((item) => <li key={item.market}><b>{item.market}</b><span>{item.price}</span><small>{item.trend}</small></li>)}</ul></article>
              <article className="panel smart-module"><div className="section-kicker">PROFITABILITY</div><h3>Estimated revenue</h3><p className="big-value">{smartSuiteData.profitability.revenue}</p><ul>{smartSuiteData.profitability.expenses.map((expense) => <li key={expense.label}><b>{expense.label}</b><span>{expense.value}</span></li>)}</ul><small>ROI: {smartSuiteData.profitability.roi} · Break-even: {smartSuiteData.profitability.breakEven}</small><small>{smartSuiteData.profitability.estimate}</small></article>
              <article className="panel smart-module"><div className="section-kicker">WATER MANAGEMENT</div><h3>{smartSuiteData.water.recommendation}</h3><p>{smartSuiteData.water.status}</p><ul>{smartSuiteData.water.trend.map((item) => <li key={item.label}><b>{item.label}</b><span>{item.value}</span></li>)}</ul><small>{smartSuiteData.water.data}</small></article>
              <article className="panel smart-module"><div className="section-kicker">SOIL JOURNEY</div><h3>Current + historical trend</h3><ul>{smartSuiteData.soil.current.map((item) => <li key={item.label}><b>{item.label}</b><span>{item.value}</span></li>)}</ul><small>{smartSuiteData.soil.trend}</small><small>Recommendation: {smartSuiteData.soil.recommendation}</small></article>
              <article className="panel smart-module"><div className="section-kicker">CLIMATE IMPACT</div><h3>Estimated climate impact</h3><ul>{Object.entries(smartSuiteData.carbon).filter(([key]) => key !== 'estimate').map(([key, value]) => <li key={key}><b>{key}</b><span>{String(value)}</span></li>)}</ul><small>{smartSuiteData.carbon.estimate}</small></article>
              <article className="panel smart-module"><div className="section-kicker">RISK PROFILE</div><h3>Overall {smartSuiteData.riskProfile.overall}</h3><ul>{Object.entries(smartSuiteData.riskProfile).filter(([key]) => key !== 'actions').map(([key, value]) => <li key={key}><b>{key}</b><span>{String(value)}</span></li>)}</ul><small>Mitigation: {smartSuiteData.riskProfile.actions.join(' · ')}</small></article>
              <article className="panel smart-module"><div className="section-kicker">WHAT-IF SIMULATOR</div><h3>{smartSuiteData.simulator.scenario}</h3><ul>{Object.entries(smartSuiteData.simulator).filter(([key]) => key !== 'scenario').map(([key, value]) => <li key={key}><b>{key}</b><span>{String(value)}</span></li>)}</ul><small>All outcomes are simulations, not guaranteed production results.</small></article>
              <article className="panel smart-module"><div className="section-kicker">ROTATION</div><h3>{smartSuiteData.rotation.recommendation}</h3><p>{smartSuiteData.rotation.reasoning}</p><ul>{smartSuiteData.rotation.regen.map((item) => <li key={item}>{item}</li>)}</ul></article>
              <article className="panel smart-module"><div className="section-kicker">DIGITAL TWIN</div><h3>Farm intelligence layer</h3><ul>{Object.entries(smartSuiteData.digitalTwin).map(([key, value]) => <li key={key}><b>{key}</b><span>{String(value)}</span></li>)}</ul></article>
              <article className="panel smart-module"><div className="section-kicker">AI TASK PRIORITY</div><h3>DO THIS NOW</h3><ul>{smartSuiteData.tasks.today.map((item) => <li key={item}>{item}</li>)}</ul><small>Next: {smartSuiteData.tasks.upcoming[0]}</small></article>
              <article className="panel smart-module"><div className="section-kicker">KNOWLEDGE BASE</div><h3>Searchable agriculture base</h3><ul>{smartSuiteData.knowledge.map((item) => <li key={item}>{item}</li>)}</ul></article>
              <article className="panel smart-module"><div className="section-kicker">EXPERT ESCALATION</div><h3>AI confidence is low</h3><p>Consider consulting an agricultural expert for serious symptoms or unusual field changes.</p><small>Support request can be raised with local officer desk.</small></article>
              <article className="panel smart-module"><div className="section-kicker">COMMUNITY</div><h3>Local observations</h3><ul>{smartSuiteData.community.map((item) => <li key={item.author}><b>{item.author}</b><span>{item.note}</span></li>)}</ul></article>
              <article className="panel smart-module"><div className="section-kicker">LOCAL ALERTS</div><h3>Verified regional alerts</h3><ul>{smartSuiteData.localAlerts.map((item) => <li key={item.title}><b>{item.title}</b><span>{item.region}</span><small>{item.detail}</small></li>)}</ul></article>
              <article className="panel smart-module"><div className="section-kicker">RESOURCE PLAN</div><h3>Season requirements</h3><ul>{Object.entries(smartSuiteData.resourcePlanner).map(([key, value]) => <li key={key}><b>{key}</b><span>{String(value)}</span></li>)}</ul></article>
            </div>
          </div>
        </section>}

        {active === 'AI Action Center' && <section className="panel action-center-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">AI PRIORITY ENGINE</span>
              <h2>AI Action Center</h2>
            </div>
            <span className="demo-label">360° FARM VIEW</span>
          </div>
          <div className="action-center-grid">
            {actionCenter.map((group) => <div className="action-center-group" key={group.group}><h3>{group.group}</h3>{group.items.map((item) => <article className="action-center-item" key={item.title}><strong>{item.title}</strong><p>{item.detail}</p><div className="action-center-meta"><span>{item.reason}</span><b>{item.confidence}</b></div></article>)}</div>)}
          </div>
        </section>}

        {active === 'Farm profile' && <section className="panel farm-profile-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">FARM PROFILE</span>
              <h2>{dashboard.farm.name}</h2>
            </div>
            <span className="demo-label">OWNER: {dashboard.farm.farmer}</span>
          </div>
          <div className="profile-grid">
            <div className="profile-stat"><span>Farm size</span><b>{dashboard.farm.farmSizeHa} ha</b></div>
            <div className="profile-stat"><span>Crop</span><b>{dashboard.farm.crop}</b></div>
            <div className="profile-stat"><span>Stage</span><b>{dashboard.farm.cropStage}</b></div>
            <div className="profile-stat"><span>Soil</span><b>{dashboard.farm.soilType}</b></div>
            <div className="profile-stat"><span>Irrigation</span><b>{dashboard.farm.irrigation}</b></div>
            <div className="profile-stat"><span>District</span><b>{dashboard.farm.district}</b></div>
          </div>
          <div className="profile-details">
            <div className="panel">
              <h3>Field summary</h3>
              <p>{dashboard.farm.village}, {dashboard.farm.country} · planted with {dashboard.farm.cropVariety}. The previous crop was {dashboard.farm.previousCrop}. Soil conditions and rainfall forecast suggest a measured irrigation schedule.</p>
            </div>
            <div className="panel">
              <h3>Current health</h3>
              <p>{dashboard.health.score}/100 overall health. Crop and disease components remain the strongest signals while weather risk is still elevated.</p>
            </div>
          </div>
        </section>}

        {active === 'Farm map' && <section className="panel full-map-panel"><div className="panel-heading"><div><span className="section-kicker">FIELD BOUNDARY · OPENSTREETMAP</span><h2>{t.map}</h2><p className="panel-description">OpenStreetMap base tiles · farm boundary is approximate demo geometry, not a surveyed parcel.</p></div><div className="layer-control" role="group" aria-label="Farm map layers">{mapLayers.map((name) => <button key={name} className={layer === name ? 'layer-active' : ''} aria-pressed={layer === name} onClick={() => setLayer(name)}>{name}</button>)}</div></div><div className="large-map-wrap" ref={mapFrameRef}><FarmMap dashboard={dashboard} layer={layer} mapRef={mapInstanceRef} onTileStatus={setMapTileStatus} hasDiseaseHistory={diagnoses.length > 0} /><div className="map-toolbar"><button type="button" aria-label="Fit map to farm" title="Fit map to farm" onClick={fitFarmBounds}><LocateFixed size={16} /><span>Fit farm</span></button><button type="button" aria-label={isMapFullscreen ? 'Exit full map' : 'Open full map'} title={isMapFullscreen ? 'Exit full map' : 'Open full map'} onClick={() => void toggleMapFullscreen()}>{isMapFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}<span>{isMapFullscreen ? 'Exit full map' : 'Full map'}</span></button></div>{mapTileStatus === 'error' && <div className="map-fallback-banner" role="status"><b>OpenStreetMap tiles unavailable</b><span>The approximate farm boundary and farm details remain available. This is not a live basemap.</span></div>}<div className={`map-tile-state ${mapTileStatus}`} role="status">{mapTileStatus === 'ready' ? 'OpenStreetMap tiles loaded' : mapTileStatus === 'loading' ? 'Loading map tiles…' : 'Basemap unavailable · demo boundary and farm data remain available'}</div><div className="map-info"><b>{dashboard.farm.name}</b><span>{dashboard.farm.village}, {dashboard.farm.district}, {dashboard.farm.country}</span><span>{dashboard.farm.farmSizeHa} ha · {dashboard.farm.crop}</span><span className="map-info-health">Health {dashboard.health.score}/100 · {getFarmRiskLevel(dashboard)} risk</span><small>{layer}: {mapLayerStatus[layer]}</small></div></div><div className="map-disclaimer"><span><i className="boundary-key" /> Approximate demo boundary · not surveyed</span><span><i className={`risk-key layer-${layer.toLowerCase()}`} /> {mapLayerStatus[layer]}</span><span>{layer === 'Disease' ? 'Disease records are not georeferenced; no spatial disease overlay is shown.' : `${layer} layer · DEMO DATA`}</span></div></section>}

        {active === 'AI advisor' && <section className="advisor-layout">
          <div className="panel advisor-intro">
            <span className="advisor-icon"><Sprout size={23} /></span>
            <span className="section-kicker">CONTEXT-AWARE · RULE-BASED DEMO</span>
            <h2>{t.advisor}</h2>
            <p>Recommendations use the selected farm profile and local demo forecast.</p>
            <div className="context-tags"><span>{dashboard.farm.crop}</span><span>{dashboard.farm.cropStage}</span><span>{dashboard.farm.soilType}</span><span>{dashboard.weather.rainfallMm} mm forecast</span></div>
            <div className="voice-box"><button className={`voice-button ${voiceListening ? 'listening' : ''}`} onClick={askVoice}><Mic size={18} />{voiceListening ? 'Listening...' : 'Ask by voice'}</button><span>Browser speech · text fallback available</span></div>
            <form className="advisor-question-form" onSubmit={answerAdvisorQuestion}>
              <input className="question-input" aria-label="Ask a question about your farm" value={voiceMessage} onChange={(event) => { setVoiceMessage(event.target.value); setAdvisorReply(null) }} placeholder="e.g. Should I irrigate today?" required minLength={3} />
              <button className="button primary" type="submit">Get advice <ArrowRight size={15} /></button>
            </form>
            {advisorReply && <div className="voice-answer" role="status"><b>{advisorReply.title}</b><p>{advisorReply.answer}</p><small>Data: {advisorReply.source} · Confidence: {advisorReply.confidence}</small></div>}
          </div>
          <div className="advisor-results"><div className="panel-heading"><div><span className="section-kicker">DAILY ADVISORY</span><h2>Recommended for today</h2></div><span className="demo-label">DEMO PROVIDER</span></div>{advisories.map((item) => <article className="advisor-card" key={item.category}><div className="advisor-card-top"><b>{item.category}</b><span>{item.confidence} confidence</span></div><strong>{item.action}</strong><p><b>Why</b> {item.why}</p><small>Data used: {item.data}</small></article>)}<div className="panel seven-day-panel"><span className="section-kicker">NEXT 7 DAYS</span><h2>Field rhythm</h2><div className="week-plan">{dashboard.weather.forecast.slice(0, 4).map((day, index) => <div key={day.day}><span>{day.day}</span><i className={index < 2 ? 'week-rain' : ''} /><b>{index < 2 ? 'Check drainage' : index === 2 ? 'Inspect crop' : 'Review soil moisture'}</b></div>)}</div></div></div>
        </section>}

        {active === 'Regenerative' && <section className="regenerative-layout"><div className="regenerative-lead"><div className="regenerative-mark"><Leaf size={27} /></div><div><span className="section-kicker">SOIL-FIRST FIELD PLANNING</span><h2>Regenerative farming planner</h2><p>A practical 90-day sequence based on your crop, soil type, rainfall outlook, and previous crop. Recommendations are not measured outcomes.</p></div></div><div className="practice-grid">{[{ title: 'Soil cover', current: 'Bare inter-row soil', next: 'Retain clean crop residue', benefit: 'May reduce exposed soil and evaporation' }, { title: 'Crop rotation', current: 'Cotton after legumes', next: 'Plan a cereal or millet break crop', benefit: 'Diversifies the crop sequence' }, { title: 'Soil disturbance', current: 'Conventional cultivation', next: 'Trial reduced tillage on a small plot', benefit: 'Can reduce disturbance; observe weeds and soil condition' }, { title: 'Field diversity', current: 'Single main crop', next: 'Explore a locally suitable border or intercrop', benefit: 'May support habitat diversity' }].map((practice, index) => <article className="panel practice-card" key={practice.title}><div className="practice-step">0{index + 1}</div><span className="section-kicker">PRACTICE SHIFT</span><h3>{practice.title}</h3><div className="practice-change"><span>{practice.current}</span><ArrowRight size={15} /><b>{practice.next}</b></div><p>{practice.benefit}</p><small>Estimated benefit · not independently verified</small></article>)}</div><div className="panel plan-panel"><div className="panel-heading"><div><span className="section-kicker">90-DAY FIELD PLAN</span><h2>Start small. Observe. Adapt.</h2></div><span className="demo-label">WEEK-BY-WEEK</span></div><div className="timeline-plan">{[['Weeks 1–2', 'Record field zones, residue cover, and any erosion signs.'], ['Weeks 3–4', 'Retain residue where disease pressure and local guidance allow.'], ['Weeks 5–8', 'Trial reduced tillage on a small, representative plot.'], ['Weeks 9–12', 'Review soil cover and plan a locally suitable rotation.']].map(([week, note]) => <div key={week}><span>{week}</span><p>{note}</p></div>)}</div></div></section>}

        {active === 'Crop planner' && <section className="planner-layout"><div className="planner-intro"><div><span className="section-kicker">TRANSPARENT SUITABILITY MODEL</span><h2>Plan the next crop</h2><p>Scores use the farm profile and demo forecast. Adjust the profile to explore alternatives in a future connected deployment.</p></div><div className="weight-line"><span>SOIL 30%</span><span>CLIMATE 25%</span><span>WATER 20%</span><span>SEASON 15%</span><span>ROTATION 10%</span></div></div><div className="crop-results">{crops.map((crop, index) => <article className="panel crop-result" key={crop.name}><div className="crop-rank">0{index + 1}</div><div className="crop-result-main"><span className="section-kicker">{index === 0 ? 'BEST MATCH IN DEMO' : 'ALTERNATIVE'}</span><h3>{crop.name}</h3><p>{crop.reason}</p><div className="crop-facts"><span>Water <b>{crop.water}</b></span><span>Rotation benefit <b>{crop.rotation}</b></span><span>Soil <b>{dashboard.farm.soilType}</b></span></div></div><div className="suitability"><strong>{crop.score}</strong><span>SUITABILITY</span><div><i style={{ width: `${crop.score}%` }} /></div></div></article>)}</div><div className="planner-note"><ShieldCheck size={16} /> Suitability is a transparent prototype score, not a yield forecast. Confirm local season and seed availability with an agronomist.</div></section>}

        {active === 'Disease check' && <section className="disease-layout"><div className="panel disease-upload"><div><span className="section-kicker">VISUAL TRIAGE · DEMO</span><h2>Check a crop photo</h2><p>Photo stays in your browser. This demo does not use an image-recognition model; symptoms you select drive a cautious rule-based triage.</p></div><label className="upload-drop"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectPhoto(event.target.files?.[0])} /><span className="upload-symbol"><Activity size={23} /></span><b>{photoName || 'Choose a leaf, fruit, or crop photo'}</b><small>JPG, PNG or WEBP · up to 8 MB</small></label>{photoPreview && <img className="photo-preview" src={photoPreview} alt="Selected crop image preview" />}<fieldset className="symptom-set"><legend>What can you see?</legend>{['Leaf spots', 'Yellowing', 'Wilting', 'Powdery coating'].map((item) => <label key={item}><input type="checkbox" checked={symptoms.includes(item)} onChange={() => toggleSymptom(item)} />{item}</label>)}</fieldset><button className="button primary" onClick={(event) => { const form = (event.currentTarget.closest('.disease-upload') as HTMLElement).querySelector('form'); (form as HTMLFormElement | null)?.requestSubmit() }}>
          Review symptoms <ArrowRight size={15} />
        </button><form onSubmit={(event) => void submitDiagnosis(event)} className="hidden-submit" /></div><div className="disease-results"><div className="panel diagnosis-panel"><span className="section-kicker">SCREENING RESULT</span><h2>{diagnosisResult?.result ?? 'No new screening yet'}</h2>{diagnosisResult ? <><div className="confidence-chip">{diagnosisResult.confidence} confidence · possible, not confirmed</div><p>Symptoms: {diagnosisResult.symptoms.join(', ')}</p><p>{diagnosisResult.action}</p><small>{diagnosisResult.model}</small></> : <p>Choose an image and symptoms to receive a cautious demo result. A field diagnosis requires expert confirmation.</p>}</div><div className="panel history-panel"><div className="panel-heading"><div><span className="section-kicker">FARM RECORD</span><h2>Disease history</h2></div><span className="demo-label">LOCAL DATA</span></div>{diagnoses.length ? diagnoses.map((item) => <div className="history-row" key={item.id}><span className="history-dot" /><div><b>{item.result}</b><small>{item.crop} · {item.date} · {item.confidence} confidence</small></div></div>) : <p>No diagnosis history recorded.</p>}</div></div></section>}

        {active === 'Farm timeline' && <section className="timeline-layout"><div className="panel timeline-add"><span className="section-kicker">FIELD NOTE</span><h2>Record an activity</h2><form onSubmit={(event) => void addActivity(event)}><label>Activity type<select value={activityType} onChange={(event) => setActivityType(event.target.value)}><option>Field check</option><option>Irrigation</option><option>Sowing</option><option>Fertilizer</option><option>Harvest</option><option>Weather event</option></select></label><label>What happened<textarea required minLength={3} maxLength={240} value={activityNote} onChange={(event) => setActivityNote(event.target.value)} placeholder="Add a short field note" /></label><button className="button primary" type="submit"><Check size={16} /> Save activity</button></form></div><div className="panel timeline-list"><span className="section-kicker">SUNDAR FIELD</span><h2>Farm activity</h2>{dashboard.activities.length ? dashboard.activities.map((item) => <article className="activity-item" key={item.id}><span className="activity-pin" /><div><small>{item.date} · {item.type}</small><b>{item.note}</b></div></article>) : <p className="empty-state" role="status">No field activity has been recorded yet.</p>}</div></section>}

        {active === 'Officer view' && <section className="officer-layout">
          <div className="officer-header"><div><span className="section-kicker">DISTRICT OPERATIONS · DEMO API</span><h2>{officerSummary.district} district overview</h2><p>Illustrative district aggregates supplied by the local demo API; not a government registry.</p></div><button className="button secondary" onClick={() => setActive('Farm map')}><MapIcon size={16} /> Open risk map</button></div>
          <div className="officer-metrics">{[['FARMS MONITORED', officerSummary.farms], ['AT RISK', officerSummary.atRisk], ['DISEASE HOTSPOTS', officerSummary.diseaseHotspots], ['WATER STRESS', officerSummary.waterStress]].map(([label, value]) => <div className="panel officer-metric" key={label}><span>{label}</span><b>{value}</b><small>Illustrative demo API</small></div>)}</div>
          <div className="panel priority-panel"><div className="panel-heading"><div><span className="section-kicker">FIELD RESPONSE QUEUE</span><h2>Priority interventions</h2></div><span className="demo-label">{officerSummary.alerts} DEMO ALERTS</span></div>{officerSummary.priority.length ? officerSummary.priority.map((alert) => <div className="priority-row" key={alert.id}><span className={`severity ${alert.level}`}>{alert.level}</span><div><b>{alert.title}</b><p>{alert.why}</p><small>Suggested response: {alert.action}</small></div><button className="subtle-button" onClick={() => setActive('Farm map')}>Locate <ArrowRight size={14} /></button></div>) : <p>No district alerts are active in this demo snapshot.</p>}</div>
          <div className="panel resource-panel"><div><span className="section-kicker">RESOURCE PLANNING</span><h2>Redistribution signals</h2><p>Prototype planning example · no live inventory connection.</p></div><div className="resource-signal"><span>SEED INVENTORY</span><b>Nanded surplus</b><ArrowRight size={18} /><b>Hingoli projected gap</b><button onClick={() => setDemoToast('Prototype recommendation recorded. No inventory was moved.')}>Review suggestion</button></div></div>
        </section>}

        {active === 'BRICS network' && <section className="brics-layout"><div className="brics-lead"><div><span className="section-kicker">COOPERATION WITHOUT CENTRALIZING FARMER RECORDS</span><h2>Shared intelligence.<br /><em>Local data stays local.</em></h2><p>A reference architecture for exchanging aggregate signals and model updates across national platforms. This screen is a concept simulation, not a live government network.</p></div><div className="federated-badge"><Globe2 size={25} /><b>Federated learning<br />simulation</b><span>NOT CONNECTED</span></div></div><div className="network-flow"><div className="country-nodes">{[['IN', 'India'], ['BR', 'Brazil'], ['CN', 'China'], ['RU', 'Russia'], ['ZA', 'South Africa']].map(([code, country]) => <div className="country-node" key={code}><span>{code}</span><b>{country}</b><small>National data stays local</small></div>)}</div><div className="flow-arrow"><span /><b>Aggregated signals + model updates</b><ArrowDownRight size={18} /></div><div className="shared-model"><div className="model-icon"><Globe2 size={24} /></div><div><span className="section-kicker">FEDERATED TRAINING SIMULATION</span><h3>Shared agricultural model</h3><p>Illustrative exchange of model updates. No raw farm records are transmitted in this demo.</p></div><span className="simulation-label">SIMULATED</span></div><div className="flow-arrow"><span /><b>Shared model intelligence</b><ArrowDownRight size={18} /></div><div className="network-outcomes"><div><TrendingDown size={19} /><b>Earlier risk signals</b><small>Weather + crop indicators</small></div><div><ShieldCheck size={19} /><b>Privacy-aware design</b><small>National data boundaries</small></div><div><Sprout size={19} /><b>Local adaptation</b><small>National agronomy context</small></div></div></div><div className="privacy-note"><ShieldCheck size={17} /><span><b>Interoperability principle</b> · Shared schemas make aggregate signals exchangeable; raw farmer data need not leave the country. Actual governance, consent, security, and model validation remain prerequisites.</span></div></section>}
      </div>
    </main>

    {noticeOpen && <div className="drawer-backdrop" onClick={() => setNoticeOpen(false)}><aside className="notification-drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-head"><div><span className="section-kicker">FIELD SIGNALS</span><h2>Notifications</h2></div><button className="icon-button" aria-label="Close notifications" onClick={() => setNoticeOpen(false)}><X size={18} /></button></div><button className="mark-read" onClick={markNotificationsRead}><Check size={14} /> Mark all as read</button>{notifications.length ? notifications.map((item) => <button key={item.id} className="drawer-alert" onClick={() => openNotification(item)}><span className={`severity ${item.priority}`}>{item.priority}</span><div><b>{item.title}</b><p>{item.message}</p><small>{item.destination}</small></div></button>) : <div className="drawer-empty">No new alerts right now.</div>}</aside></div>}
    {demoToast && <div className="toast" role="status"><Check size={16} />{demoToast}<button aria-label="Dismiss message" onClick={() => setDemoToast('')}><X size={14} /></button></div>}
    <footer className="app-footer"><span>AgriN · Regenerative Agricultural Intelligence Network</span><span>DEMO DATA · NOT FOR OPERATIONAL DECISIONS</span></footer>
  </div></SatelliteContext.Provider>
}

export default App
