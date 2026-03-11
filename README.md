# Landing Zone

Landing Zone is a dispatcher-focused weather dashboard built for the InfoTrack front-end challenge.

It uses the **National Weather Service API as the primary weather source**, then enriches decision-making with aviation overlays (METAR/TAF/SIGMET/NOTAM) and a live delta feed.

## 1. User Persona

### Who they are
Cynthia is an FAA-certified flight dispatcher working a domestic route desk.

### Why weather matters
Under operational control responsibilities, Cynthia needs immediate weather awareness for release decisions, alternates, and reroute risk.

### At-a-glance vs dig-for details
At a glance:
- National alert intensity and severe alert count
- Route risk and active hazards
- Staleness timestamp for data reliability

Dig-for details:
- Localized forecast periods
- Raw overlay text and individual hazard updates
- Station-level operational weather values

### Delight vs friction
Delight:
- Instant delta feed when hazards change
- Overlay toggles to reduce map noise
- One-screen brief with route context

Friction:
- Generic weather views that hide operational severity
- Silent refresh failures that erase last-known-good state

## 2. User-Specific Feature

### Delta Feed
A chronologically animated feed shows newly created/updated/expired operational weather events.

Why it exists for Cynthia:
- Dispatch decisions are event-driven; "what changed" matters more than raw weather snapshots.

With more time:
- Add route-specific acknowledgment workflow
- Add configurable severity thresholds per route desk

## 3. Why This Visualization

The dashboard uses:
- KPI cards for national weather posture
- Route board for station-level operational status
- Overlay map for spatial hazard awareness
- Delta feed for temporal change awareness

This communicates operational risk faster than plain tables by pairing **severity + geography + recency**.

## 4. What I Changed and Why

Potential disagreement:
- A strict "NWS-only" build misses common dispatcher overlays (METAR/TAF/SIGMET/NOTAM).

What I did:
- Kept NWS as source-of-truth for required core weather flows.
- Added aviation overlays as optional enrichment with fail-open behavior.

Why:
- Preserves challenge requirements while matching real dispatch workflows.

## 5. Setup and Running Instructions

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env.local
```

3. Configure Supabase and run the SQL migration in `supabase/migrations/0001_landing_zone.sql`.

4. Start dev server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

Optional scheduler for free-tier hosting:
- Use `.github/workflows/ingest.yml`
- Set repository secrets:
  - `INGEST_BASE_URL` (example: `https://your-app.vercel.app`)
  - `INGEST_TOKEN` (matches `INGEST_INTERNAL_TOKEN`)

## 6. Tradeoffs and What’s Next

Assumptions:
- Single-tenant demo mode (no user auth)
- Supabase Realtime handles live updates

Tradeoffs:
- External scheduler needed for frequent ingest on free-tier hosting
- NOTAM integration currently adapter-friendly and mockable

Next priorities:
- Route-specific ingest targeting
- Stronger NOTAM provider integration
- Expanded test coverage for ingest retries and realtime fanout

## Architecture

- **Frontend:** Next.js App Router, TypeScript, Tailwind, shadcn-style primitives, Magic UI-inspired animated components, MapLibre GL
- **API:** tRPC (`/api/trpc`)
- **Data:** Supabase Postgres + Realtime
- **Ingest:**
  - `POST /api/ingest/nws`
  - `POST /api/ingest/aviation`
  - `POST /api/webhooks/:source`

## Scripts

- `npm run dev` - start development server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - ESLint
- `npm run test` - Vitest

## NWS-first Behavior

If aviation overlay ingestion fails, the app remains usable using NWS data with stale timestamps and clear status indicators.
