import { beforeEach, expect, it, vi } from "vitest";
import { clearStaticGuestHomeComposition } from "@/lib/theme/guest-home-composition";
import { getHomePersonalizationComposition } from "./storefront-personalization";

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  token: vi.fn(),
  locale: vi.fn(),
  session: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.session }),
}));
vi.mock("@/lib/spree", () => ({
  getClient: () => ({ request: mocks.request }),
  getAccessToken: mocks.token,
  getLocaleOptions: mocks.locale,
}));

beforeEach(() => {
  vi.resetAllMocks();
  clearStaticGuestHomeComposition();
  mocks.locale.mockResolvedValue({ country: "us", locale: "en" });
  mocks.request.mockResolvedValue({ data: { composition_version: "static" } });
});

it("reuses a guest static decision across traffic sessions within one market", async () => {
  mocks.session.mockReturnValue({ value: "session-a" });
  await getHomePersonalizationComposition();
  mocks.session.mockReturnValue({ value: "session-b" });
  expect(await getHomePersonalizationComposition()).toBeNull();
  expect(mocks.request).toHaveBeenCalledTimes(1);

  mocks.locale.mockResolvedValue({ country: "ca", locale: "en" });
  await getHomePersonalizationComposition();
  expect(mocks.request).toHaveBeenCalledTimes(2);
});

it("fetches fresh compositions for authenticated buyers and explicit preview personas", async () => {
  await getHomePersonalizationComposition();
  mocks.token.mockResolvedValueOnce("buyer-token");
  await getHomePersonalizationComposition();
  await getHomePersonalizationComposition("gift_shopper");

  expect(mocks.request).toHaveBeenCalledTimes(3);
  expect(mocks.request.mock.calls[1]?.[2]).toMatchObject({
    token: "buyer-token",
    cache: "no-store",
  });
  expect(mocks.request.mock.calls[2]?.[2]).toMatchObject({
    params: { preview_persona: "gift_shopper" },
    cache: "no-store",
  });
});

it("keeps dynamic compositions and failed requests out of the static cache", async () => {
  mocks.request.mockRejectedValueOnce(new Error("unavailable"));
  mocks.request.mockResolvedValueOnce({
    data: { composition_version: "dynamic-v1" },
  });
  expect(await getHomePersonalizationComposition()).toBeNull();
  expect(await getHomePersonalizationComposition()).toMatchObject({
    composition_version: "dynamic-v1",
  });
  await getHomePersonalizationComposition();
  expect(mocks.request).toHaveBeenCalledTimes(3);
});

it("checks guest rollout again when the short static decision expires", async () => {
  const now = vi.spyOn(Date, "now").mockReturnValue(1000);
  try {
    await getHomePersonalizationComposition();
    now.mockReturnValue(31_001);
    await getHomePersonalizationComposition();
    expect(mocks.request).toHaveBeenCalledTimes(2);
  } finally {
    now.mockRestore();
  }
});
