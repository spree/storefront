import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getStoreUrl } from "@/lib/store";
import { generateSitemaps } from "./sitemap";

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Render per request so the sitemap index keeps in sync with catalog growth
  // instead of freezing the chunk list at deployment time.
  await connection();
  const baseUrl = (getStoreUrl() || "").replace(/\/$/, "") || undefined;
  const sitemaps = await generateSitemaps();

  return {
    rules: [
      {
        userAgent: "meta-externalagent",
        disallow: ["/"],
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/*/account",
          "/*/account/*",
          "/*/cart",
          "/*/checkout",
          "/*/checkout/*",
          "/*?*sort=*",
          "/*?*page=*",
          "/*?*filter*=*",
        ],
      },
    ],
    ...(baseUrl
      ? {
          sitemap: sitemaps.map((s) => `${baseUrl}/sitemap/${s.id}.xml`),
          host: baseUrl,
        }
      : {}),
  };
}
