# Landing Zone

A dispatcher-focused weather dashboard built on the National Weather Service API. Landing Zone gives flight dispatchers a single operational picture combining NWS alerts, forecasts, and aviation overlays (METAR, TAF, SIGMET, NOTAM) so they can make release decisions without switching between tools.

## 1. User Persona

**Cynthia** is an FAA-certified flight dispatcher working a domestic route desk. She holds shared operational control responsibility with the pilot-in-command, which means she is legally accountable for the safety of every release she signs.

Weather is not background information for Cynthia — it is the primary input to her core job function. She needs immediate weather awareness for:

- **Release decisions** — signing off a flight based on current and forecast conditions
- **Alternate airport selection** — identifying suitable alternates when destination weather deteriorates
- **Reroute risk assessment** — evaluating whether en-route hazards warrant a different flight plan

A missed convective SIGMET or an overlooked TAF amendment can ground flights, force diversions, or worse. Cynthia's workflow is event-driven: "what changed in the last 10 minutes" matters more than a raw weather snapshot.

## 2. User-Specific Feature

**Airport-centric search with instant results and prefetched weather.**

The search bar is tuned specifically for Cynthia's mental model. Dispatchers think in airport codes — KATL, KJFK, KORD — not city names or zip codes. The search bar accepts ICAO codes, IATA codes, airport names, or cities and instantly filters a local database of 305 US airports (all 50 states, DC, and US territories) with no network dependency.

What makes it dispatcher-specific:

- **Instant client-side filtering** — results appear as you type with zero latency, because dispatchers don't wait for autocomplete APIs during time-sensitive operations
- **Keyboard navigation** — Arrow keys, Enter to select, Escape to close. Dispatchers live on the keyboard
- **Optimistic weather prefetch** — as Cynthia arrows through results, the app prefetches weather for the highlighted airport so data is ready the moment she selects it
- **Bookmarkable state** — selected airport syncs to the URL (`?lat=33.6367&lon=-84.4281&label=KATL...`) so Cynthia can share a link with a colleague or bookmark her primary route desk
- **Persistent across sessions** — the last-selected airport is saved to localStorage and restored on reload

## 3. Why This Visualization

The dashboard is structured around four complementary views, each communicating a different dimension of operational risk:

| Component | What it shows | Why it matters for dispatch |
|-----------|--------------|----------------------------|
| **National Report** | Nationwide alert count, severity distribution, threat level badge, and actionable risk guidance derived from active weather events | Gives Cynthia a 2-second read on national weather posture before she digs into specifics |
| **Route Board** | Station-level operational status for each route segment — ceiling, visibility, wind, and flight category (VFR/IFR/LIFR) | The core dispatcher artifact: are my routes flyable right now? |
| **Location Weather + Overlay Map** | Localized forecast periods, METAR/TAF/SIGMET/NOTAM markers, and radar tiles plotted on an interactive map | Pairs temporal forecasts with spatial hazard awareness so Cynthia can see what's coming and where |
| **Delta Feed** | Chronological stream of created, updated, and expired weather events | Answers "what changed?" — the most important question during high-tempo operations |

These four views work together because dispatch decisions require cross-referencing severity (national report), geography (map), station-level detail (route board), and recency (delta feed). A single table or chart can't do that.

The threat level system in the National Report translates raw NWS event names (e.g., "Winter Storm Warning", "Severe Thunderstorm Watch") into dispatcher-relevant risk guidance like "icing and low visibility risk for en-route segments" — because Cynthia needs to know what to *do*, not just what the weather *is*.

## 4. What I Changed and Why

### Airport-only search (deliberate product decision)

The starter project used a generic city geocoding approach with an external API. I replaced it with a curated database of 305 US airports and airport-only search. This was a deliberate product decision, not a limitation:

- **Dispatchers think in airports, not cities.** Cynthia's workflow starts with "what's the weather at KATL?" not "what's the weather in Atlanta?" The NWS forecast for downtown Atlanta is irrelevant to her — she needs the forecast for the airport's coordinates
- **Zero external API dependency for search.** The airport database is bundled client-side. Search works instantly, offline, and never rate-limits. This matters because search is the most frequently used interaction
- **Scoped data quality.** 305 airports is a manageable, verified dataset. Every entry has correct ICAO/IATA codes, precise coordinates, and proper state attribution. A generic geocoding API returns thousands of results with varying quality

