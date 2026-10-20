/** En-têtes anti-cache / anti-clickjacking pour réponses BFF authentifiées. */
export function applyBffSecurityHeaders(headers: Headers): void {
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "no-referrer");
}

/** Timeout fetch upstream (ms). */
export const BFF_UPSTREAM_TIMEOUT_MS = 25_000;

export function withUpstreamTimeout(init: RequestInit): RequestInit {
  const signal = AbortSignal.timeout(BFF_UPSTREAM_TIMEOUT_MS);
  return { ...init, signal };
}
