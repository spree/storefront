import type { MetadataRoute } from "next";
import { getStore } from "@/lib/data/store";
import { generateSitemaps } from "./sitemap";

/**
 * AI crawler user-agents to block by default.
 * Override via the ROBOTS_DISALLOW_AI env variable:
 *   - "true"  (default) — block known AI training bots
 *   - "false" — allow AI training bots
 *
 * Based on https://github.com/ai-robots-txt/ai.robots.txt
 */
const AI_CRAWLERS = [
  // OpenAI
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  // Google AI
  "Google-Extended",
  "GoogleOther",
  // Anthropic
  "anthropic-ai",
  "ClaudeBot",
  "Claude-Web",
  // Common Crawl (used by many AI projects)
  "CCBot",
  // Meta
  "FacebookBot",
  // Apple
  "Applebot-Extended",
  // Amazon
  "Amazonbot",
  // ByteDance / TikTok
  "Bytespider",
  // Perplexity
  "PerplexityBot",
  // Cohere
  "cohere-ai",
  // Diffbot
  "Diffbot",
  // You.com
  "YouBot",
  // Seekr
  "Seekr",
  // Data / SEO / scraping bots used for AI
  "DataForSeoBot",
  "FriendlyCrawler",
  "ImagesiftBot",
  "img2dataset",
  "magpie-crawler",
  "Meltwater",
  "omgili",
  "omgilibot",
  "peer39_crawler",
  "peer39_crawler/1.0",
  "PiplBot",
  "scoop.it",
  "AwarioRssBot",
  "AwarioSmartBot",
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const store = await getStore();
  const baseUrl = (store.url || process.env.NEXT_PUBLIC_SITE_URL || "").replace(
    /\/$/,
    "",
  );
  const sitemaps = await generateSitemaps();
  const blockAi = process.env.ROBOTS_DISALLOW_AI !== "false";

  const rules: MetadataRoute.Robots["rules"] = [
    {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/*/account",
        "/*/account/*",
        "/*/cart",
        "/*/checkout/*",
        "/*?*sort=*",
        "/*?*page=*",
        "/*?*filter*=*",
      ],
    },
  ];

  if (blockAi) {
    rules.push({
      userAgent: AI_CRAWLERS,
      disallow: ["/"],
    });
  }

  return {
    rules,
    sitemap: sitemaps.map((s) => `${baseUrl}/sitemap/${s.id}.xml`),
    host: baseUrl,
  };
}
