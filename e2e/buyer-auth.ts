import { expect, type Page } from "@playwright/test";
import { createClient } from "@spree/sdk";
import { storefrontGoto } from "./marketplace-fixtures";
import { storeApiFetch } from "./store-api";
import { loadSpreeEnv } from "./store-cart";

/** Re-applies tokens through the Playwright-only bootstrap route so Server Actions see the session. */
export async function syncBuyerSessionForServerActions(
  page: Page,
  accessToken: string,
  refreshToken: string,
) {
  if (process.env.SPREE_REVIEW_E2E !== "1") return;
  const origin = storefrontOrigin(page).replace(/\/$/, "");
  if (page.url().startsWith("about:") || !page.url().startsWith(origin)) {
    await storefrontGoto(page, "/us/en");
  }
  await page.evaluate(
    async ({
      accessToken: token,
      refreshToken: refresh,
    }: {
      accessToken: string;
      refreshToken: string;
    }) => {
      await fetch("/api/e2e/bootstrap-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, refresh_token: refresh }),
        credentials: "same-origin",
      });
    },
    { accessToken, refreshToken },
  );
}

/** Re-bootstrap from cookies already on the page (before a Server Action). */
export async function syncBuyerSessionFromCookies(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find(
    (cookie) => cookie.name === "_spree_jwt",
  )?.value;
  const refreshToken = cookies.find(
    (cookie) => cookie.name === "_spree_refresh_token",
  )?.value;
  if (!accessToken || !refreshToken) {
    throw new Error("Buyer session cookies missing before server action.");
  }
  await syncBuyerSessionForServerActions(page, accessToken, refreshToken);
}

async function buyerApiEmail(page: Page): Promise<string | null> {
  const response = await storeApiFetch(page, "GET", "customers/me").catch(
    () => null,
  );
  if (!response?.ok) return null;
  const customer = await response.json();
  return typeof customer.email === "string" ? customer.email : null;
}

async function waitForAccountLoginOrOverview(page: Page) {
  const overview = page.getByRole("heading", { name: /account overview/i });
  const emailField = page.getByLabel(/^email$/i);
  await expect
    .poll(
      async () => {
        if (await emailField.isVisible().catch(() => false)) return "login";
        if (await overview.isVisible().catch(() => false)) return "overview";
        return "pending";
      },
      { timeout: 60_000, message: "account login form or overview" },
    )
    .not.toBe("pending");
}

async function clearStorefrontAuthCookies(page: Page) {
  const origin = storefrontOrigin(page).replace(/\/$/, "");
  const { hostname } = new URL(origin);
  await page.context().clearCookies({ domain: hostname, path: "/" });
}

function storefrontOrigin(page: Page): string {
  // Prefer the live page host. Lab Playwright binds 127.0.0.1 while older
  // helpers defaulted to localhost — cookies for one host never reach the other.
  if (page.url() && !page.url().startsWith("about:")) {
    return new URL(page.url()).origin;
  }
  const port = process.env.STOREFRONT_E2E_PORT;
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.MERCH_E2E_STOREFRONT_URL ||
    process.env.BASE_URL ||
    (port ? `http://127.0.0.1:${port}` : "http://127.0.0.1:3001");
  return configured.replace(/\/$/, "");
}

/**
 * Signs in through the account form and waits until the authenticated shell is ready.
 */
export async function loginBuyerThroughAccountForm(
  page: Page,
  email: string,
  password: string,
) {
  await storefrontGoto(page, "/us/en/account", {
    waitUntil: process.env.E2E_PREVIEW === "1" ? "load" : undefined,
  });
  await waitForAccountLoginOrOverview(page);
  const overview = page.getByRole("heading", { name: /account overview/i });
  if (await overview.isVisible().catch(() => false)) {
    const signedInAs = page.getByText(email, { exact: false });
    if (await signedInAs.isVisible().catch(() => false)) {
      await expectBuyerSessionCookies(page);
      return;
    }
    await logoutBuyer(page);
    await waitForAccountLoginOrOverview(page);
  }
  const emailField = page.getByLabel(/^email$/i);
  await expect(emailField).toBeVisible({ timeout: 60_000 });
  await emailField.fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await expectBuyerAccountShell(page);
}

/**
 * Signs in through the Store API and waits for the storefront session to settle.
 */
export type LoginBuyerViaApiOptions = {
  /** When false, a verified Store API session is enough (faster under load). */
  requireAccountShell?: boolean;
};

