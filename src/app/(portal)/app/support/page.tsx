"use client";

import { useState } from "react";
import { useBff } from "@/lib/use-bff";
import { bffFetch, BffError } from "@/lib/bff-fetch";
import { useI18n } from "@/lib/i18n/context";
import {
  Alert,
  Btn,
  Field,
  inputClass,
  PageHeader,
  Panel,
} from "@/lib/ui";

type Ticket = {
  id: string;
  category: string;
  subject: string;
  body: string;
  status: string;
  adminNote?: string | null;
  createdAt: string;
};

export default function SupportPage() {
  const { t } = useI18n();
  const list = useBff<Ticket[]>("/support/tickets/me");
  const [category, setCategory] = useState("other");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      await bffFetch("/support/tickets", {
        method: "POST",
        body: JSON.stringify({ category, subject, body }),
      });
      setSubject("");
      setBody("");
      setOk(t("support.sent"));
      await list.refresh();
    } catch (e) {
      setErr(
        e instanceof BffError
          ? e.message
          : e instanceof Error
            ? e.message
            : t("common.error"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <PageHeader title={t("support.title")} description={t("support.desc")} />

      <Panel>
        <p className="mb-3 text-sm font-semibold text-ink">{t("support.new")}</p>
        {err ? <Alert tone="rose">{err}</Alert> : null}
        {ok ? <Alert tone="teal">{ok}</Alert> : null}
        <div className="space-y-3">
          <Field label={t("support.category")}>
            <select
              className={inputClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="payment">Paiement</option>
              <option value="payout">Décaissement</option>
              <option value="dispute">Litige</option>
              <option value="invitation">Invitation</option>
              <option value="account">Compte</option>
              <option value="other">Autre</option>
            </select>
          </Field>
          <Field label={t("support.subject")}>
            <input
              className={inputClass}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </Field>
          <Field label={t("support.body")}>
            <textarea
              className={inputClass}
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </Field>
          <Btn disabled={busy || subject.length < 3 || body.length < 10} onClick={() => void submit()}>
            {busy ? "…" : t("support.submit")}
          </Btn>
        </div>
      </Panel>

      <Panel>
        <p className="mb-3 text-sm font-semibold">{t("support.mine")}</p>
        <ul className="space-y-3">
          {(list.data ?? []).map((ticket) => (
            <li
              key={ticket.id}
              className="rounded-xl border border-ink/[0.06] px-3 py-2 text-sm"
            >
              <div className="flex gap-2 text-xs text-ink-mute">
                <span className="uppercase">{ticket.category}</span>
                <span>·</span>
                <span>{ticket.status}</span>
              </div>
              <p className="font-semibold text-ink">{ticket.subject}</p>
              <p className="mt-1 text-ink-soft whitespace-pre-wrap">{ticket.body}</p>
              {ticket.adminNote ? (
                <p className="mt-2 rounded-lg bg-mint-50 px-2 py-1 text-xs text-mint-900">
                  {ticket.adminNote}
                </p>
              ) : null}
            </li>
          ))}
          {!list.loading && (list.data?.length ?? 0) === 0 ? (
            <li className="text-sm text-ink-mute">{t("support.empty")}</li>
          ) : null}
        </ul>
      </Panel>
    </div>
  );
}