### State management overhaul

Replaced 7 `useState` calls scattered across the dashboard with a centralized Zustand store. This enabled:

- Bidirectional URL sync (bookmarkable state)
- localStorage persistence for user preferences
- Any component can read/write location, route, and view state without prop drilling

### Actionable national weather summary

The national report card now maps NWS alert event names to dispatcher-relevant risk guidance. Instead of showing "17 of 647 alerts are severe" (which is just restating the numbers displayed in the badges above), it surfaces actionable guidance like "Key risks: icing and low visibility risk for en-route segments; convection, hail, and windshear risk."

### NWS-first, fail-open architecture

If aviation overlay ingestion fails, the dashboard remains fully functional with NWS data only. Stale timestamps and status indicators make the data gap visible without breaking the interface. This ensures Cynthia always has a working tool, even when upstream aviation APIs are degraded.

## 5. Setup and Running Instructions

### Prerequisites

- Node.js 20+
- A Supabase project ([create one here](https://supabase.com/dashboard))

### Install

```bash
git clone <repo-url>
cd landing-zone
npm install
```

### Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (Project Settings > API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key (same page) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key, server-side only (same page) |
| `NWS_USER_AGENT` | Yes | NWS API caller ID, e.g. `LandingZone/1.0 (you@email.com)` |
| `NEXT_PUBLIC_OWM_KEY` | No | OpenWeatherMap key for cloud/temperature map tiles |
| `INGEST_INTERNAL_TOKEN` | No | Bearer token to protect ingest endpoints |
| `WEBHOOK_SIGNING_SECRET` | No | HMAC secret for webhook signature verification |

### Run database migration

Paste the SQL in `supabase/migrations/0001_landing_zone.sql` into the Supabase SQL Editor, or use the CLI:

```bash
supabase db push
```

### Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dashboard auto-runs an initial data ingest when no data is present. You can also click **Refresh Data** in the nav bar to trigger a manual ingest.

### Run tests

```bash
npm run test
```

### Available scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest |
| `npm run test:watch` | Run Vitest in watch mode |

### Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| API | tRPC 11 + React Query 5 |
| State | Zustand 5 with persist middleware |
| Database | Supabase Postgres + Realtime |
| Maps | MapLibre GL 5 |
| Styling | Tailwind CSS 4 + shadcn/ui primitives |
| Testing | Vitest + Testing Library |

## 6. Tradeoffs and What's Next

### Tradeoffs I made

- **Airport-only search vs. arbitrary location.** I scoped search to 305 US airports rather than supporting any lat/lon. This means Cynthia can't check weather for a waypoint that isn't an airport. I chose this because dispatchers primarily operate in airport codes, and a curated dataset gives better UX (instant search, correct coordinates, no ambiguous results) than a generic geocoding API. If waypoint weather were needed, the Zustand store already accepts any lat/lon — only the search UI would need to change.

- **Client-side airport database vs. server search.** The 305-airport JSON file is bundled into the client (~15KB gzipped). This trades a small bundle size increase for zero-latency search with no server dependency. At 305 entries this is fine; if the dataset grew to thousands of international airports, I'd move to a server endpoint with pagination.

- **Single-tenant, no auth.** The dashboard assumes one dispatcher. There's no login, no per-user route desk configuration, no role-based access. For an interview project this is appropriate, but production would need multi-desk support and access control.

- **External scheduler for ingest.** Data freshness depends on a GitHub Actions cron job (every 10 minutes) rather than an internal scheduler. This keeps the app stateless on free-tier hosting but adds deployment complexity and means data can be up to 10 minutes stale.

- **NOTAM adapter is stubbed.** The NOTAM integration interface is defined but backed by a stub. Real NOTAM data requires an FAA API key or commercial provider. The overlay map shows the NOTAM layer in the legend but it won't populate until a real provider is connected.

### What's next

- **Route-specific ingest targeting** — only fetch weather for stations on active routes, reducing API calls and improving relevance
- **Dispatcher acknowledgment workflow** — let Cynthia mark hazards as "reviewed" so the route board reflects human assessment, not just raw data
- **Expanded test coverage** — integration tests for ingest retry logic and Supabase Realtime fanout
- **Real NOTAM provider** — connect to FAA's NOTAM API for complete operational picture
- **Multi-desk support** — per-user route configurations and shared state for shift handoffs
