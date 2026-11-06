import { NextResponse } from "next/server";

const ALLOWED = new Set([
  "otp/request",
  "otp/resend",
  "otp/verify",
  "register",
  "password/forgot",
  "password/reset",
]);

function upstreamOrigin(): string {
  return (
    process.env.EAGASEKE_API_ORIGIN ??
    process.env.NEXT_PUBLIC_EAGASEKE_ORIGIN ??
    "http://localhost:30009"
  ).replace(/\/$/, "");
}

/** Proxy public auth (OTP / register / reset) — parité apps natives. */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  const { path = [] } = await ctx.params;
  const rel = path.join("/");
  if (!ALLOWED.has(rel)) {
    return NextResponse.json({ error: "NOT_ALLOWED" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  try {
    const res = await fetch(`${upstreamOrigin()}/api/auth/${rel}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "UPSTREAM",
        message: (e as Error).message || "API indisponible",
      },
      { status: 502 },
    );
  }
}
