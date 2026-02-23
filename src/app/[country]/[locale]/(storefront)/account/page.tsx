"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  CreditCardIcon,
  EyeIcon,
  EyeSlashIcon,
  MapPinIcon,
  ShoppingBagIcon,
  UserIcon,
} from "@/components/icons";
import { useAuth } from "@/contexts/AuthContext";
import { extractBasePath } from "@/lib/utils/path";

export default function AccountPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = extractBasePath(pathname);
  const { login, isAuthenticated, loading: authLoading } = useAuth();

  // Get redirect URL from query params (e.g., from checkout)
  const redirectUrl = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);
    if (result.success) {
      // Redirect to the specified URL or stay on account page
      if (redirectUrl) {
        router.push(redirectUrl);
      }
    } else {
      setError(result.error || "Invalid email or password");
    }
    setLoading(false);
  };

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto" />
          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
          <p className="mt-2 text-gray-500">
            Sign in to access your account and order history.
          </p>
        </div>

        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-primary-500 focus:outline-primary-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 block w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:border-primary-500 focus:outline-primary-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-500 text-white py-2 px-4 rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-500">Don&apos;t have an account? </span>
            <Link
              href={`${basePath}/account/register`}
              className="text-primary-500 hover:text-primary-700 font-medium"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show account dashboard if authenticated
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Account Overview
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href={`${basePath}/account/orders`}
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 rounded-xl">
              <ShoppingBagIcon className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                Order History
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                View your past orders and track shipments
              </p>
            </div>
          </div>
        </Link>

        <Link
          href={`${basePath}/account/addresses`}
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 rounded-xl">
              <MapPinIcon className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-gray-900">Addresses</h2>
              <p className="mt-1 text-sm text-gray-500">
                Manage your shipping and billing addresses
              </p>
            </div>
          </div>
        </Link>

        <Link
          href={`${basePath}/account/credit-cards`}
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 rounded-xl">
              <CreditCardIcon className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                Payment Methods
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Manage your saved credit cards
              </p>
            </div>
          </div>
        </Link>

        <Link
          href={`${basePath}/account/profile`}
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 rounded-xl">
              <UserIcon className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-gray-900">Profile</h2>
              <p className="mt-1 text-sm text-gray-500">
                Update your personal information
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
