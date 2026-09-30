# Data Sources and Provenance

| Data | Current source | Status and caveat |
| --- | --- | --- |
| Farm profile and location | Seeded record in `server/index.ts` | Demonstration identity and coordinates; not verified farm data |
| Weather and seven-day outlook | Local fixture in `server/index.ts` | Offline demo weather; not a forecast service |
| Soil | Farm profile only | Soil type is seeded; pH, nutrients, moisture, organic matter, and salinity are unavailable and returned as missing/null |
| Vegetation index | Local satellite fixture | Synthetic values labeled Demo Satellite Data; not measured NDVI |
| Farm boundary and risk point | Client-generated geometry | Illustrative polygon/marker; not surveyed boundaries or measured zones |
| Base map | OpenStreetMap tiles | External tiles require internet and follow the tile provider's usage policy |
| Disease result | Rule-based symptom matching | No visual model; low-confidence triage only |
| Crop recommendations | Deterministic rules in `server/domain.ts` | Transparent prototype scores; not validated yield or suitability forecasts |
| Officer counts/resource signals | UI/API demo fixtures | Illustrative aggregates, not government inventory or a registry |
| BRICS/federated learning | UI concept visualization | No data exchange, cross-country connection, or model training occurs |

Every future live provider should return provenance, observation time, coverage/quality, and fallback status alongside measurements. Do not merge demo and verified observations without preserving source labels.
