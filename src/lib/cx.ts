/** Concatène des classes Tailwind en ignorant les valeurs fausses. */
export function cx(...parts: Array<string | false | undefined | null>): string {
  return parts.filter(Boolean).join(" ");
}
