import { createHmac } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextRequest } from "next/server";
import { afterEach, expect, it, vi } from "vitest";
import {
  hasStaticGuestHomeComposition,
  rememberStaticGuestHomeComposition,
} from "@/lib/theme/guest-home-composition";
import { PUBLISHED_THEME_CACHE_TAG } from "@/lib/theme/published-cache";
import { POST } from "./route";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/webhooks/handlers", () => ({
  handleOrderCanceled: vi.fn(),
  handleOrderCompleted: vi.fn(),
  handleOrderShipped: vi.fn(),
  handlePasswordReset: vi.fn(),
}));

const SECRET = "theme-webhook-test";

function publicationRequest(secret: string, name = "theme.published") {
  const body = JSON.stringify({ name, id: "evt_1", data: {} });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  return new NextRequest("http://localhost/api/webhooks/spree", {
    method: "POST",
    body,
    headers: {
      "x-spree-webhook-event": "theme.published",
      "x-spree-webhook-timestamp": timestamp,
      "x-spree-webhook-signature": signature,
    },
  });
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

it("expires the published reads and guest composition decision on signed publication", async () => {
  vi.stubEnv("SPREE_WEBHOOK_SECRET", SECRET);
  rememberStaticGuestHomeComposition("home");
  const response = await POST(publicationRequest(SECRET));
  expect(response.status).toBe(200);
  expect(revalidateTag).toHaveBeenCalledWith(PUBLISHED_THEME_CACHE_TAG, {
    expire: 0,
  });
  expect(hasStaticGuestHomeComposition("home")).toBe(false);
});

it("requires a valid signature and a publication event in the signed body", async () => {
  vi.stubEnv("SPREE_WEBHOOK_SECRET", SECRET);
  expect((await POST(publicationRequest("invalid"))).status).toBe(401);
  await POST(publicationRequest(SECRET, "theme.updated"));
  expect(revalidateTag).not.toHaveBeenCalled();
});
