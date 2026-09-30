# Privacy and Security Notes

## Current demo handling

- The demo contains a fictional/illustrative farmer and farm profile. Do not enter real personal or sensitive farm data.
- Selected crop images are validated for JPG, PNG, or WEBP MIME type and an 8 MB client-side size limit, previewed in the browser, and not uploaded to the API.
- Activity notes and symptom triage records are stored locally by the API in `data/demo-store.json`; they are not encrypted and have no per-user access controls.
- No API keys or user credentials are required. The BRICS screen does not transmit data.
- OpenStreetMap base tiles are fetched from an external tile service when online; browsing the map reveals normal network metadata to that service.

## Not production-ready

This prototype does not implement login, authorization, consent management, retention policies, encryption at rest, audit logging, rate limiting, malware scanning, server-side image validation, or data-subject export/deletion workflows. CORS is a development default, not a security boundary. Do not use this service for real farmer records until those controls and a threat model are implemented.

## Recommended production safeguards

Collect only fields needed for an explicit farm service; obtain clear consent for location, photos, and cross-border aggregation; retain raw farm data within the agreed jurisdiction; share only approved, aggregated or protected model updates; define deletion/retention schedules; use least-privilege role access; protect transport and stored data; and independently review model and agronomic outputs.
