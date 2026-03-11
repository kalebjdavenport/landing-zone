import crypto from "node:crypto";
import { describe, expect, it } from "vitest";

import { verifyWebhookSignature } from "@/server/services/webhooks";

describe("verifyWebhookSignature", () => {
  it("validates a correct signature", () => {
    const body = JSON.stringify({ hello: "world" });
    const secret = "top-secret";
    const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");

    expect(verifyWebhookSignature(body, `sha256=${signature}`, secret)).toBe(true);
  });

  it("rejects invalid signatures", () => {
    expect(verifyWebhookSignature("{}", "sha256=abcdef", "top-secret")).toBe(false);
  });
});
