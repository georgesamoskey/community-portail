import { initialsFrom } from "@/lib/portal-api";

export type MemberLike = {
  id?: string;
  userId?: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  /** Nom complet renvoyé par l’API social / recommandations. */
  displayName?: string | null;
  displayLabel?: string | null;
  email?: string | null;
  avatar?: string | null;
  user?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    fullName?: string | null;
    avatar?: string | null;
    email?: string | null;
  };
};

/** Nom affichable — jamais un UUID si on a mieux. */
export function memberDisplayName(
  input: MemberLike | null | undefined,
  fallback = "Membre",
): string {
  if (!input) return fallback;
  const u = input.user;
  const direct =
    input.displayName?.trim() ||
    input.fullName?.trim() ||
    u?.fullName?.trim() ||
    `${input.firstName ?? u?.firstName ?? ""} ${input.lastName ?? u?.lastName ?? ""}`.trim() ||
    u?.email?.trim() ||
    input.email?.trim();
  if (direct) return direct;
  const label = input.displayLabel?.trim();
  if (label && !/^[0-9a-f-]{8,}$/i.test(label)) return label;
  const uid = input.userId ?? input.id ?? u?.id;
  if (uid && label && label.length <= 3) {
    return fallback;
  }
  return fallback;
}

export function memberAvatarPath(input: MemberLike | null | undefined): string | null {
  if (!input) return null;
  return input.avatar ?? input.user?.avatar ?? null;
}

export function memberInitials(name: string, fallback = "?"): string {
  const i = initialsFrom(name);
  return i || fallback;
}
