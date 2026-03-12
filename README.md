# Landing Zone

A weather dashboard built for one person: the aircraft dispatcher who decides if your flight takes off.

---

## Meet Cynthia

Cynthia is an FAA-certified aircraft dispatcher at Delta Air Lines. She holds an ADX certificate, which means she shares legal authority with the pilot-in-command over every domestic flight on her desk. Under 14 CFR §121.533, both of them must agree before a plane pushes back — and either one can say no.

On a typical shift she's juggling 15–20 flights, scanning METARs and TAFs, watching SIGMETs roll in, and making go/no-go calls before the crew even boards. She thinks in airport codes, not city names. She drinks too much coffee. And somewhere in the back of her mind, she's still convinced she's going to find Amelia Earhart.

Landing Zone is built around Cynthia's workflow: what changed, what's dangerous, and can this flight go.

---

## What It Does

Five views, each mapped to a real dispatcher duty:

| View | Duty it supports | What Cynthia sees |
|------|-----------------|-------------------|
| **National Report** | Pre-flight weather analysis | Alert count, severity badge, risk guidance translated into dispatcher terms |
| **Route Board** | Go/no-go + flight monitoring | Flight category, visibility, ceiling, wind, and hazards per station |
| **Overlay Map** | Spatial awareness | **Primary visualization** — METAR, TAF, SIGMET, and NOTAM markers over NEXRAD radar, cloud, and temperature tiles |
| **Location Weather** | Alternate selection | Full observation: flight cat, vis, ceiling, wind/gusts, temp/dewpoint spread, altimeter, alerts with expiry |
| **Delta Feed** | In-flight monitoring | Top 10 weather events sorted by severity, then recency — answers "what's most dangerous right now?" |

These views work together because dispatch decisions require cross-referencing severity, station data, geography, and recency. No single chart covers that.

### Why a map, not a table

The overlay map is the centerpiece because the dispatcher's core question is spatial: **"Does my route pass through this hazard?"**

- **Weather hazards have irregular boundaries.** A convective SIGMET covers an arbitrary polygon — a table of coordinates forces Cynthia to mentally project them onto her routes. On the map, she sees the polygon overlaid in under a second.
- **Radar data is inherently raster.** NEXRAD precipitation returns are a grid of reflectivity values. There is no meaningful tabular representation — only a map overlay reveals where precipitation intersects routes.
- **Dispatchers cross-reference layers simultaneously.** Radar + SIGMETs + METAR stations + NOTAMs need to be seen together. On a map they stack; in tables, Cynthia would need to mentally reconstruct the spatial picture from separate lists.
- **Station patterns are geographic.** A table shows KATL ceiling 800ft and KJFK ceiling 200ft individually, but it cannot show the band of IFR conditions connecting them along the route.

Precise numeric values (altimeter, wind components, temp/dewpoint spread) are better as text — that's what the Location Weather card and Route Board provide. The map answers "where and how big," they answer "how much." See [docs/DESIGN.md](docs/DESIGN.md) for the full rationale.

---

## The Search Bar

Cynthia types KATL, not "Atlanta." The search bar works the way she thinks:

- **305 US airports** — all 50 states, DC, and territories, bundled client-side (~15KB gzipped)
- **Instant filtering** — no network call, no autocomplete API, zero latency
- **ICAO, IATA, airport name, or city** — any of these work
- **Keyboard-first** — arrow keys, Enter to select, Escape to close
- **Prefetch on hover** — weather loads before she commits to a selection
- **Bookmarkable** — airport syncs to the URL so she can share a link or bookmark her route desk
- **Persistent** — last selection saved to localStorage, restored on reload

---

## Dispatcher-Grade Data

The original project showed consumer weather — "Partly Cloudy, 72°F." Cynthia needs something different.

| Field | Why it matters |
|-------|---------------|
| **Flight category** (VFR/MVFR/IFR/LIFR) | First thing a dispatcher checks. Color-coded green/blue/red/magenta |
| **Visibility** (statute miles) | One of two inputs that determine flight category |
| **Ceiling** (feet AGL) | The other input. Derived from lowest BKN/OVC cloud layer |
| **Wind** (knots, with gusts) | Crosswind and tailwind limit checks |
| **Temp/dewpoint spread** | Spread ≤ 3°F = fog or icing risk, highlighted amber |
| **Altimeter** (inHg) | Pressure altitude corrections |
| **Alert expiry** | "Expires in 2h 15m" — tells Cynthia when conditions change |

Flight category is computed from FAA standard thresholds, not pulled from an external decode. Correct for standard conditions; doesn't handle variable visibility or station-specific approach minimums.

---

## Architecture

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) |
| API | tRPC 11 + React Query 5 |
| State | Zustand 5 with persist middleware |
| Database | Supabase Postgres + Realtime |
| Maps | MapLibre GL 5 + NEXRAD radar (Iowa State Mesonet) + OWM tiles |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Testing | Vitest + Testing Library |

**NWS-first, fail-open.** If aviation overlay ingestion fails, the dashboard stays fully functional with NWS data. Stale timestamps make the gap visible without breaking anything. Cynthia always has a working tool.

---

## Setup

### Prerequisites

- Node.js 20+
- A [Supabase project](https://supabase.com/dashboard)

### Install and configure

```bash
git clone <repo-url>
cd landing-zone
npm install
cp .env.example .env.local
```

Edit `.env.local`:

| Variable | Required | What it is |
|----------|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (server-side only) |
| `NWS_USER_AGENT` | Yes | NWS caller ID, e.g. `LandingZone/1.0 (you@email.com)` |
| `NEXT_PUBLIC_OWM_KEY` | No | OpenWeatherMap key for cloud/temp map tiles |
| `INGEST_INTERNAL_TOKEN` | No | Bearer token for ingest endpoints |
| `WEBHOOK_SIGNING_SECRET` | No | HMAC secret for webhook verification |

### Run the migration

Paste `supabase/migrations/0001_landing_zone.sql` into the Supabase SQL Editor, or:

```bash
supabase db push
```

### Start it up

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000). The dashboard auto-ingests data on first load. Hit **Refresh Data** in the nav bar anytime.

### Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |
| `npm run test:watch` | Vitest in watch mode |

---

## Tradeoffs

| Decision | Upside | Downside |
|----------|--------|----------|
| Airport-only search (305 airports) | Instant, offline, no ambiguous results | Can't check weather at a non-airport waypoint |
| Client-side airport DB | Zero-latency search, no server dependency | ~15KB added to bundle; wouldn't scale to thousands of intl airports |
| No auth | Simple for a single-desk demo | No multi-user, no role-based access |
| GitHub Actions cron for ingest | Stateless on free-tier hosting | Data can be up to 10 min stale |
| Computed flight category | Works for standard conditions | Doesn't handle variable vis or station-specific minimums |
| Stubbed NOTAM adapter | Interface is defined, layer shows in legend | No real data until an FAA API key is connected |

---

## What's Next

- **Route-specific ingest** — only fetch weather for stations on active routes
- **Dispatcher ack workflow** — let Cynthia mark hazards as "reviewed"
- **Real NOTAM provider** — connect to FAA's NOTAM API
- **PIREPs** — pilot reports of in-flight conditions (turbulence, icing)
- **Winds aloft** — upper-level forecasts for fuel planning
- **Multi-desk support** — per-user route configs, shift handoffs
- **Find Amelia Earhart** — Cynthia's not giving up
