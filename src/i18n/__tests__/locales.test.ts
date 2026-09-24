import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  resolveSupportedLocale,
  SUPPORTED_LOCALES,
} from "@/i18n/locales";
import {
  canonicalizeLocale,
  matchLocale,
  negotiateAcceptLanguage,
  negotiateLocale,
  toRouteLocale,
} from "@/i18n/normalize";

describe("locale configuration", () => {
  it("resolves configured locales case-insensitively", () => {
    expect(resolveSupportedLocale("EN")).toBe("en");
    expect(resolveSupportedLocale("en-GB")).toBe("en-gb");
    expect(resolveSupportedLocale("it")).toBeUndefined();
    expect(SUPPORTED_LOCALES).toContain(DEFAULT_LOCALE);
  });

  it("canonicalizes BCP 47 and Rails-style locale codes", () => {
    expect(canonicalizeLocale("zh_cn")).toBe("zh-CN");
    expect(canonicalizeLocale("sr_latn_rs")).toBe("sr-Latn-RS");
    expect(canonicalizeLocale("not_a_locale_!")).toBeUndefined();
    expect(toRouteLocale("en-GB")).toBe("en-gb");
  });

  it("preserves configured spelling and negotiates a base language", () => {
    const supported = ["en", "zh-CN"] as const;
    expect(matchLocale("zh-cn", supported)).toBe("zh-CN");
    expect(negotiateLocale("en-US", supported)).toBe("en");
  });

  it("honors Accept-Language quality weights and rejects q=0 entries", () => {
    const supported = ["en", "de"] as const;

    expect(negotiateAcceptLanguage("de;q=0.2, en-US;q=0.9", supported)).toBe(
      "en",
    );
    expect(negotiateAcceptLanguage("de;q=0, en;q=0.5", supported)).toBe("en");
  });
});
