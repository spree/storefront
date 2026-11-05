import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// useRouter must return a stable reference (as it does in Next), otherwise
// refreshUser's [router] dependency changes every render and the sync effects
// loop forever.
const { mockRefresh, mockRouter } = vi.hoisted(() => {
  const refresh = vi.fn();
  return {
    mockRefresh: refresh,
    mockRouter: { refresh, push: () => {}, replace: () => {} },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

vi.mock("@/lib/data/customer", () => ({
  syncSession: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
}));

vi.mock("@/lib/analytics/klaviyo", () => ({
  identifyKlaviyo: vi.fn(),
}));

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { identifyKlaviyo } from "@/lib/analytics/klaviyo";
import { login, register, syncSession } from "@/lib/data/customer";

const mockSyncSession = vi.mocked(syncSession);

const mockCustomer = {
  id: "user-1",
  email: "test@example.com",
  first_name: "Test",
  last_name: "User",
} as never;

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

/** Dispatch a visibility change while pretending `msAhead` has elapsed. */
async function returnToTab(msAhead: number) {
  const spy = vi.spyOn(Date, "now").mockReturnValue(Date.now() + msAhead);
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  spy.mockRestore();
}

describe("AuthContext session sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSyncSession.mockResolvedValue({
      customer: mockCustomer,
      refreshed: false,
    });
  });

  it("syncs the session on mount and exposes the customer", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockSyncSession).toHaveBeenCalledTimes(1);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe("test@example.com");
  });

  it("re-syncs when the tab regains focus, throttling rapid events", async () => {
    renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(mockSyncSession).toHaveBeenCalledTimes(1));

    // Within the throttle window — ignored.
    await returnToTab(5_000);
    expect(mockSyncSession).toHaveBeenCalledTimes(1);

    // Past the throttle window — re-syncs.
    await returnToTab(31_000);
    await waitFor(() => expect(mockSyncSession).toHaveBeenCalledTimes(2));
  });

  it("re-renders server components after a transparent refresh", async () => {
    mockSyncSession.mockResolvedValue({
      customer: mockCustomer,
      refreshed: true,
    });

    renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
  });

  it("clears the user when the session is gone", async () => {
    mockSyncSession.mockResolvedValue({ customer: null, refreshed: false });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});

describe("AuthContext Klaviyo identify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSyncSession.mockResolvedValue({ customer: null, refreshed: false });
  });

  it("identifies the shopper after signing in", async () => {
    vi.mocked(login).mockResolvedValue({
      success: true,
      user: mockCustomer,
    } as never);
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login("test@example.com", "secret");
    });

    expect(identifyKlaviyo).toHaveBeenCalledWith("test@example.com");
  });

  it("identifies the shopper after signing up", async () => {
    vi.mocked(register).mockResolvedValue({
      success: true,
      user: mockCustomer,
    } as never);
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.register({
        email: "test@example.com",
        password: "secret",
        password_confirmation: "secret",
      });
    });

    expect(identifyKlaviyo).toHaveBeenCalledWith("test@example.com");
  });

  it("does not identify after a failed sign-in", async () => {
    vi.mocked(login).mockResolvedValue({ success: false } as never);
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login("test@example.com", "wrong");
    });

    expect(identifyKlaviyo).not.toHaveBeenCalled();
  });
});
