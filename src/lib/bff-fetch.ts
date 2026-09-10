import { bffApi } from "@/lib/bff";

function requestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const BFF_UNAUTHORIZED_EVENT = "community-portal:bff-unauthorized";

export class BffError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "BffError";
  }
}

function extractMessage(body: string): string | null {
  try {
    const j = JSON.parse(body) as {
      error?: string;
      message?: string | string[];
    };
    if (typeof j.message === "string" && j.message.trim()) return j.message.trim();
    if (Array.isArray(j.message) && j.message[0]) return String(j.message[0]);
    if (j.error === "SESSION_EXPIRED") {
      return "Votre session a expiré. Reconnectez-vous.";
    }
    if (typeof j.error === "string" && j.error.trim()) return j.error.trim();
  } catch {
    /* ignore */
  }
  return null;
}

/** Appel JSON vers le proxy BFF (cookies de session). */
export async function bffFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  headers.set("X-Request-Id", requestId());

  const method = (init?.method ?? "GET").toUpperCase();
  const hasBody = init?.body != null;
  const isJsonBody = typeof init?.body === "string";
  if (
    hasBody &&
    isJsonBody &&
    method !== "GET" &&
    method !== "HEAD" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(bffApi(path), {
      ...init,
      credentials: "include",
      headers,
    });
  } catch (e) {
    const msg =
      e instanceof TypeError
        ? "Impossible de contacter le portail (réseau ou serveur arrêté)."
        : (e as Error).message || "Erreur réseau.";
    throw new BffError(msg, 0, "", "NETWORK_ERROR");
  }

  if (!res.ok) {
    const detail = await res.text();
    if (res.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(BFF_UNAUTHORIZED_EVENT, {
          detail: { message: extractMessage(detail) ?? "Non authentifié" },
        }),
      );
    }
    const fallback =
      res.status === 502
        ? "L’API eagaseke ne répond pas."
        : `Erreur ${res.status}`;
    throw new BffError(
      extractMessage(detail) ?? fallback,
      res.status,
      detail,
    );
  }

  const text = await res.text();
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new BffError(`Réponse non JSON (${res.status})`, res.status, text);
  }
}
