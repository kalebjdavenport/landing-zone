# Landing Zone

Landing Zone is a dispatcher-focused weather dashboard that combines National Weather Service alerts and forecasts with aviation overlays (METAR, TAF, SIGMET, NOTAM) into a single operational picture. Built for flight dispatchers who need immediate weather awareness for release decisions, alternate selection, and reroute risk, it surfaces what changed and when through a live delta feed, KPI cards, a route board, and an interactive overlay map.

![Dashboard screenshot](docs/screenshot.png)

## Architecture

```
GitHub Actions (every 10 min)
        |
        v
+------------------+       +-------------------------+
| NWS API          |------>|                         |
+------------------+       |  Ingest endpoints       |
                           |  /api/ingest/nws        |
+------------------+       |  /api/ingest/aviation   |
| Aviation Weather |------>|                         |
| Center API       |       +------------+------------+
+------------------+                    |
                              normalize + upsert
                                        |
                                        v
                              +-------------------+
                              | Supabase Postgres  |
                              | + Realtime         |
                              +--------+----------+
                                       |
                          event_log pushes changes
                                       |
                                       v
                              +-------------------+
                              | tRPC API layer     |
                              | /api/trpc          |
                              +--------+----------+
                                       |
                                       v
                              +-------------------+
                              | React dashboard    |
                              | (App Router)       |
                              +-------------------+
```

A GitHub Actions scheduler triggers ingest endpoints every 10 minutes. The pipeline fetches data from the NWS API and Aviation Weather Center API, normalizes it, and upserts it into Supabase Postgres. Supabase Realtime pushes changes to the frontend via the `event_log` table. tRPC serves data to the React dashboard using React Query for caching and updates.

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Framework | Next.js 16 (App Router)             |
| API       | tRPC 11 + React Query 5             |
| Database  | Supabase Postgres + Realtime        |
| Maps      | MapLibre GL 5                       |
| Styling   | Tailwind CSS 4 + shadcn primitives  |
| Testing   | Vitest                              |

## Getting Started

### Prerequisites

- Node.js 20+
- A Supabase project ([create one here](https://supabase.com/dashboard))

### Install

```bash
npm install
```

### Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

**Supabase (required)**

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL, from Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key, from the same page |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only), from the same page |

**NWS API (required)**

| Variable | Description |
|----------|-------------|
| `NWS_USER_AGENT` | Required by the NWS API to identify callers. Use the format `AppName/1.0 (contact@email.com)` |

**Optional**

| Variable | Description |
|----------|-------------|
| `INGEST_INTERNAL_TOKEN` | Bearer token to protect ingest endpoints from unauthorized calls |
| `WEBHOOK_SIGNING_SECRET` | HMAC secret for webhook signature verification (`x-signature: sha256=<hex>`) |

### Run database migration

Paste the SQL in `supabase/migrations/0001_landing_zone.sql` into the Supabase SQL Editor, or use the Supabase CLI:

```bash
supabase db push
```

### Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click "Run ingest" in the dashboard to populate initial data.

## Optional: Scheduled Ingest

To keep data fresh on deployed environments, enable the GitHub Actions workflow at `.github/workflows/ingest.yml`. Add these repository secrets:

| Secret | Value |
|--------|-------|
| `INGEST_BASE_URL` | Your deployed app URL (e.g., `https://your-app.vercel.app`) |
| `INGEST_TOKEN` | Must match the `INGEST_INTERNAL_TOKEN` value in your app's environment |

The workflow runs every 10 minutes and triggers both NWS and aviation ingest endpoints.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest |

## Design Decisions

See [docs/DESIGN.md](docs/DESIGN.md) for the user persona, feature rationale, and architectural tradeoffs.

## NWS-first Behavior

If aviation overlay ingestion fails, the app remains fully usable with NWS data only. Stale timestamps and status indicators keep the dispatcher informed.
