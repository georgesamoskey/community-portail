import { Suspense } from "react";
import { isKeycloakConfigured } from "@/auth";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  const configured = isKeycloakConfigured();
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-ink-mute">…</p>}>
      <LoginForm configured={configured} />
    </Suspense>
  );
}
