export type WeatherSnapshot = {
  precipitationProbability: number
  rainfallMm: number
  temperatureC: number
  humidity: number
  windKph: number
}

export type FarmContext = {
  crop: string
  cropStage: string
  soilType: string
  irrigation: string
  previousCrop: string
  farmSizeHa: number
  weather: WeatherSnapshot
}

export type Alert = {
  id: string
  level: 'critical' | 'high' | 'medium' | 'low'
  title: string
  why: string
  action: string
}

export function farmHealthScore(context: FarmContext) {
  const { weather } = context
  const components = {
    crop: context.cropStage === 'Flowering' ? 84 : 80,
    water: weather.rainfallMm >= 8 ? 88 : context.irrigation === 'Drip' ? 77 : 66,
    weather: weather.temperatureC > 36 ? 54 : weather.precipitationProbability > 70 ? 68 : 84,
    soil: context.soilType === 'Loam' ? 82 : 72,
    disease: weather.humidity > 82 ? 61 : 86,
    regenerative: context.previousCrop === 'Legumes' ? 82 : 70,
  }
  const score = Math.round(
    components.crop * 0.25 + components.water * 0.2 + components.weather * 0.15 +
    components.soil * 0.15 + components.disease * 0.15 + components.regenerative * 0.1,
  )
  return { score, components }
}

export function cropRecommendations(input: {
  soilType: string
  rainfallMm: number
  temperatureC: number
  irrigation: string
  previousCrop: string
}) {
  const crops = [
    { name: 'Chickpea', soil: ['Loam', 'Black cotton'], temp: [15, 30], rain: [4, 35], water: 'Low', rotation: 'High' },
    { name: 'Sorghum', soil: ['Loam', 'Black cotton', 'Sandy loam'], temp: [22, 38], rain: [2, 30], water: 'Low', rotation: 'Medium' },
    { name: 'Maize', soil: ['Loam', 'Sandy loam'], temp: [18, 34], rain: [12, 60], water: 'Medium', rotation: 'Medium' },
  ]
  const weights = { soil: 30, climate: 25, water: 20, season: 15, rotation: 10 }
  return crops.map((crop) => {
    const soil = crop.soil.includes(input.soilType) ? 100 : 55
    const climate = input.temperatureC >= crop.temp[0] && input.temperatureC <= crop.temp[1] ? 92 : 48
    const water = input.irrigation !== 'Rainfed' || input.rainfallMm >= crop.rain[0] ? 85 : 58
    const season = input.rainfallMm <= crop.rain[1] ? 82 : 60
    const rotation = input.previousCrop === 'Legumes' && crop.name === 'Chickpea' ? 62 : 86
    const score = Math.round((soil * weights.soil + climate * weights.climate + water * weights.water + season * weights.season + rotation * weights.rotation) / 100)
    return {
      ...crop,
      score,
      weights,
      reason: `${soil >= 80 ? 'Fits the recorded soil type' : 'Can tolerate the recorded soil'}; ${climate >= 80 ? 'current temperature is suitable' : 'temperature is outside the preferred range'}.`,
    }
  }).sort((a, b) => b.score - a.score)
}

export function generateAlerts(weather: WeatherSnapshot): Alert[] {
  const alerts: Alert[] = []
  if (weather.rainfallMm >= 25 || weather.precipitationProbability >= 85) {
    alerts.push({ id: 'rain-watch', level: weather.rainfallMm >= 40 ? 'critical' : 'high', title: 'Heavy rain watch', why: `${weather.rainfallMm} mm forecast with ${weather.precipitationProbability}% precipitation probability.`, action: 'Pause irrigation, clear field drains, and delay fertilizer application.' })
  }
  if (weather.temperatureC >= 36) {
    alerts.push({ id: 'heat-watch', level: weather.temperatureC >= 40 ? 'critical' : 'high', title: 'Heat stress risk', why: `Forecast temperature is ${weather.temperatureC}°C.`, action: 'Check crop moisture early in the morning and avoid midday field work.' })
  }
  if (weather.humidity >= 82) {
    alerts.push({ id: 'disease-watch', level: 'medium', title: 'Fungal disease conditions', why: `Humidity is ${weather.humidity}%, which can favor some fungal diseases.`, action: 'Inspect lower leaves and improve airflow; confirm symptoms before treatment.' })
  }
  if (alerts.length === 0) alerts.push({ id: 'field-check', level: 'low', title: 'Routine crop check', why: 'No threshold-based weather alert is active.', action: 'Walk the field and record any change in crop condition.' })
  return alerts
}

export function buildAdvisory(context: FarmContext) {
  const rainExpected = context.weather.precipitationProbability >= 65 || context.weather.rainfallMm >= 8
  return [
    { category: 'Water', action: rainExpected ? 'Delay irrigation until the rain forecast clears.' : 'Check root-zone moisture before the next irrigation.', why: rainExpected ? 'Forecast rainfall may meet near-term crop water needs.' : 'No meaningful rainfall is forecast; soil moisture has not been measured.', confidence: 'Medium', data: 'Local demo weather; crop stage; irrigation type' },
    { category: 'Crop care', action: 'Inspect five plants in each field zone for leaf spots or wilting.', why: 'A short, repeatable field check can catch visible changes early.', confidence: 'Medium', data: 'Crop and growth stage from farm profile' },
    { category: 'Soil', action: 'Keep crop residue on the soil surface where practical.', why: 'Residue cover can reduce bare-soil exposure and help limit evaporation.', confidence: 'Medium', data: 'Farm profile; regenerative practice guidance' },
  ]
}