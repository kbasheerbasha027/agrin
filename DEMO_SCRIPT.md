# AgriN Live Demo Script (2–3 minutes)

## Before the judges arrive

1. Run `npm run dev:all` and open http://localhost:5173.
2. Confirm the sidebar says **Offline Demo Mode** and the page labels its signals as demo data.
3. Use **Run demo** once to restore the known seed.
4. The map base tiles need internet. If unavailable, explain that the farm boundary and overlay are local demo geometry; continue with the dashboard and chart.

## Walkthrough

1. **Command center (0:00–0:25):** Point to the 78/100 demo farm-health score and its components, 31°C local fixture, cotton flowering stage, missing soil lab data, and rain-watch alert. Say explicitly that the weather is a local demo fixture.
2. **Actions (0:25–0:45):** Explain why irrigation is delayed and why field drainage should be checked. Show the recommendation confidence and data-used context.
3. **Map and crop planner (0:45–1:10):** Open Farm map and identify the illustrative boundary and demo risk overlay. Open Crop planner and show ranked crops and the 30/25/20/15/10 weighting. Clarify this is a prototype score, not a yield forecast.
4. **Disease and regeneration (1:10–1:40):** In Disease check, select the included `src/assets/hero.png`, choose Leaf spots, and click Review symptoms. Explain that the photo is preview-only; the current result comes from selected symptoms, has low confidence, and needs expert confirmation. Open Regenerative to show the estimated practice shifts and 90-day sequence.
5. **Officer and network (1:40–2:15):** Open Officer view for clearly illustrative district counts and response priorities. Open BRICS network and emphasize that federated learning is only a simulation: no country is connected and no model is being trained.
6. **Persistence/reset (2:15–2:30):** Open Farm timeline to record a short field note if time allows. Finish with Run demo to restore seed records.

## Claims to avoid

Do not describe demo weather as live, synthetic vegetation values as satellite measurements, symptom triage as image AI, officer totals as official, the BRICS display as connected infrastructure, or the health score as an agronomic certification.
