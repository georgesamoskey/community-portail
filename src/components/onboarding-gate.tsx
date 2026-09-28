"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { shouldShowFullscreenOnboarding } from "@/lib/retention";

/** Redirige une fois vers /onboarding si checklist incomplète (first-run ISO). */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith("/app")) return;
    if (pathname !== "/app") return;
    try {
      if (shouldShowFullscreenOnboarding()) {
        router.replace("/onboarding");
      }
    } catch {
      /* ignore */
    }
  }, [pathname, router]);

  return <>{children}</>;
}
