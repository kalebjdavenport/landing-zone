import { NextResponse } from "next/server";

import { createContext } from "@/server/api/trpc";
import { runAviationIngest, runNwsIngest } from "@/server/ingest/pipeline";
import {
  isDuplicateWebhookDelivery,
  payloadSha256,
  persistWebhookReceipt,
  verifyWebhookSignature,
} from "@/server/services/webhooks";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ source: string }> },
) {
  const { source } = await params;
  const bodyText = await request.text();
  const parsed = (() => {
    if (!bodyText) {
      return {};
    }

    try {
      return JSON.parse(bodyText) as Record<string, unknown>;
    } catch {
      return {};
    }
  })();

  const deliveryId = request.headers.get("x-delivery-id") ?? crypto.randomUUID();
  const signature = request.headers.get("x-signature");
  const secret = process.env.WEBHOOK_SIGNING_SECRET;
  const payloadHash = payloadSha256(bodyText);

  const context = createContext();

  const signatureOk = !secret || verifyWebhookSignature(bodyText, signature, secret);

  if (!signatureOk) {
    await persistWebhookReceipt(context, {
      source,
      deliveryId,
      signatureOk: false,
      status: "rejected",
      payloadHash,
    });

    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (await isDuplicateWebhookDelivery(context, source, deliveryId)) {
    await persistWebhookReceipt(context, {
      source,
      deliveryId,
      signatureOk: true,
      status: "duplicate",
      payloadHash,
    });

    return NextResponse.json({ ok: true, duplicate: true });
  }

  let result: unknown = { ok: true };

  if (source === "scheduler" || parsed?.action === "ingest_nws") {
    const rawSeeds = Array.isArray(parsed?.seeds) ? parsed.seeds : undefined;
    const seeds = rawSeeds
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
    result = await runNwsIngest(context, seeds);
  } else if (source === "aviation" || parsed?.action === "ingest_aviation") {
    result = await runAviationIngest(context);
  } else if (source === "all" || parsed?.action === "ingest_all") {
    const [nws, aviation] = await Promise.all([runNwsIngest(context), runAviationIngest(context)]);
    result = { nws, aviation };
  }

  await persistWebhookReceipt(context, {
    source,
    deliveryId,
    signatureOk: true,
    status: "processed",
    payloadHash,
  });

  return NextResponse.json({ ok: true, result });
}
