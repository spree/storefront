/**
 * The API answers a failed social sign-in with a stable code, never a message,
 * so the copy lives here rather than in the response. Keys belong to the
 * `account` namespace.
 */
type AccountMessageKey = Extract<keyof IntlMessages["account"], string>;

const ERROR_MESSAGE_KEYS = {
  access_denied: "socialLoginCancelled",
  invalid_oauth_state: "socialErrorExpired",
  invalid_registration_token: "socialErrorExpired",
  invalid_provider: "socialErrorUnavailable",
  redirect_url_not_allowed: "socialErrorUnavailable",
  authentication_failed: "socialLoginFailed",
  registration_failed: "socialLoginFailed",
  email_taken: "emailTaken",
} as const satisfies Record<string, AccountMessageKey>;

/**
 * The `account` message key for a code the API or the callback returned.
 *
 * @param code - the stable error code, as it arrives from the API or in the
 *   `social_error` query parameter
 * @returns a message key, falling back to the generic failure copy
 */
export function socialAuthMessageKey(
  code: string | null | undefined,
): AccountMessageKey {
  if (code && code in ERROR_MESSAGE_KEYS) {
    return ERROR_MESSAGE_KEYS[code as keyof typeof ERROR_MESSAGE_KEYS];
  }

  return "socialLoginFailed";
}
