import crypto from "node:crypto";

import type { TrpcContext } from "@/server/api/trpc";

function digest(input: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(input).digest("hex");
}

function timingSafeEqualHex(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

export function verifyWebhookSignature(
  body: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) {
    return false;
  }

  const raw = signatureHeader.replace("sha256=", "").trim();
  if (!raw || raw.length % 2 !== 0) {
    return false;
  }

  const expected = digest(body, secret);

  return timingSafeEqualHex(raw, expected);
}

export async function isDuplicateWebhookDelivery(
  ctx: TrpcContext,
  source: string,
  deliveryId: string,
): Promise<boolean> {
  if (!ctx.supabase) {
    return false;
  }

  const { data } = await ctx.supabase
    .from("webhook_receipts")
    .select("id")
    .eq("source", source)
    .eq("delivery_id", deliveryId)
    .limit(1);

  return Boolean(data?.length);
}

export async function persistWebhookReceipt(
  ctx: TrpcContext,
  input: {
    source: string;
    deliveryId: string;
    signatureOk: boolean;
    status: "processed" | "rejected" | "duplicate";
    payloadHash: string;
  },
) {
  if (!ctx.supabase) {
    return;
  }

  await ctx.supabase.from("webhook_receipts").upsert(
    {
      source: input.source,
      delivery_id: input.deliveryId,
      signature_ok: input.signatureOk,
      status: input.status,
      payload_hash: input.payloadHash,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "source,delivery_id" },
  );
}

export function payloadSha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}
