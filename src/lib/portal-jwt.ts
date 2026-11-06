import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import {
  authSessionCookieName,
  authSessionCookieSalt,
  authSessionUsesSecureCookie,
} from "@/lib/auth-session-cookie";

/**
 * Lit le JWT Auth.js portail.
 * Important : avec un cookieName custom (`…portal-session-token`), le `salt`
 * doit être le même nom — sinon getToken renvoie null alors que /api/auth/session marche.
 */
export async function getPortalAccessJwt(req: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  const cookieName = authSessionCookieName();
  return getToken({
    req,
    secret,
    secureCookie: authSessionUsesSecureCookie(),
    cookieName,
    salt: authSessionCookieSalt(),
  });
}
