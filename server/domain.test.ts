import assert from 'node:assert/strict'
import test from 'node:test'
import { cropRecommendations, farmHealthScore, generateAlerts, type FarmContext } from './domain.js'

const context: FarmContext = {
  crop: 'Cotton', cropStage: 'Flowering', soilType: 'Black cotton', irrigation: 'Drip',
  previousCrop: 'Legumes', farmSizeHa: 2.4,
  weather: { precipitationProbability: 78, rainfallMm: 12, temperatureC: 31, humidity: 67, windKph: 9 },
}

test('farm health score is deterministic and exposes its components', () => {
  const first = farmHealthScore(context)
  assert.equal(first.score, farmHealthScore(context).score)
  assert.deepEqual(Object.keys(first.components), ['crop', 'water', 'weather', 'soil', 'disease', 'regenerative'])
  assert.ok(first.score >= 0 && first.score <= 100)
})

test('crop recommendations are ranked and expose transparent weights', () => {
  const results = cropRecommendations({ soilType: 'Black cotton', rainfallMm: 12, temperatureC: 28, irrigation: 'Drip', previousCrop: 'Legumes' })
  assert.equal(results[0].name, 'Sorghum')
  assert.equal(Object.values(results[0].weights).reduce((sum, value) => sum + value, 0), 100)
  assert.ok(results[0].score >= results.at(-1)!.score)
})

test('alert rules turn high rainfall probability into a clear action', () => {
  const alerts = generateAlerts({ ...context.weather, precipitationProbability: 88 })
  assert.equal(alerts[0].level, 'high')
  assert.match(alerts[0].action, /irrigation/i)
})