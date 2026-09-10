import { bffFetch } from "@/lib/bff-fetch";

export type RecoTargetType = "contribution" | "tontine" | "user";
export type RecoClientEvent = "click" | "refuse" | "invite_sent";

/** Feedback loop recommandations — best-effort, ne bloque pas l’UI. */
export async function trackRecoEvent(input: {
  targetType: RecoTargetType;
  targetId: string;
  eventType: RecoClientEvent;
  servedScore?: number;
  algorithm?: string;
}): Promise<void> {
  if (!input.targetId) return;
  try {
    await bffFetch("/recommendations/events", {
      method: "POST",
      body: JSON.stringify({
        targetType: input.targetType,
        targetId: input.targetId,
        eventType: input.eventType,
        servedScore: input.servedScore,
        algorithm: input.algorithm,
      }),
    });
  } catch {
    /* ignore */
  }
}
