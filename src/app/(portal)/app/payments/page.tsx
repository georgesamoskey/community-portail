"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { hasPermission, Permission } from "@/lib/portal-permissions";
import { useBff } from "@/lib/use-bff";
import { useAction } from "@/lib/use-action";
import { bffFetch, BffError } from "@/lib/bff-fetch";
import { normalizeList } from "@/lib/portal-api";
import {
  Alert,
  Badge,
  Btn,
  Field,
  inputClass,
  PageHeader,
  Panel,
  statusTone,
} from "@/lib/ui";

type Provider = {
  slug?: string;
  id?: string;
  name?: string;
  country?: string;
};

type Tx = {
  id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  provider?: string;
};

export default function PaymentsPage() {
  const { t } = useI18n();
  const { data: session } = useSession();
  const roles = session?.user?.roles;
  const canPay = hasPermission(roles, Permission.PORTAL_PAYMENTS);
  const action = useAction();

  const providers = useBff<unknown>(
    canPay ? "/mobile-money/providers?capability=collection" : null,
  );
  const preview = useBff<Record<string, unknown> | null>(
    canPay
      ? "/fees/preview?grossAmount=10000&currency=BIF&source=cotisation"
      : null,
  );

  const [amount, setAmount] = useState("10000");
  const [phone, setPhone] = useState("");
  const [provider, setProvider] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("BIF");
  const [feeLive, setFeeLive] = useState<Record<string, unknown> | null>(null);
  const [lastTx, setLastTx] = useState<Tx | null>(null);
  const [busyFee, setBusyFee] = useState(false);
  const [feeMsg, setFeeMsg] = useState<string | null>(null);

  const providerList = useMemo(
    () =>
      normalizeList<Provider>(providers.data, ["items", "providers", "data"]),
    [providers.data],
  );

  if (!canPay) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("payments.title")}
          description={t("payments.desc")}
        />
        <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-8 text-center shadow-sm">
          <p className="font-display text-xl font-semibold text-brand-900">
            {t("payments.premium")}
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-brand-700/80">
            {t("payments.premiumHint")}
          </p>
          <Link
            href="/app"
            className="mt-6 inline-flex rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {t("payments.backHome")}
          </Link>
        </div>
      </div>
    );
  }

  const refreshFee = async () => {
    setBusyFee(true);
    setFeeMsg(null);
    try {
      const q = new URLSearchParams({
        amount: amount || "0",
        currency,
        source: "cotisation",
      });
      if (phone.trim()) q.set("payerPhone", phone.trim());
      const data = await bffFetch<Record<string, unknown>>(
        `/mobile-money/fee-preview?${q.toString()}`,
      );
      setFeeLive(data);
    } catch (e) {
      setFeeMsg(e instanceof BffError ? e.message : t("payments.feeErr"));
    } finally {
      setBusyFee(false);
    }
  };

  const initiate = () =>
    void action.mutate<Tx>(
      "/mobile-money/initiate",
      {
        method: "POST",
        body: JSON.stringify({
          provider,
          payerPhone: phone.trim(),
          amount: Number(amount),
          currency,
          description:
            description.trim() || t("payments.defaultDesc"),
        }),
      },
      {
        success: t("payments.initiated"),
        onDone: (tx) => setLastTx(tx),
      },
    );

  const refreshTx = () => {
    if (!lastTx?.id) return;
    void action.mutate<Tx>(
      `/mobile-money/${lastTx.id}/refresh`,
      { method: "POST" },
      {
        success: t("payments.statusOk"),
        onDone: (tx) => setLastTx(tx),
      },
    );
  };

  const loadTx = () => {
    if (!lastTx?.id) return;
    void action.run(async () => {
      const tx = await bffFetch<Tx>(`/mobile-money/${lastTx.id}`);
      setLastTx(tx);
      return tx;
    }, { success: t("payments.txLoaded") });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("payments.title")}
        description={t("payments.descFull")}
      />

      {(action.error || action.success) && (
        <Alert tone={action.error ? "rose" : "teal"}>
          {action.error ?? action.success}
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("payments.providers")}>
          {providers.loading && (
            <p className="text-sm text-brand-600">{t("common.loading")}</p>
          )}
          {providers.error && (
            <p className="text-sm text-amber-800">{providers.error}</p>
          )}
          {!providers.loading && providerList.length === 0 && (
            <p className="text-sm text-brand-600">{t("payments.noProviders")}</p>
          )}
          <ul className="mt-3 space-y-2">
            {providerList.map((p) => {
              const slug = p.slug ?? p.id ?? p.name ?? "?";
              return (
                <li key={slug}>
                  <button
                    type="button"
                    onClick={() => setProvider(slug)}
                    className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                      provider === slug
                        ? "border-brand-500 bg-brand-50"
                        : "border-brand-100 hover:bg-brand-50/50"
                    }`}
                  >
                    <span className="font-medium">{p.name ?? slug}</span>
                    {p.country ? (
                      <span className="ml-2 text-xs text-brand-600">
                        {p.country}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title={t("payments.init")}>
          <div className="space-y-3">
            <Field label={t("common.amount")}>
              <input
                className={inputClass}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label={t("payments.currency")}>
              <input
                className={inputClass}
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={3}
              />
            </Field>
            <Field label={t("payments.payerPhone")}>
              <input
                className={inputClass}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+25779123456"
              />
            </Field>
            <Field label={t("common.description")}>
              <input
                className={inputClass}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("payments.defaultDesc")}
              />
            </Field>
            <Field label={t("tontines.provider")}>
              <input className={inputClass} value={provider} readOnly />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Btn
                variant="secondary"
                disabled={busyFee}
                onClick={() => void refreshFee()}
              >
                {busyFee ? t("payments.calc") : t("payments.simFees")}
              </Btn>
              <Btn
                disabled={
                  action.busy ||
                  !provider ||
                  !phone.trim() ||
                  Number(amount) < 1
                }
                onClick={initiate}
              >
                {action.busy ? t("payments.sending") : t("payments.payNow")}
              </Btn>
            </div>
            {feeMsg && <p className="text-sm text-amber-800">{feeMsg}</p>}
            {feeLive && (
              <pre className="overflow-auto rounded-xl bg-brand-50 p-3 text-xs">
                {JSON.stringify(feeLive, null, 2)}
              </pre>
            )}
          </div>
        </Panel>
      </div>

      {lastTx && (
        <Panel title={t("payments.lastTx")}>
          <div className="flex flex-wrap items-center gap-2">
            {lastTx.status ? (
              <Badge tone={statusTone(lastTx.status)}>{lastTx.status}</Badge>
            ) : null}
            <span className="text-sm text-brand-800">
              {lastTx.amount} {lastTx.currency} · {lastTx.provider}
            </span>
            <code className="text-xs text-brand-600">{lastTx.id}</code>
          </div>
          <div className="mt-3 flex gap-2">
            <Btn variant="secondary" onClick={loadTx}>
              {t("payments.seeStatus")}
            </Btn>
            <Btn onClick={refreshTx}>{t("payments.refreshProvider")}</Btn>
          </div>
          <pre className="mt-3 max-h-48 overflow-auto rounded-xl bg-brand-50 p-3 text-xs">
            {JSON.stringify(lastTx, null, 2)}
          </pre>
        </Panel>
      )}

      {preview.data != null ? (
        <Panel title={t("payments.feeRef")}>
          <pre className="overflow-auto rounded-xl bg-brand-50 p-3 text-xs">
            {JSON.stringify(preview.data, null, 2)}
          </pre>
        </Panel>
      ) : null}
    </div>
  );
}
