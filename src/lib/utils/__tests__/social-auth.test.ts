import { describe, expect, it } from "vitest";
import { socialAuthMessageKey } from "@/lib/utils/social-auth";

describe("socialAuthMessageKey", () => {
  it("maps the API's stable codes to account copy", () => {
    expect(socialAuthMessageKey("email_taken")).toBe("emailTaken");
    expect(socialAuthMessageKey("invalid_oauth_state")).toBe(
      "socialErrorExpired",
    );
    expect(socialAuthMessageKey("access_denied")).toBe("socialLoginCancelled");
    expect(socialAuthMessageKey("invalid_provider")).toBe(
      "socialErrorUnavailable",
    );
  });

  it("falls back to the generic failure copy", () => {
    expect(socialAuthMessageKey("not_a_code_we_know")).toBe(
      "socialLoginFailed",
    );
    expect(socialAuthMessageKey(null)).toBe("socialLoginFailed");
    expect(socialAuthMessageKey(undefined)).toBe("socialLoginFailed");
  });
});
