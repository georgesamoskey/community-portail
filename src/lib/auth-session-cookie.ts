/** Aligné sur Auth.js : cookie __Secure-* si prod ou si AUTH_URL est en https. */
export function authSessionUsesSecureCookie(): boolean {
  if (process.env.NODE_ENV === "production") return true;
  const u = process.env.AUTH_URL ?? "";
  return u.startsWith("https://");
}

/** Cookie session Auth.js dédié au portail (évite collision localhost). */
export function authSessionCookieName(): string {
  const base = "authjs.portal-session-token";
  return authSessionUsesSecureCookie() ? `__Secure-${base}` : base;
}

export function authSessionCookieSalt(): string {
  return authSessionCookieName();
}
