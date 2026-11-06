"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { Btn } from "@/lib/ui";
import { bffFetch } from "@/lib/bff-fetch";

const LOCK_KEY = "akiba-webauthn-lock";
const CRED_KEY = "akiba-webauthn-cred";

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/** Verrou session optionnel (WebAuthn) — parité soft biométrie native. */
export function SessionLockGate({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const enabled = localStorage.getItem(LOCK_KEY) === "1";
    const cred = localStorage.getItem(CRED_KEY);
    if (enabled && cred) setLocked(true);
    const onIdle = () => {
      if (localStorage.getItem(LOCK_KEY) === "1" && localStorage.getItem(CRED_KEY)) {
        setLocked(true);
      }
    };
    window.addEventListener("akiba-idle-lock", onIdle);
    const onVis = () => {
      if (
        document.visibilityState === "visible" &&
        localStorage.getItem(LOCK_KEY) === "1" &&
        localStorage.getItem(CRED_KEY) &&
        localStorage.getItem("akiba-lock-on-resume") !== "0"
      ) {
        setLocked(true);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("akiba-idle-lock", onIdle);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const unlock = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const credId = localStorage.getItem(CRED_KEY);
      if (!credId || !window.PublicKeyCredential) {
        setLocked(false);
        return;
      }
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [
            {
              id: base64ToBuffer(credId),
              type: "public-key",
            },
          ],
          timeout: 60_000,
          userVerification: "required",
        },
      });
      if (assertion) setLocked(false);
      else setError(t("security.unlockFailed"));
    } catch {
      setError(t("security.unlockFailed"));
    } finally {
      setBusy(false);
    }
  }, [t]);

  if (!locked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" className="mb-6 h-16 w-16 rounded-2xl" />
      <h1 className="font-display text-xl font-bold text-ink">
        {t("security.lockTitle")}
      </h1>
      <p className="mt-2 max-w-sm text-center text-sm text-ink-mute">
        {t("security.lockHint")}
      </p>
      {error ? (
        <p className="mt-3 text-sm text-brand-600">{error}</p>
      ) : null}
      <Btn className="mt-6" disabled={busy} onClick={() => void unlock()}>
        {busy ? t("common.loading") : t("security.unlock")}
      </Btn>
    </div>
  );
}

export function SessionLockSettings() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(localStorage.getItem(LOCK_KEY) === "1");
  }, []);

  const enable = async () => {
    setBusy(true);
    setMsg(null);
    try {
      if (!window.PublicKeyCredential) {
        setMsg(t("security.unsupported"));
        return;
      }
      const cred = (await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: "Akiba One", id: window.location.hostname },
          user: {
            id: crypto.getRandomValues(new Uint8Array(16)),
            name: "member",
            displayName: "Akiba One",
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60_000,
        },
      })) as PublicKeyCredential | null;
      if (!cred) {
        setMsg(t("security.unlockFailed"));
        return;
      }
      localStorage.setItem(CRED_KEY, bufferToBase64(cred.rawId));
      localStorage.setItem(LOCK_KEY, "1");
      setEnabled(true);
      setMsg(t("security.enabled"));
    } catch {
      setMsg(t("security.unlockFailed"));
    } finally {
      setBusy(false);
    }
  };

  const disable = () => {
    localStorage.removeItem(LOCK_KEY);
    localStorage.removeItem(CRED_KEY);
    setEnabled(false);
    setMsg(t("security.disabled"));
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-mute">{t("security.lockHint")}</p>
      {enabled ? (
        <Btn variant="secondary" disabled={busy} onClick={disable}>
          {t("security.disable")}
        </Btn>
      ) : (
        <Btn disabled={busy} onClick={() => void enable()}>
          {t("security.enable")}
        </Btn>
      )}
      {msg ? <p className="text-xs text-mint-700">{msg}</p> : null}
    </div>
  );
}

export function WebPushSettings() {
  const { t } = useI18n();
  const [status, setStatus] = useState<"idle" | "on" | "denied" | "unsupported">(
    "idle",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") setStatus("denied");
    else if (Notification.permission === "granted") setStatus("on");
  }, []);

  const enable = async () => {
    setBusy(true);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const opts: PushSubscriptionOptionsInit = {
          userVisibleOnly: true,
        };
        if (vapid) {
          const pad = "=".repeat((4 - (vapid.length % 4)) % 4);
          const raw = atob(vapid.replace(/-/g, "+").replace(/_/g, "/") + pad);
          const key = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) key[i] = raw.charCodeAt(i);
          opts.applicationServerKey = key;
        }
        sub = await reg.pushManager.subscribe(opts);
      }
      await bffFetch("/notifications/devices/fcm-token", {
        method: "POST",
        body: JSON.stringify({
          token: JSON.stringify(sub.toJSON()),
          platform: "web",
          deviceLabel: "PWA",
          locale: navigator.language,
        }),
      });
      setStatus("on");
    } catch {
      setStatus("denied");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-mute">{t("security.pushHint")}</p>
      <Btn disabled={busy || status === "on" || status === "unsupported"} onClick={() => void enable()}>
        {status === "on"
          ? t("security.pushOn")
          : status === "unsupported"
            ? t("security.unsupported")
            : t("security.pushEnable")}
      </Btn>
      {status === "denied" ? (
        <p className="text-xs text-brand-600">{t("security.pushDenied")}</p>
      ) : null}
    </div>
  );
}
