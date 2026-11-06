/** Partage adapté Afrique — Web Share API, WhatsApp, SMS. */

import { nativeShare } from "@/lib/native";

export function africaShareLinks(text: string, url: string) {
  const body = text.trim();
  const link = url.trim();
  const full =
    !link || body.includes(link)
      ? body
      : `${body}\n${link}`.trim();
  const encoded = encodeURIComponent(full);
  return {
    full,
    url: link,
    whatsapp: `https://wa.me/?text=${encoded}`,
    sms: `sms:?&body=${encoded}`,
  };
}

/** Texte API Nest (déjà `message + url`) ou corps + lien séparés. */
export function resolveInviteShare(input: {
  apiShare?: {
    text?: string;
    url?: string;
    whatsappUrl?: string;
    smsUrl?: string;
  } | null;
  body?: string;
  inviteLink: string;
}): {
  inviteLink: string;
  full: string;
  whatsapp: string;
  sms: string;
} {
  const inviteLink = input.inviteLink.trim();
  const api = input.apiShare;
  if (api?.text?.trim()) {
    const full = api.text.trim();
    const encoded = encodeURIComponent(full);
    return {
      inviteLink: api.url?.trim() || inviteLink,
      full,
      whatsapp:
        api.whatsappUrl?.trim() ||
        `https://wa.me/?text=${encoded}`,
      sms: api.smsUrl?.trim() || `sms:?&body=${encoded}`,
    };
  }
  const built = africaShareLinks(input.body ?? "", inviteLink);
  return {
    inviteLink,
    full: built.full,
    whatsapp: built.whatsapp,
    sms: built.sms,
  };
}

export async function copyToClipboard(text: string): Promise<boolean> {
  const value = text.trim();
  if (!value) return false;
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* fallback */
  }
  try {
    if (typeof document === "undefined") return false;
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "true");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export async function copyShareText(text: string): Promise<boolean> {
  return copyToClipboard(text);
}

/** Share sheet système (Android/iOS) avec repli copie. */
export async function africaNativeShare(input: {
  title?: string;
  text: string;
  url: string;
}): Promise<"shared" | "copied" | "aborted" | "failed"> {
  return nativeShare({
    title: input.title ?? "Akiba One",
    text: input.text,
    url: input.url,
  });
}

export function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}
