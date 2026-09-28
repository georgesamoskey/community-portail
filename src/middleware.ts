import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth, isKeycloakConfigured } from "@/auth";
import { portalPathFromNativeDeepLink } from "@/lib/deep-links";

export default auth((req) => {
  const { pathname, search } = req.nextUrl;

  const mapped = portalPathFromNativeDeepLink(pathname, search);
  if (mapped) {
    return NextResponse.redirect(new URL(mapped, req.nextUrl.origin));
  }

  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/r/") ||
    pathname.startsWith("/offline") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/public") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/workbox-")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/app") || pathname.startsWith("/onboarding")) {
    if (!isKeycloakConfigured()) {
      return NextResponse.redirect(
        new URL("/login?auth=config", req.nextUrl.origin),
      );
    }
    if (!req.auth) {
      const url = new URL("/login", req.nextUrl.origin);
      url.searchParams.set(
        "callbackUrl",
        `${pathname}${req.nextUrl.search}`,
      );
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/app/:path*",
    "/onboarding",
    "/login",
    "/register",
    "/forgot-password",
    "/auth/:path*",
    "/c/:path*",
    "/t/:path*",
    "/chat/:path*",
    "/declare_cotisation/:path*",
    "/contribution_detail/:path*",
    "/tontine_detail/:path*",
    "/chat_room/:path*",
  ],
};
