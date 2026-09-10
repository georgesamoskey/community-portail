import { auth, isKeycloakConfigured } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/public")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/app")) {
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
  matcher: ["/app/:path*", "/login", "/auth/:path*"],
};
