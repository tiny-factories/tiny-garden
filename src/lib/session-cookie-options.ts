/**
 * Optional cookie domain for apex + www (e.g. `.tiny.garden`).
 * Set SESSION_COOKIE_DOMAIN in production if users hit both hosts.
 */
export function sessionCookieBaseOptions(): {
  path: string;
  domain?: string;
} {
  const domain = process.env.SESSION_COOKIE_DOMAIN?.trim();
  return {
    path: "/",
    ...(domain ? { domain } : {}),
  };
}
