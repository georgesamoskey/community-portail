const QUERY = /(^|[\s])@([\p{L}0-9._\-]*)$/u;

/** Prénom, ou prénom+nom collés si le prénom est trop court pour @. */
export function mentionHandle(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  if (/^[\p{L}0-9._-]{2,32}$/u.test(first)) return first;
  const compact = parts.join("").slice(0, 32);
  return compact.length >= 2 ? compact : first.slice(0, 32);
}

/** Texte après le dernier @ en fin de saisie, ou null si pas de mention en cours. */
export function mentionQuery(draft: string): string | null {
  const match = QUERY.exec(draft);
  return match ? match[2] : null;
}

export function insertMention(draft: string, name: string): string {
  const handle = mentionHandle(name);
  if (!handle) return draft;
  return draft.replace(/@([\p{L}0-9._\-]*)$/u, `@${handle} `);
}
