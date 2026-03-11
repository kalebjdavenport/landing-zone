import { NextResponse } from "next/server";

import { createContext } from "@/server/api/trpc";
import { runAviationIngest } from "@/server/ingest/pipeline";

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
  const result = await runAviationIngest(context);

  return NextResponse.json(result, {
    status: result.success ? 200 : 502,
  });
}
