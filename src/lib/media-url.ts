/** URL absolue pour avatar / upload servi par eagaseke (même origine en prod). */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path?.trim()) return null;
  const p = path.trim();
  if (
    p.startsWith("http://") ||
    p.startsWith("https://") ||
    p.startsWith("data:") ||
    p.startsWith("blob:")
  ) {
    return p;
  }
  const rel = p.startsWith("/") ? p : `/${p}`;

  // En navigateur : préférer l’origine courante (nginx /uploads → API).
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${rel}`;
  }

  const base = (
    process.env.NEXT_PUBLIC_EAGASEKE_ORIGIN ||
    process.env.AUTH_URL ||
    ""
  ).replace(/\/$/, "");
  if (base) return `${base}${rel}`;
  return rel;
}
