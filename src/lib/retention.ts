/** Petits helpers rétention côté client (localStorage). */

const CHECKLIST_KEY = "community-portal:onboarding-v1";
const LAST_VISIT_KEY = "community-portal:last-visit";

export type OnboardingKey =
  | "joined_chat"
  | "opened_tontine"
  | "paid_or_cotised"
  | "invited_someone";

export type OnboardingTitleKey =
  | "stepChat"
  | "stepTontine"
  | "stepPay"
  | "stepInvite";

export function loadChecklist(): Record<OnboardingKey, boolean> {
  if (typeof window === "undefined") {
    return {
      joined_chat: false,
      opened_tontine: false,
      paid_or_cotised: false,
      invited_someone: false,
    };
  }
  try {
    const raw = localStorage.getItem(CHECKLIST_KEY);
    if (!raw) {
      return {
        joined_chat: false,
        opened_tontine: false,
        paid_or_cotised: false,
        invited_someone: false,
      };
    }
    return { ...JSON.parse(raw) } as Record<OnboardingKey, boolean>;
  } catch {
    return {
      joined_chat: false,
      opened_tontine: false,
      paid_or_cotised: false,
      invited_someone: false,
    };
  }
}

export function markChecklist(key: OnboardingKey) {
  if (typeof window === "undefined") return;
  const cur = loadChecklist();
  if (cur[key]) return;
  cur[key] = true;
  localStorage.setItem(CHECKLIST_KEY, JSON.stringify(cur));
}

export function checklistProgress(
  data: Record<OnboardingKey, boolean>,
): { done: number; total: number; pct: number } {
  const keys = Object.keys(data) as OnboardingKey[];
  const done = keys.filter((k) => data[k]).length;
  return { done, total: keys.length, pct: Math.round((done / keys.length) * 100) };
}

export function touchLastVisit(): { daysSince?: number; returning: boolean } {
  if (typeof window === "undefined") return { returning: false };
  const prev = localStorage.getItem(LAST_VISIT_KEY);
  const now = Date.now();
  localStorage.setItem(LAST_VISIT_KEY, String(now));
  if (!prev) return { returning: false };
  const days = Math.floor((now - Number(prev)) / 86400000);
  return { daysSince: days, returning: true };
}

export const ONBOARDING_STEPS: Array<{
  key: OnboardingKey;
  titleKey: OnboardingTitleKey;
  href: string;
}> = [
  { key: "joined_chat", titleKey: "stepChat", href: "/app/chat" },
  {
    key: "opened_tontine",
    titleKey: "stepTontine",
    href: "/app/tontines",
  },
  {
    key: "paid_or_cotised",
    titleKey: "stepPay",
    href: "/app/contributions",
  },
  {
    key: "invited_someone",
    titleKey: "stepInvite",
    href: "/app/invitations",
  },
];
