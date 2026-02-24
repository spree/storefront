"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getCustomer,
  login as loginAction,
  logout as logoutAction,
  register as registerAction,
} from "@/lib/data/customer";

interface User {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    password: string,
    passwordConfirmation: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toUser(customer: User): User {
  return {
    id: customer.id,
    email: customer.email,
    first_name: customer.first_name,
    last_name: customer.last_name,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch current user from server
  const refreshUser = useCallback(async () => {
    try {
      const customer = await getCustomer();
      setUser(customer ? toUser(customer) : null);
    } catch {
      setUser(null);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      await refreshUser();
      setLoading(false);
    };
    initAuth();
  }, [refreshUser]);

  // Login
  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginAction(email, password);
      if (result.success && result.user) {
        setUser(toUser(result.user));
        router.refresh();
      }
      return result;
    },
    [router],
  );

  // Register
  const register = useCallback(
    async (email: string, password: string, passwordConfirmation: string) => {
      const result = await registerAction(
        email,
        password,
        passwordConfirmation,
      );
      if (result.success && result.user) {
        setUser(toUser(result.user));
        router.refresh();
      }
      return result;
    },
    [router],
  );

  // Logout
  const logout = useCallback(async () => {
    await logoutAction();
    setUser(null);
    router.refresh();
  }, [router]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refreshUser,
      isAuthenticated: !!user,
    }),
    [user, loading, login, register, logout, refreshUser],
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
