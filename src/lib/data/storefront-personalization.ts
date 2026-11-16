"use server";

import type { RequestOptions } from "@spree/sdk";
import { cookies } from "next/headers";
import type {
  HomePersonalizationComposition,
  PersonalizationInterestSummary,
} from "@/lib/data/storefront-personalization-types";
import {
  getAccessToken,
  getClient,
  getLocaleOptions,
  withAuthRefresh,
} from "@/lib/spree";
import {
  hasStaticGuestHomeComposition,
  rememberStaticGuestHomeComposition,
} from "@/lib/theme/guest-home-composition";

const TRAFFIC_SESSION_COOKIE = "spree_traffic_session";

type HomeCompositionResponse = { data: HomePersonalizationComposition };

/**
 * Buyer-specific homepage composition. Never cached at the Next.js layer.
 */
export async function getHomePersonalizationComposition(
  previewPersona?: string,
): Promise<HomePersonalizationComposition | null> {
  const options = await buildPersonalizationRequestOptions(previewPersona);
  const guestScope =
    !options.token && !previewPersona
      ? JSON.stringify([options.country, options.locale])
      : undefined;
  if (guestScope && hasStaticGuestHomeComposition(guestScope)) return null;

  try {
    const response = await getClient().request<HomeCompositionResponse>(
      "GET",
      "/storefront_personalization/home",
      options,
    );
    if (guestScope && response.data?.composition_version === "static") {
      rememberStaticGuestHomeComposition(guestScope);
    }
    return response.data ?? null;
  } catch {
    return null;
  }
}

async function buildPersonalizationRequestOptions(
  previewPersona?: string,
): Promise<RequestOptions> {
  const localeOptions = await getLocaleOptions();
  const token = await getAccessToken();
  const jar = await cookies();
  const sessionToken = jar.get(TRAFFIC_SESSION_COOKIE)?.value;
  const params: Record<string, string> = {};
  if (sessionToken) params.session_token = sessionToken;
  if (previewPersona) params.preview_persona = previewPersona;

  const base: RequestOptions = {
    ...localeOptions,
    params: Object.keys(params).length ? params : undefined,
    cache: "no-store",
    ...(token ? { token } : {}),
  };
  return base;
}

export async function getPersonalizationInterestSummary(): Promise<PersonalizationInterestSummary | null> {
  try {
    const response = await withAuthRefresh((options) =>
      getClient().request<{ data: PersonalizationInterestSummary }>(
        "GET",
        "/customers/me/personalization_interests",
        { ...options, cache: "no-store" },
      ),
    );
    return response.data ?? null;
  } catch {
    return null;
  }
}

export async function clearPersonalizationInterests(): Promise<boolean> {
  try {
    await withAuthRefresh((options) =>
      getClient().request<void>(
        "DELETE",
        "/customers/me/personalization_interests",
        options,
      ),
    );
    return true;
  } catch {
    return false;
  }
}

export async function dismissRecommendation(input: {
  subject_type: string;
  subject_id: string;
  kind?: string;
  surface?: string;
}): Promise<boolean> {
  try {
    await withAuthRefresh((options) =>
      getClient().request("POST", "/customers/me/recommendation_feedback", {
        ...options,
        body: input,
      }),
    );
    return true;
  } catch {
    return false;
  }
}
