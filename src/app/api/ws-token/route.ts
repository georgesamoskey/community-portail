import { NextRequest, NextResponse } from "next/server";
import { getPortalAccessJwt } from "@/lib/portal-jwt";

function isBrowserReachableOrigin(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return false;
    if (u.hostname === "app" || u.hostname.endsWith(".internal")) return false;
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Origine Socket.IO joignable depuis le navigateur (pas localhost / app:). */
function resolveWsOrigin(req: NextRequest): string {
  const candidates = [
    process.env.EAGASEKE_WS_PUBLIC_ORIGIN,
    process.env.NEXT_PUBLIC_EAGASEKE_WS_ORIGIN,
    process.env.NEXT_PUBLIC_EAGASEKE_ORIGIN,
    process.env.AUTH_URL,
  ]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.replace(/\/$/, ""));

  for (const c of candidates) {
    if (isBrowserReachableOrigin(c)) return c;
  }

  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  if (host) return `${proto}://${host.split(",")[0]!.trim()}`;

  return "http://localhost:30009";
}

/**
 * Expose le access token Keycloak au client (WebSocket chat uniquement).
 * Ne pas logger / stocker côté UI.
 */
export async function GET(req: NextRequest) {
  if (!process.env.AUTH_SECRET) {
    return NextResponse.json({ error: "AUTH_SECRET manquant" }, { status: 500 });
  }
  const jwt = await getPortalAccessJwt(req);
  if (!jwt?.accessToken || typeof jwt.accessToken !== "string") {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (jwt.error === "RefreshAccessTokenError") {
    return NextResponse.json({ error: "SESSION_EXPIRED" }, { status: 401 });
  }
  return NextResponse.json({
    accessToken: jwt.accessToken,
    wsOrigin: resolveWsOrigin(req),
  });
}
