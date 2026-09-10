/**
 * Extrait les claims usuels du id_token / access_token JWT Keycloak
 * (sans vérifier la signature : déjà validé par Auth.js).
 */
export function claimsFromIdToken(idToken: string): {
  sub?: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  roles?: string[];
} {
  try {
    const mid = idToken.split(".")[1];
    if (!mid) return {};
    const pad = mid.length % 4 === 0 ? "" : "=".repeat(4 - (mid.length % 4));
    const b64 = mid.replace(/-/g, "+").replace(/_/g, "/") + pad;
    const json = JSON.parse(atob(b64)) as Record<string, unknown>;
    const realm = json.realm_access as { roles?: unknown } | undefined;
    const roles = Array.isArray(realm?.roles)
      ? realm.roles.filter((r): r is string => typeof r === "string")
      : undefined;
    return {
      sub: typeof json.sub === "string" ? json.sub : undefined,
      email: typeof json.email === "string" ? json.email : undefined,
      name: typeof json.name === "string" ? json.name : undefined,
      preferred_username:
        typeof json.preferred_username === "string"
          ? json.preferred_username
          : undefined,
      roles,
    };
  } catch {
    return {};
  }
}

/** Roles depuis access_token (souvent plus complets que l’id_token). */
export function rolesFromAccessToken(accessToken: string | undefined): string[] {
  if (!accessToken) return [];
  return claimsFromIdToken(accessToken).roles ?? [];
}
