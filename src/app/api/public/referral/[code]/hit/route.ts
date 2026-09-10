import { NextRequest, NextResponse } from "next/server";

function upstreamOrigin(): string {
  const o =
    process.env.EAGASEKE_API_ORIGIN ?? process.env.NEXT_PUBLIC_EAGASEKE_ORIGIN;
  if (!o) throw new Error("NEXT_PUBLIC_EAGASEKE_ORIGIN requis");
  return o.replace(/\/$/, "");
}

type Ctx = { params: Promise<{ code: string }> };

export async function POST(_req: NextRequest, ctx: Ctx) {
  const { code } = await ctx.params;
  try {
    const res = await fetch(
      `${upstreamOrigin()}/api/users/referral/${encodeURIComponent(code)}/hit`,
      { method: "POST", cache: "no-store" },
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 502 },
    );
  }
}
