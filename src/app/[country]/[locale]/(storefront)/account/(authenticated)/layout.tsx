import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthenticatedAccountShell } from "@/components/account/AuthenticatedAccountShell";
import { REQUEST_PATHNAME_HEADER, REQUEST_SEARCH_HEADER } from "@/i18n/routing";
import { getMyCompanies } from "@/lib/data/companies";
import { getAccessToken, getRefreshToken } from "@/lib/spree";
import {
  buildAccountLoginHref,
  resolveAccountRedirect,
} from "@/lib/utils/account-redirect";

interface AuthenticatedAccountLayoutProps {
  children: React.ReactNode;
  params: Promise<{ country: string; locale: string }>;
}

export default function AuthenticatedAccountLayout(
  props: AuthenticatedAccountLayoutProps,
) {
  return (
    <Suspense fallback={null}>
      <AuthenticatedAccountLayoutContent {...props} />
    </Suspense>
  );
}

export async function AuthenticatedAccountLayoutContent({
  children,
  params,
}: AuthenticatedAccountLayoutProps) {
  const [{ country, locale }, requestHeaders, accessToken, refreshToken] =
    await Promise.all([params, headers(), getAccessToken(), getRefreshToken()]);

  const basePath = `/${country}/${locale}`;
  const pathname = requestHeaders.get(REQUEST_PATHNAME_HEADER);
  const search = requestHeaders.get(REQUEST_SEARCH_HEADER);
  const requestedPath = `${pathname ?? ""}${search?.startsWith("?") ? search : ""}`;
  const returnTo = resolveAccountRedirect(requestedPath, basePath);
  const loginHref = buildAccountLoginHref(basePath, returnTo);

  // A refresh token is also a recoverable session credential. Let the client
  // session action rotate it in a cookie-writable context before deciding that
  // the customer is anonymous.
  if (!accessToken && !refreshToken) redirect(loginHref);

  // Resolved once for the whole account area: the nav only offers companies to
  // a buyer who has standing over one.
  const { data: memberships } = await getMyCompanies();

  return (
    <AuthenticatedAccountShell
      loginHref={loginHref}
      hasCompanies={memberships.length > 0}
    >
      {children}
    </AuthenticatedAccountShell>
  );
}
