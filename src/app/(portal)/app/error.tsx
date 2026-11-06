"use client";

import { PortalErrorFallback } from "@/components/rich-empty";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PortalErrorFallback error={error} reset={reset} />;
}
