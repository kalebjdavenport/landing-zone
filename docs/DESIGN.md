# Landing Zone -- Design Document

This document covers the user persona, design principles, feature rationale, and architectural decisions behind Landing Zone.

## User Persona

### Who they are

Cynthia is an FAA-certified flight dispatcher working a domestic route desk. She holds shared operational control responsibility with the pilot-in-command, which means she is legally accountable for the safety of every release she signs.

### Why weather matters

Under operational control responsibilities, Cynthia needs immediate weather awareness for release decisions, alternate airport selection, and reroute risk assessment. Weather is not background information for her -- it is the primary input to her core job function. A missed convective SIGMET or an overlooked TAF amendment can ground flights, force diversions, or worse.

## Design Principles

### At-a-glance vs dig-for-details

The dashboard is structured around two information tiers:

**At a glance** -- what Cynthia sees without clicking anything:

- National alert intensity and severe alert count
- Route risk status and active hazards
- Staleness timestamps for data reliability

**Dig for details** -- available on interaction:

- Localized forecast periods
- Raw overlay text and individual hazard updates
- Station-level operational weather values (visibility, ceiling, wind)

This separation ensures the default view supports rapid decision-making during high-tempo operations, while full detail remains accessible when Cynthia needs to brief a captain or justify a release decision.

### Delight vs friction

**Delight** -- things that make Cynthia's workflow faster and more confident:

- Instant delta feed when hazards change, so she never has to wonder "what's new"
- Overlay toggles to reduce map noise when she only cares about one hazard type
- One-screen brief with route context, eliminating tab-switching between tools

**Friction** -- things the dashboard deliberately avoids:

- Generic weather views that hide operational severity behind consumer-grade summaries
- Silent refresh failures that erase last-known-good state without warning
- Layouts that require scrolling to see critical status during time-sensitive operations

## Feature Rationale

### Delta Feed

A chronologically animated feed shows newly created, updated, and expired operational weather events.

Why it exists for Cynthia: dispatch decisions are event-driven. "What changed in the last 10 minutes" matters more than a raw weather snapshot. The delta feed surfaces exactly that -- new SIGMETs, amended TAFs, expired alerts -- in the order they occurred, so Cynthia can react to changes rather than re-scanning the entire picture.

### Visualization choices

| Component | Purpose |
|-----------|---------|
| KPI cards | National weather posture at a glance -- total alert count, severity distribution, data freshness |
| Route board | Station-level operational status for each route segment, showing ceiling/visibility/wind in dispatcher-relevant terms |
| Overlay map | Spatial hazard awareness -- the primary visualization, explained below |
| Delta feed | Temporal change awareness -- what happened, when, sorted by severity then recency |

These four components communicate operational risk faster than plain tables by pairing severity with geography and recency.

### Why a map instead of text or data tables

The overlay map is the central visualization in Landing Zone because the dispatcher's core question is spatial: **"Does my route pass through this hazard?"** That question cannot be answered efficiently by a table.

**Weather hazards are spatial phenomena with irregular boundaries.** A convective SIGMET covers an arbitrary polygon -- for example, a band of thunderstorms stretching from central Virginia to southern Connecticut. A table row saying "SIGMET 45E -- convective activity, moderate turbulence, 38.5°N to 40.3°N, -78.0°W to -75.5°W" forces Cynthia to mentally project those coordinates onto her route network. On a map, she sees the polygon overlaid on her route in under a second.

**NEXRAD radar data is inherently raster.** Precipitation returns are a grid of reflectivity values across the continental US. There is no meaningful tabular representation -- a table of "reflectivity at grid cell (x, y)" would be thousands of rows of numbers. A radar tile overlay on a map immediately shows Cynthia where precipitation is, how intense it is, and whether it intersects her routes.

**Dispatchers cross-reference multiple layers simultaneously.** Cynthia needs to see radar returns, SIGMET boundaries, METAR station observations, and NOTAM restrictions at the same time. On a map, these layers stack and she can visually correlate them: "There's a line of moderate returns crossing KJFK approach, and the METAR shows 3SM visibility, and there's an active SIGMET overlapping the same area." In a table, this correlation requires scanning across separate tables and mentally reconstructing the spatial picture.

**Station-level data gains meaning from geography.** A table can show that KATL ceiling is 800ft and KJFK ceiling is 200ft, but it cannot show that there's a band of IFR conditions connecting the two airports along the entire route. The map's color-coded METAR markers (VFR green, MVFR blue, IFR red, LIFR magenta) instantly reveal geographic patterns in station data that tables hide.

**What the map does not replace.** Precise numeric values (altimeter settings, wind components, temperature/dewpoint spreads) are better served by the Location Details card and Route Board table. The map complements these views -- it answers "where" while they answer "how much." The dashboard uses both because dispatch decisions require both spatial awareness and precise operational numbers.

## Architectural Decisions

### NWS as primary source

The National Weather Service API serves as the source of truth for all core weather data: alerts, forecasts, and observation stations. NWS data is free, authoritative, and covers the continental US comprehensively.

### Aviation overlays as enrichment

METAR, TAF, SIGMET, and NOTAM data from the Aviation Weather Center API enriches the NWS baseline with dispatcher-specific operational weather. These overlays are treated as optional enrichment, not requirements.

### Fail-open behavior

If aviation overlay ingestion fails, the dashboard remains fully functional with NWS data only. Stale timestamps and status indicators make the data gap visible to the dispatcher without breaking the interface. This ensures Cynthia always has a working tool, even when upstream aviation APIs are degraded.

## Tradeoffs and Future Work

### Current assumptions

- **Single-tenant demo mode.** No user authentication or multi-desk support. The dashboard assumes a single dispatcher viewing a fixed set of routes.
- **External scheduler.** Ingest runs on a GitHub Actions cron (every 10 minutes) rather than an internal scheduler, which keeps the app stateless on free-tier hosting but adds deployment complexity.
- **NOTAM integration.** The NOTAM adapter interface is defined but backed by a stub. Real NOTAM data requires either an FAA API key or a commercial provider.

### Next priorities

- Route-specific ingest targeting, so the scheduler only fetches weather for stations on active routes
- Stronger NOTAM provider integration with a real upstream source
- Expanded test coverage for ingest retries and Supabase Realtime fanout
- Route-specific acknowledgment workflow, letting dispatchers mark hazards as "reviewed"
- Configurable severity thresholds per route desk
