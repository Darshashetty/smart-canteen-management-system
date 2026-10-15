# Composition Brief: Smart Canteen

## Objective
Create a 90-second landscape product demonstration using the actual Smart Canteen UI and its complete customer, kitchen, collection, manager, and AI workflows.

## Output
- Composition directory: `brag-output-2026-10-01-155007/composition/`
- Rendered video target: `brag-output-2026-10-01-155007/brag.mp4`
- Poster target: `brag-output-2026-10-01-155007/brag.jpg`
- Format: landscape, 1920x1080
- Duration: 90 seconds

## Source material
- Project root: `SmartCanteen/`
- Primary screens: `app/page.tsx`, `components/CustomerHome.tsx`, `components/CartCheckout.tsx`, `components/LiveOrderTracker.tsx`, `components/KitchenDashboard.tsx`, `components/ManagerDashboard.tsx`
- Backend proof points: `backend/src/routes/orderRoutes.js`, `backend/src/routes/queueRoutes.js`, `backend/src/routes/collectionRoutes.js`, `backend/src/routes/analyticsRoutes.js`, `backend/src/routes/aiRoutes.js`
- Product claims grounded in README: atomic stock and slot management, idempotency, finite order state machine, single-use token/QR handover, dynamic ETA, Socket.io updates, analytics, and seven AI engines.

## Creative direction
- Tone: polished product walkthrough
- Angle: follow one order from menu to collection, then zoom out to the operational intelligence behind it.
- Hook: "Lunch break should not mean queue break."
- Outro: "From browse to pickup, every order has a place in the queue."
- Avoid: invented metrics, personal data, credentials, generic SaaS claims, and abstract filler.

## Visual identity
Use the existing #f8f9ff page background, white cards, slate-900 operational panels, orange actions, blue manager identity, and emerald healthy-status indicators. Keep real UI copy and food imagery visible. Substitute seeded/demo names with fictional or generic labels if any personal data appears.

## Scene timing
1. Lunch rush problem and product reveal — 8s
2. Menu browsing and filters — 12s
3. AI recommendations — 9s
4. Cart and pickup slot — 11s
5. Digital token and live tracking — 11s
6. Kitchen queue and delay action — 12s
7. Ready, QR/token collection — 10s
8. Manager KPIs and reports — 12s
9. AI operations cockpit and outro — 5s

## Audio
Use the bundled happy-beats-business-moves track with a restrained upbeat bed. Add click/confirmation accents for filter, cart, status, verification, and AI card reveals. Keep audio below UI copy and fade beneath the final title.

## Validation requirements
- Show actual product UI in multiple scenes.
- Keep all visible text readable.
- Verify the final duration is between 60 and 120 seconds.
- Render with a controlled poster frame showing the menu plus Smart Canteen title.
- Do not include credentials, tokens used for authentication, private URLs, or real personal information.

## Current environment note
Hyperframes CLI did not return a usable command in this environment, and FFmpeg is not installed. The storyboard and brief are complete; render requires installing the Hyperframes/FFmpeg toolchain or using an equivalent local video renderer.
