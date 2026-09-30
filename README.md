# AgriN

AgriN is an offline-first agricultural intelligence prototype for farmers, agricultural officers, and policy users.

## Problem

Farm decisions require combining weather, crop stage, soil, field observations, and local risk signals. These signals are often scattered and difficult to interpret, and demo values can be mistaken for verified measurements.

## Solution

AgriN brings a seeded farm profile, local demo data, and deterministic agronomy rules into one dashboard. It presents recommendations with reasons and data sources, and labels demo, illustrative, simulated, and predicted values so they are not mistaken for live measurements.

## Main features

- Farmer dashboard with health components, weather outlook, alerts, and activity history.
- Smart Field Suite with crop calendar, pest and harvest risk, water guidance, soil indicators, profitability estimates, crop rotation, farm-risk profile, and what-if simulation.
- Farm map with OpenStreetMap tiles, a farm marker, approximate demo boundary, farm details, fit/fullscreen controls, and risk/weather/vegetation/disease layers.
- Rule-based Advisor using farm context and local demo advisory data; voice input/output depends on browser support.
- Crop suitability and regenerative practice planners.
- Symptom-guided disease triage with local photo preview and persistent rule-based results. Photos are not sent to an image-recognition service.
- Farm activity timeline, notifications, Officer view, illustrative Policy dashboard, and BRICS interoperability concept screen.
- English, Hindi, and Telugu labels for selected farmer-dashboard content; offline/demo fallbacks.

## Tech stack

- React 19, TypeScript, and Vite 8
- Express 5 API with Zod request validation
- React-Leaflet and Leaflet for maps
- Recharts for charts
- Lucide React for icons
- Local JSON file for demo activity and diagnosis persistence

## Project structure

```text
src/                    React application, dashboard views, and styles
  App.tsx               Main app shell and farmer/officer workflows
  NationalDashboard.tsx Policy dashboard
  App.css               Application and map layout styles
  index.css             Global styles
  main.tsx              React entry point
server/                 Express API and deterministic domain rules
  index.ts              API routes and demo JSON persistence
  domain.ts             Health, crop ranking, alert, and advisory rules
  domain.test.ts        Domain tests
public/                 Static assets
  icons.svg             Interface icons
  favicon.svg           Browser icon
data/                   Runtime-generated demo-store.json (ignored by Git)
```

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Install and run locally

From the project root:

```sh
npm install
npm run dev:all
```

Open the Vite URL printed in the terminal, normally `http://localhost:5173`. The combined command starts Vite and the Express API. Vite proxies `/api` requests to `http://localhost:4174`.

To run the services separately, use two terminals:

```sh
npm run api
```

```sh
npm run dev
```

The API creates `data/demo-store.json` at runtime for activity and disease-triage history. This file is ignored by Git. Use **Run demo** to restore the seeded walkthrough records.

## Environment variables

No environment variables or external API credentials are required for the default demo. Optional local settings are listed in `.env.example`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4174` | Express API listening port |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Express CORS origin for direct browser API access |

Copy `.env.example` to `.env` only when overriding local defaults. `.env` and other environment files are ignored by Git. `.env.example` contains no secrets.

## API/backend setup

The Express API is implemented in `server/index.ts`; deterministic domain rules are in `server/domain.ts`. Available read/write routes and payload examples are documented in [API_DOCUMENTATION.md](API_DOCUMENTATION.md). For normal local use, start both services with `npm run dev:all`.

## Verify

```sh
npm test -- --run
npm run build
npm run lint
```

Tests cover deterministic health scoring, crop recommendation ranking, and weather-alert thresholds.

## Demo limitations

This is a hackathon prototype, not an operational agronomy or emergency system. Weather, satellite indices, farm records, Officer counts, Policy district figures, and BRICS activity are seeded or illustrative demo data unless explicitly identified otherwise. OpenStreetMap supplies the base map when online; the farm boundary is approximate demo geometry, not a surveyed parcel. The Advisor is rule-based, disease triage is not image-recognition AI, and there is no live government registry, inventory service, weather provider, satellite provider, authentication, or real federated learning.

See [ARCHITECTURE.md](ARCHITECTURE.md), [DATA_SOURCES.md](DATA_SOURCES.md), and [PRIVACY.md](PRIVACY.md) for implementation details and data boundaries. [DEMO_SCRIPT.md](DEMO_SCRIPT.md) and [PITCH.md](PITCH.md) contain presentation material.
