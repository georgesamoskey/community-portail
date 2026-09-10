import { Suspense } from "react";
import { isKeycloakConfigured } from "@/auth";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  const configured = isKeycloakConfigured();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Suspense fallback={<p className="text-sm text-ink-mute">…</p>}>
        <LoginForm configured={configured} />
      </Suspense>
    </div>
  );
}
