# AgriN Demo API

Base URL when running locally: `http://localhost:4174`. With Vite, call the same routes as `/api/...`; the dev server proxies them. All payloads are JSON. Current responses use seeded/demo values unless the route writes to the local JSON store.

## Read routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Service status, operating mode, timestamp |
| GET | `/api/farms` | The seeded demo farm |
| GET | `/api/dashboard` | Farm, weather, health score/components, alerts, activities, demo mode |
| GET | `/api/weather` | Offline forecast and current conditions |
| GET | `/api/soil` | Soil type plus null lab/sensor fields and missing test list |
| GET | `/api/crops` | Ranked crop candidates with score and weights |
| GET | `/api/advisories` | Rule-based recommendations with why/confidence/data-used fields |
| GET | `/api/alerts` | Weather threshold alerts with level, why, and action |
| GET | `/api/disease` | Persisted demo triage history |
| GET | `/api/satellite` | Synthetic vegetation index history; provider explicitly labeled demo |
| GET | `/api/officer` | Illustrative district counts and priority alerts |

## Write routes

### `POST /api/activities`

Request:

```json
{"type":"Field check","note":"Checked five plants in the east zone"}
```

`type` is trimmed, 2–40 characters; `note` is trimmed, 3–240 characters. Returns `201` and the stored activity. Invalid data returns `400` with an error message.

### `POST /api/disease`

Request:

```json
{"crop":"Cotton","symptoms":["Leaf spots"]}
```

`crop` is 2–50 characters. `symptoms` contains 1–8 strings of at most 50 characters. Returns `201` with a low-confidence rule-based result, possible causes, action, prevention, and an explicit note that no image-recognition model is used. The client-side photo is not sent to this endpoint.

### `POST /api/demo/reset`

No body required. Resets local activity and triage history to the seed data and returns `{ "ok": true, ... }`.

## Error handling and security status

Validation failures return `400`; unknown routes return `404`. The API is a local prototype: it currently has no authentication, authorization, rate limiting, production-grade centralized error handling, or durable database guarantees. Do not expose it as a public service without those controls.
