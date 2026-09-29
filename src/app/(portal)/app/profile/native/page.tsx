"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { MobileHero, SettingsRow } from "@/components/mobile-iso";
import {
  SessionLockSettings,
  WebPushSettings,
} from "@/components/security-gates";
import {
  ThemeSwitcher,
  QrScanner,
  NetworkQualityChip,
} from "@/components/native-plus";
import { PinLockSettings } from "@/components/native-pro";
import { pushToast } from "@/components/native-ux";
import {
  celebrate,
  getGeoOnce,
  lockPortrait,
  pickContacts,
  registerBackgroundSync,
  registerPeriodicSync,
  requestFullscreen,
  requestPersistentStorage,
  saveBlobNative,
  extractInviteFromText,
} from "@/lib/native";
import { useRouter } from "next/navigation";
import { haptic } from "@/lib/native";

export default function NativeLabPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [scanOpen, setScanOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <div className="space-y-4 pb-12">
      <MobileHero>
        <p className="text-xs font-bold uppercase tracking-wider text-white/70">
          Akiba One
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold">
          {t("native.labTitle")}
        </h1>
        <p className="mt-1 text-sm text-white/80">{t("native.labHint")}</p>
        <div className="mt-3">
          <NetworkQualityChip />
        </div>
      </MobileHero>

      <section className="rounded-2xl border border-ink/[0.06] bg-surface p-4 shadow-soft">
        <h2 className="text-sm font-bold text-ink">{t("native.theme")}</h2>
        <div className="mt-3">
          <ThemeSwitcher />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-ink/[0.06] bg-surface shadow-soft">
        <SettingsRow
          title={t("native.scanCta")}
          subtitle={t("native.scanHint")}
          onClick={() => setScanOpen(true)}
        />
        <div className="h-px bg-ink/[0.06]" />
        <SettingsRow
          title={t("native.geoCta")}
          subtitle={t("native.geoHint")}
          onClick={() => {
            void (async () => {
              setBusy("geo");
              const g = await getGeoOnce();
              setBusy(null);
              if (!g) {
                pushToast(t("native.geoDenied"), "warn");
                return;
              }
              pushToast(t("native.geoOk"), "ok");
              router.push("/app/discover");
            })();
          }}
        />
        <div className="h-px bg-ink/[0.06]" />
        <SettingsRow
          title={t("native.contactsCta")}
          subtitle={t("native.contactsHint")}
          onClick={() => {
            void (async () => {
              const rows = await pickContacts(true);
              if (!rows) {
                pushToast(t("native.contactsDenied"), "warn");
                return;
              }
              pushToast(
                t("native.contactsOk", { n: rows.length }),
                "ok",
              );
              haptic("success");
            })();
          }}
        />
        <div className="h-px bg-ink/[0.06]" />
        <SettingsRow
          title={t("native.fullscreen")}
          onClick={() => void requestFullscreen()}
        />
        <div className="h-px bg-ink/[0.06]" />
        <SettingsRow
          title={t("native.portraitLock")}
          onClick={() =>
            void lockPortrait().then((ok) =>
              pushToast(ok ? t("native.ok") : t("native.unsupported"), ok ? "ok" : "warn"),
            )
          }
        />
        <div className="h-px bg-ink/[0.06]" />
        <SettingsRow
          title={t("native.persistStorage")}
          onClick={() =>
            void requestPersistentStorage().then((ok) =>
              pushToast(ok ? t("native.ok") : t("native.unsupported"), ok ? "ok" : "warn"),
            )
          }
        />
        <div className="h-px bg-ink/[0.06]" />
        <SettingsRow
          title={t("native.bgSync")}
          onClick={() =>
            void Promise.all([
              registerBackgroundSync(),
              registerPeriodicSync(),
            ]).then(([a, b]) =>
              pushToast(
                a || b ? t("native.ok") : t("native.unsupported"),
                a || b ? "ok" : "warn",
              ),
            )
          }
        />
        <div className="h-px bg-ink/[0.06]" />
        <SettingsRow
          title={t("native.exportDemo")}
          onClick={() => {
            const blob = new Blob(
              [`Akiba One export\n${new Date().toISOString()}\n`],
              { type: "text/plain" },
            );
            void saveBlobNative(blob, "akiba-export.txt").then((ok) => {
              if (ok) celebrate();
              pushToast(ok ? t("native.ok") : t("native.unsupported"), ok ? "ok" : "warn");
            });
          }}
        />
        <div className="h-px bg-ink/[0.06]" />
        <SettingsRow
          title={t("native.celebrateDemo")}
          onClick={() => {
            celebrate();
            pushToast(t("native.ok"), "ok");
          }}
        />
      </section>

      <section className="rounded-2xl border border-ink/[0.06] bg-surface p-4 shadow-soft">
        <h2 className="mb-2 text-sm font-bold text-ink">{t("security.pushTitle")}</h2>
        <WebPushSettings />
      </section>

      <section className="rounded-2xl border border-ink/[0.06] bg-surface p-4 shadow-soft">
        <h2 className="mb-2 text-sm font-bold text-ink">{t("security.lockTitle")}</h2>
        <SessionLockSettings />
      </section>

      <section className="rounded-2xl border border-ink/[0.06] bg-surface p-4 shadow-soft">
        <h2 className="mb-2 text-sm font-bold text-ink">{t("native.pinTitle")}</h2>
        <PinLockSettings />
      </section>

      <Link
        href="/app/profile"
        className="block text-center text-sm font-semibold text-brand-600"
      >
        ← {t("nav.profile")}
      </Link>

      <QrScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onResult={(value) => {
          const code = extractInviteFromText(value) ?? value;
          if (value.includes("/invite/")) router.push(`/invite/${code}`);
          else if (value.includes("/r/")) router.push(`/r/${code}`);
          else if (value.startsWith("http")) window.location.assign(value);
          else router.push(`/invite/${code}`);
        }}
      />
      {busy ? (
        <p className="text-center text-xs text-ink-mute">{t("common.loading")}</p>
      ) : null}
    </div>
  );
}
