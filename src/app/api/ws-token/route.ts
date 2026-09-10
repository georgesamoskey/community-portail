import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { authSessionCookieName, authSessionUsesSecureCookie } from "@/lib/auth-session-cookie";

/**
 * Expose le access token Keycloak au client (WebSocket chat uniquement).
 * Ne pas logger / stocker côté UI.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "AUTH_SECRET manquant" }, { status: 500 });
  }
  const jwt = await getToken({
    req,
    secret,
    secureCookie: authSessionUsesSecureCookie(),
    cookieName: authSessionCookieName(),
  });
  if (!jwt?.accessToken || typeof jwt.accessToken !== "string") {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (jwt.error === "RefreshAccessTokenError") {
    return NextResponse.json({ error: "SESSION_EXPIRED" }, { status: 401 });
  }
  const origin =
    process.env.NEXT_PUBLIC_EAGASEKE_WS_ORIGIN?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_EAGASEKE_ORIGIN?.replace(/\/$/, "") ||
    "http://localhost:30009";
  return NextResponse.json({
    accessToken: jwt.accessToken,
    wsOrigin: origin,
  });
}
