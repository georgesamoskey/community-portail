import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { authSessionCookieName, authSessionUsesSecureCookie } from "@/lib/auth-session-cookie";

/**
 * Préfixes autorisés pour le BFF customer portal.
 * Les chemins admin/* sont explicitement refusés.
 */
const ALLOWED_PREFIXES = [
  "users",
  "auth",
  "tontines",
  "tontine-rounds",
  "contributions",
  "cotisations",
  "payouts",
  "fees",
  "chat",
  "notifications",
  "mobile-money",
  "invitations",
  "engagement",
  "recommendations",
  "reports",
  "support",
];

function isBlockedPath(rel: string): boolean {
  if (rel === "admin" || rel.startsWith("admin/")) return true;
  if (rel.startsWith("notifications/admin")) return true;
  if (rel.includes("force-status")) return true;
  return false;
}

function isAllowedPath(rel: string): boolean {
  if (isBlockedPath(rel)) return false;
  return ALLOWED_PREFIXES.some((p) => rel === p || rel.startsWith(`${p}/`));
}

function upstreamOrigin(): string {
  const o =
    process.env.EAGASEKE_API_ORIGIN ?? process.env.NEXT_PUBLIC_EAGASEKE_ORIGIN;
  if (!o) {
    throw new Error(
      "EAGASEKE_API_ORIGIN ou NEXT_PUBLIC_EAGASEKE_ORIGIN requis",
    );
  }
  return o.replace(/\/$/, "");
}

async function getJwt(req: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  return getToken({
    req,
    secret,
    secureCookie: authSessionUsesSecureCookie(),
    cookieName: authSessionCookieName(),
  });
}

async function proxy(
  req: NextRequest,
  method: string,
  segments: string[],
): Promise<NextResponse> {
  try {
    const jwt = await getJwt(req);
    if (!jwt) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    if (jwt.error === "RefreshAccessTokenError") {
      return NextResponse.json(
        {
          error: "SESSION_EXPIRED",
          message: "Renouvellement Keycloak impossible. Reconnectez-vous.",
        },
        { status: 401 },
      );
    }

    const accessToken = jwt.accessToken;
    if (typeof accessToken !== "string" || accessToken.length === 0) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const rel = segments.join("/");
    if (!rel || !isAllowedPath(rel)) {
      return NextResponse.json({ error: "Chemin non autorisé" }, { status: 403 });
    }

    const url = new URL(req.url);
    const upstream = `${upstreamOrigin()}/api/${rel}${url.search}`;

    const headers = new Headers();
    headers.set("Authorization", `Bearer ${accessToken}`);
    const accept = req.headers.get("accept");
    if (accept) headers.set("Accept", accept);
    const ct = req.headers.get("content-type");
    if (ct && method !== "GET" && method !== "HEAD") {
      headers.set("Content-Type", ct);
    }
    const rid = req.headers.get("x-request-id");
    if (rid) headers.set("X-Request-Id", rid);

    const init: RequestInit = { method, headers };
    if (method !== "GET" && method !== "HEAD") {
      // Forward JSON text or binary/multipart (ArrayBuffer) as-is.
      const isMultipart = (ct ?? "").includes("multipart/form-data");
      if (isMultipart) {
        headers.delete("Content-Type"); // boundary must come from the body blob
        const buf = await req.arrayBuffer();
        if (buf.byteLength > 0) {
          init.body = buf;
          headers.set("Content-Type", ct!);
        }
      } else {
        const body = await req.arrayBuffer();
        if (body.byteLength > 0) init.body = body;
      }
    }

    const res = await fetch(upstream, init);
    const out = new NextResponse(await res.arrayBuffer(), { status: res.status });
    const outCt = res.headers.get("content-type");
    if (outCt) out.headers.set("content-type", outCt);
    return out;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur proxy";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

type RouteCtx = { params: Promise<{ path?: string[] }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, "GET", path ?? []);
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, "POST", path ?? []);
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, "PUT", path ?? []);
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, "PATCH", path ?? []);
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, "DELETE", path ?? []);
}
