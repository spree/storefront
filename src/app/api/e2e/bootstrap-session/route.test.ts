import { afterEach, describe, expect, it, vi } from "vitest";

const cookies = vi.hoisted(() => ({
  setAccessToken: vi.fn(),
  setRefreshToken: vi.fn(),
}));
vi.mock("@/lib/spree/cookies", () => cookies);

import { POST } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("E2E session bootstrap isolation", () => {
  it("rejects when lab cert marker is absent even on localhost", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SPREE_REVIEW_E2E", "1");
    vi.stubEnv("SPREE_E2E_BOOTSTRAP_ENABLED", "1");
    vi.stubEnv("SPREE_MARKETPLACE_LAB_CERT", "");
    vi.stubEnv("SPREE_API_URL", "http://127.0.0.1:3021");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://127.0.0.1:3305");
    const response = await POST(
      new Request("http://127.0.0.1:3305/api/e2e/bootstrap-session", {
        method: "POST",
        body: JSON.stringify({ token: "access", refresh_token: "refresh" }),
      }),
    );
    expect(response.status).toBe(404);
    expect(cookies.setAccessToken).not.toHaveBeenCalled();
  });

  it("rejects production deployment phase even with bootstrap flags", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SPREE_REVIEW_E2E", "1");
    vi.stubEnv("SPREE_E2E_BOOTSTRAP_ENABLED", "1");
    vi.stubEnv("SPREE_MARKETPLACE_LAB_CERT", "1");
    vi.stubEnv("SPREE_DEPLOYMENT_PHASE", "production");
    vi.stubEnv("SPREE_API_URL", "http://127.0.0.1:3021");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://127.0.0.1:3305");
    const response = await POST(
      new Request("http://127.0.0.1:3305/api/e2e/bootstrap-session", {
        method: "POST",
        body: JSON.stringify({ token: "access", refresh_token: "refresh" }),
      }),
    );
    expect(response.status).toBe(404);
    expect(cookies.setAccessToken).not.toHaveBeenCalled();
  });

  it("rejects production preview without explicit bootstrap opt-in", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SPREE_REVIEW_E2E", "1");
    vi.stubEnv("E2E_PREVIEW", "1");
    vi.stubEnv("SPREE_E2E_BOOTSTRAP_ENABLED", "");
    vi.stubEnv("SPREE_MARKETPLACE_LAB_CERT", "1");
    vi.stubEnv("SPREE_API_URL", "http://127.0.0.1:3011");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://127.0.0.1:3305");
    const response = await POST(
      new Request("http://localhost:3302/api/e2e/bootstrap-session", {
        method: "POST",
        body: JSON.stringify({ token: "access", refresh_token: "refresh" }),
      }),
    );
    expect(response.status).toBe(404);
    expect(cookies.setAccessToken).not.toHaveBeenCalled();
  });

  it("accepts lab localhost preview when bootstrap is explicitly enabled", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SPREE_REVIEW_E2E", "1");
    vi.stubEnv("E2E_PREVIEW", "1");
    vi.stubEnv("SPREE_E2E_BOOTSTRAP_ENABLED", "1");
    vi.stubEnv("SPREE_MARKETPLACE_LAB_CERT", "1");
    vi.stubEnv("SPREE_API_URL", "http://127.0.0.1:3021");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://127.0.0.1:3305");
    const response = await POST(
      new Request("http://127.0.0.1:3305/api/e2e/bootstrap-session", {
        method: "POST",
        body: JSON.stringify({ token: "access", refresh_token: "refresh" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(cookies.setAccessToken).toHaveBeenCalledWith("access");
    expect(cookies.setRefreshToken).toHaveBeenCalledWith("refresh");
  });

  it("accepts mobile storefront cert API on localhost preview", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SPREE_REVIEW_E2E", "1");
    vi.stubEnv("E2E_PREVIEW", "1");
    vi.stubEnv("SPREE_E2E_BOOTSTRAP_ENABLED", "1");
    vi.stubEnv("SPREE_MARKETPLACE_LAB_CERT", "1");
    vi.stubEnv("SPREE_API_URL", "http://127.0.0.1:3031");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://127.0.0.1:3407");
    const response = await POST(
      new Request("http://127.0.0.1:3407/api/e2e/bootstrap-session", {
        method: "POST",
        body: JSON.stringify({ token: "access", refresh_token: "refresh" }),
      }),
    );
    expect(response.status).toBe(200);
  });

  it("accepts isolated review E2E on localhost dev server", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SPREE_REVIEW_E2E", "1");
    vi.stubEnv("SPREE_E2E_BOOTSTRAP_ENABLED", "1");
    vi.stubEnv("SPREE_MARKETPLACE_LAB_CERT", "1");
    vi.stubEnv("E2E_PREVIEW", "");
    vi.stubEnv("SPREE_API_URL", "http://127.0.0.1:3011");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://127.0.0.1:3302");
    const response = await POST(
      new Request("http://127.0.0.1:3302/api/e2e/bootstrap-session", {
        method: "POST",
        body: JSON.stringify({ token: "access", refresh_token: "refresh" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(cookies.setAccessToken).toHaveBeenCalledWith("access");
    expect(cookies.setRefreshToken).toHaveBeenCalledWith("refresh");
  });

  it("rejects non-localhost hostnames", async () => {
    vi.stubEnv("SPREE_REVIEW_E2E", "1");
    vi.stubEnv("SPREE_E2E_BOOTSTRAP_ENABLED", "1");
    vi.stubEnv("SPREE_MARKETPLACE_LAB_CERT", "1");
    vi.stubEnv("E2E_PREVIEW", "");
    vi.stubEnv("SPREE_API_URL", "http://127.0.0.1:3011");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shop.example.com");
    const response = await POST(
      new Request("https://staging.example.com/api/e2e/bootstrap-session", {
        method: "POST",
        body: JSON.stringify({ token: "access", refresh_token: "refresh" }),
      }),
    );
    expect(response.status).toBe(404);
    expect(cookies.setAccessToken).not.toHaveBeenCalled();
  });

  it.each([
    "production",
    "test",
  ])("rejects %s without review E2E flag", async (environment) => {
    vi.stubEnv("NODE_ENV", environment);
    vi.stubEnv("SPREE_REVIEW_E2E", "");
    vi.stubEnv("E2E_PREVIEW", "1");
    vi.stubEnv("SPREE_API_URL", "http://127.0.0.1:3011");
    const response = await POST(
      new Request("http://localhost:3302/api/e2e/bootstrap-session", {
        method: "POST",
        body: JSON.stringify({ token: "test", refresh_token: "test" }),
      }),
    );
    expect(response.status).toBe(404);
    expect(cookies.setAccessToken).not.toHaveBeenCalled();
    expect(cookies.setRefreshToken).not.toHaveBeenCalled();
  });

  it.each([
    "preview",
    "production",
  ])("rejects a %s deployment in development mode", async (deployment) => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", deployment);
    vi.stubEnv("SPREE_REVIEW_E2E", "1");
    vi.stubEnv("SPREE_E2E_BOOTSTRAP_ENABLED", "1");
    vi.stubEnv("SPREE_MARKETPLACE_LAB_CERT", "1");
    vi.stubEnv("SPREE_API_URL", "http://127.0.0.1:3011");
    const response = await POST(
      new Request("http://localhost:3302/api/e2e/bootstrap-session", {
        method: "POST",
      }),
    );
    expect(response.status).toBe(404);
    expect(cookies.setAccessToken).not.toHaveBeenCalled();
  });
});
