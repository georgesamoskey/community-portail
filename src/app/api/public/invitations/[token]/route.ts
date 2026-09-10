import { NextRequest, NextResponse } from "next/server";

function upstreamOrigin(): string {
  const o =
    process.env.EAGASEKE_API_ORIGIN ?? process.env.NEXT_PUBLIC_EAGASEKE_ORIGIN;
  if (!o) throw new Error("EAGASEKE_API_ORIGIN requis");
  return o.replace(/\/$/, "");
}

/** Proxy public invitations (sans JWT) — preview + accept. */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  try {
    const res = await fetch(
      `${upstreamOrigin()}/api/invitations/token/${encodeURIComponent(token)}`,
      { headers: { Accept: "application/json" } },
    );
    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      status: res.status,
      headers: {
        "content-type":
          res.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 502 },
    );
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  try {
    const body = await req.text();
    const res = await fetch(
      `${upstreamOrigin()}/api/invitations/accept/${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: body || "{}",
      },
    );
    const out = await res.arrayBuffer();
    return new NextResponse(out, {
      status: res.status,
      headers: {
        "content-type":
          res.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 502 },
    );
  }
}