export async function loginBuyerViaApi(
  page: Page,
  email: string,
  password: string,
  options: LoginBuyerViaApiOptions = {},
) {
  const requireAccountShell = options.requireAccountShell ?? false;
  const { baseUrl, publishableKey } = loadSpreeEnv();
  const client = createClient({ baseUrl, publishableKey });
  const turnstileToken =
    process.env.E2E_TURNSTILE_PASS_TOKEN ?? "XXXX.DUMMY.TOKEN.XXXX";
  const result = await client.auth.login({
    email,
    password,
    turnstile_token: turnstileToken,
  });
  if ("mfa_required" in result) {
    throw new Error("Buyer MFA is not supported in merchandising E2E.");
  }
  const accessToken = result.token;
  const refreshToken = result.refresh_token;

  if (process.env.E2E_PREVIEW === "1") {
    await loginBuyerThroughAccountForm(page, email, password);
    return;
  }

  async function plantSessionCookies() {
    // Navigate first so cookie domain matches the Playwright baseURL host
    // (127.0.0.1 in lab configs), not a stale localhost default.
    await page.context().clearCookies();
    await storefrontGoto(page, "/us/en");
    const origin = storefrontOrigin(page).replace(/\/$/, "");
    const { hostname } = new URL(origin);
    const cookieSecure =
      process.env.COOKIE_SECURE !== "false" && /^https:/i.test(origin);
    const cookieBase = {
      domain: hostname,
      path: "/",
      httpOnly: true,
      secure: cookieSecure,
      sameSite: "Lax" as const,
    };
    await page.context().addCookies([
      { name: "_spree_jwt", value: accessToken, ...cookieBase },
      {
        name: "_spree_refresh_token",
        value: refreshToken,
        ...cookieBase,
      },
    ]);
    // Reload so SSR/header chrome picks up the planted session.
    await storefrontGoto(page, "/us/en");
  }

  const useServerBootstrap = process.env.SPREE_REVIEW_E2E === "1";

  if (useServerBootstrap) {
    await storefrontGoto(page, "/us/en");
    const _bootstrap = await page.evaluate(
      async ({
        accessToken,
        refreshToken,
      }: {
        accessToken: string;
        refreshToken: string;
      }) => {
        const response = await fetch("/api/e2e/bootstrap-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: accessToken,
            refresh_token: refreshToken,
          }),
          credentials: "same-origin",
        });
        return { ok: response.ok, status: response.status };
      },
      {
        accessToken,
        refreshToken,
      },
    );
  } else {
    await plantSessionCookies();
  }

  await plantSessionCookies();
  await syncBuyerSessionForServerActions(page, accessToken, refreshToken);

  const accountWaitUntil = process.env.E2E_PREVIEW === "1" ? "load" : undefined;
  await storefrontGoto(page, "/us/en/account", {
    waitUntil: accountWaitUntil,
  });

  const apiEmail = await buyerApiEmail(page);
  if (apiEmail === email) {
    await expectBuyerSessionCookies(page);
    if (requireAccountShell) {
      await expectBuyerAccountShell(page);
    }
    return;
  }

  const overview = page.getByRole("heading", { name: /account overview/i });
  const emailField = page.getByLabel(/^email$/i);

  let landing: "overview" | "login" | "pending" = "pending";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (await overview.isVisible({ timeout: 20_000 }).catch(() => false)) {
      landing = "overview";
      break;
    }
    if (await emailField.isVisible({ timeout: 5_000 }).catch(() => false)) {
      landing = "login";
      break;
    }
    const retryEmail = await buyerApiEmail(page);
    if (retryEmail === email) {
      await expectBuyerSessionCookies(page);
      if (requireAccountShell) {
        await expectBuyerAccountShell(page);
      }
      return;
    }
    await page.reload({ waitUntil: accountWaitUntil ?? "domcontentloaded" });
  }

  if (landing === "login") {
    await emailField.fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
  } else if (landing === "pending") {
    const recoveredEmail = await buyerApiEmail(page);
    if (recoveredEmail === email) {
      await expectBuyerSessionCookies(page);
      if (requireAccountShell) {
        await expectBuyerAccountShell(page);
      }
      return;
    }
    await loginBuyerThroughAccountForm(page, email, password);
    return;
  }

  if (requireAccountShell) {
    await expectBuyerAccountShell(page);
  } else {
    await expectBuyerSessionCookies(page);
  }
}

const BUYER_AUTH_TIMEOUT_MS = 180_000;

/** Waits until JWT cookies exist after a UI login. */
export async function expectBuyerSessionCookies(
  page: Page,
  timeoutMs = BUYER_AUTH_TIMEOUT_MS,
) {
  await expect
    .poll(
      async () => {
        const cookies = await page.context().cookies();
        return cookies.some(
          (cookie) =>
            (cookie.name === "_spree_jwt" ||
              cookie.name === "_spree_refresh_token") &&
            cookie.value.length > 0,
        );
      },
      { timeout: timeoutMs },
    )
    .toBe(true);
}

export async function expectBuyerAccountShell(page: Page) {
  await expect(
    page.getByRole("heading", { name: /account overview/i }),
  ).toBeVisible({ timeout: BUYER_AUTH_TIMEOUT_MS });
  await expectBuyerSessionCookies(page);
}

export async function logoutBuyer(page: Page) {
  await storefrontGoto(page, "/us/en/account", {
    waitUntil: process.env.E2E_PREVIEW === "1" ? "load" : undefined,
  });
  const signOut = page.getByRole("button", { name: /sign out|log out/i });
  if (await signOut.isVisible().catch(() => false)) {
    await signOut.click();
    await waitForAccountLoginOrOverview(page);
    const emailField = page.getByLabel(/^email$/i);
    if (!(await emailField.isVisible().catch(() => false))) {
      await clearStorefrontAuthCookies(page);
      await storefrontGoto(page, "/us/en/account", {
        waitUntil: process.env.E2E_PREVIEW === "1" ? "load" : undefined,
      });
    }
    await expect(page.getByLabel(/^email$/i)).toBeVisible({
      timeout: 60_000,
    });
    return;
  }
  await clearStorefrontAuthCookies(page);
  await storefrontGoto(page, "/us/en/account", {
    waitUntil: process.env.E2E_PREVIEW === "1" ? "load" : undefined,
  });
  const overview = page.getByRole("heading", { name: /account overview/i });
  if (await overview.isVisible().catch(() => false)) {
    throw new Error(
      "Account page is signed in but no sign-out control was found.",
    );
  }
  await expect(page.getByLabel(/^email$/i)).toBeVisible({ timeout: 60_000 });
}
