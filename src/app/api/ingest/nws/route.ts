import { NextResponse } from "next/server";

import { createContext } from "@/server/api/trpc";
import { runNwsIngest } from "@/server/ingest/pipeline";

function isAuthorized(request: Request) {
  const expected = process.env.INGEST_INTERNAL_TOKEN;
  if (!expected) {
    return true;
  }

  const provided = request.headers.get("x-ingest-token");
  return provided === expected;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = createContext();
  const body: unknown = await request.json().catch(() => ({}));
  const rawSeeds =
    typeof body === "object" && body !== null && "seeds" in body
      ? (body as { seeds?: unknown }).seeds
      : undefined;

  const seeds = Array.isArray(rawSeeds)
    ? rawSeeds.filter((item): item is { lat: number; lon: number } => {
        const candidate = item as { lat?: unknown; lon?: unknown };
        return (
          typeof item === "object" &&
          item !== null &&
          typeof candidate.lat === "number" &&
          typeof candidate.lon === "number"
        );
      })
    : undefined;

  const result = await runNwsIngest(context, seeds);

  return NextResponse.json(result, {
    status: result.success ? 200 : 502,
  });
}
