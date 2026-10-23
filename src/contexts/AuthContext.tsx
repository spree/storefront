"use client";

import type { Customer } from "@spree/sdk";
import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  completeMfaLogin as completeMfaLoginAction,
  login as loginAction,
  logout as logoutAction,
  register as registerAction,
  syncSession,
} from "@/lib/data/customer";
import { resetTrafficSessionToken } from "@/lib/traffic/tokens";

export interface User {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  bio?: string;
  other_accounts?: string;
  show_shop?: boolean;
  avatar_url?: string | null;
  profile_shop_name?: string | null;
  profile_shop_slug?: string | null;
  member_since?: string | null;
  accepts_email_marketing?: boolean;
  personalization_enabled?: boolean;
  behavioral_advertising_enabled?: boolean;
  newsletter_subscriber_id?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    turnstileToken?: string,
  ) => Promise<{
    success: boolean;
    error?: string;
    mfaRequired?: boolean;
    mfaToken?: string;
  }>;
  completeMfaLogin: (
    mfaToken: string,
    code: string,
  ) => Promise<{ success: boolean; error?: string }>;
  register: (params: {
    email: string;
    password: string;
    password_confirmation: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    metadata?: Record<string, unknown>;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toUser(customer: Customer | User): User {
  return {
    id: customer.id,
    email: customer.email,
    first_name: customer.first_name,
    last_name: customer.last_name,
    bio: "bio" in customer ? customer.bio || "" : "",
    other_accounts:
      "other_accounts" in customer ? customer.other_accounts || "" : "",
    show_shop: "show_shop" in customer ? !!customer.show_shop : false,
    avatar_url: "avatar_url" in customer ? customer.avatar_url : null,
    profile_shop_name:
      "profile_shop_name" in customer ? customer.profile_shop_name : null,
    profile_shop_slug:
      "profile_shop_slug" in customer ? customer.profile_shop_slug : null,
    member_since: "member_since" in customer ? customer.member_since : null,
    accepts_email_marketing:
      "accepts_email_marketing" in customer
        ? !!customer.accepts_email_marketing
        : false,
    personalization_enabled:
      "personalization_enabled" in customer
        ? !!customer.personalization_enabled
        : true,
    behavioral_advertising_enabled:
      "behavioral_advertising_enabled" in customer
        ? !!customer.behavioral_advertising_enabled
        : true,
    newsletter_subscriber_id:
      "newsletter_subscriber" in customer
        ? (customer.newsletter_subscriber?.id ?? null)
        : null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch current user from server, refreshing an expired JWT when possible.
  // A transparent refresh persists a new token via a Server Action (cookie
  // writes aren't allowed during a Server Component render), so re-render the
  // server components afterwards to replace any data they fetched with the
  // stale session.
  const refreshUser = useCallback(async () => {
    try {
      const { customer, refreshed, stale } = await syncSession();
      // A transparent token rotation may have happened even when the follow-up
      // fetch came back stale — re-render server components so they pick up the
      // renewed session either way.
      if (refreshed) {
        router.refresh();
      }
      // A transient fetch failure returns `stale` — keep the current session
      // rather than flashing the user to logged-out on a blip.
      if (stale) return;
      setUser(customer ? toUser(customer) : null);
    } catch {
      // Unexpected failure — leave the existing session untouched.
    }
  }, [router]);

  // Timestamp of the last session sync, used to throttle focus-driven re-syncs.
  const lastSyncRef = useRef(0);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      lastSyncRef.current = Date.now();
      await refreshUser();
      setLoading(false);
    };
    initAuth();
  }, [refreshUser]);

  // Re-sync the session when the tab regains focus after being idle. The JWT
  // can expire while the tab is backgrounded; refreshing on return renews it
  // (or treats the session as logged out) without a manual reload. Throttled
  // so ordinary focus churn doesn't hit the server on every event.
  useEffect(() => {
    const RESYNC_THROTTLE_MS = 30_000;
    const maybeResync = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastSyncRef.current < RESYNC_THROTTLE_MS) return;
      lastSyncRef.current = Date.now();
      void refreshUser();
    };
    document.addEventListener("visibilitychange", maybeResync);
    window.addEventListener("focus", maybeResync);
    return () => {
      document.removeEventListener("visibilitychange", maybeResync);
      window.removeEventListener("focus", maybeResync);
    };
  }, [refreshUser]);

  // Login
  const login = useCallback(
    async (email: string, password: string, turnstileToken?: string) => {
      const result = await loginAction(email, password, turnstileToken);
      if (result.success && result.user) {
        resetTrafficSessionToken();
        setUser(toUser(result.user));
        await refreshUser();
        router.refresh();
      }
      return result;
    },
    [router, refreshUser],
  );

  const completeMfaLogin = useCallback(
    async (mfaToken: string, code: string) => {
      const result = await completeMfaLoginAction(mfaToken, code);
      if (result.success && result.user) {
        resetTrafficSessionToken();
        setUser(toUser(result.user));
        await refreshUser();
        router.refresh();
      }
      return result;
    },
    [router, refreshUser],
  );

  // Register
  const register = useCallback(
    async (params: {
      email: string;
      password: string;
      password_confirmation: string;
      first_name?: string;
      last_name?: string;
      phone?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const result = await registerAction(params);
      if (result.success && result.user) {
        resetTrafficSessionToken();
        setUser(toUser(result.user));
        await refreshUser();
        router.refresh();
      }
      return result;
    },
    [router, refreshUser],
  );

  // Logout
  const logout = useCallback(async () => {
    await logoutAction();
    resetTrafficSessionToken();
    setUser(null);
    router.refresh();
  }, [router]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      login,
      completeMfaLogin,
      register,
      logout,
      refreshUser,
      isAuthenticated: !!user,
    }),
    [user, loading, login, completeMfaLogin, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
