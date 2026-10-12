type Translate = (
  path: string,
  params?: Record<string, string | number>,
) => string;

function text(
  data: Record<string, unknown> | null | undefined,
  keys: string[],
): string {
  for (const key of keys) {
    const value = data?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function money(data: Record<string, unknown> | null | undefined): string {
  const amount = text(data, ["amount"]);
  const currency = text(data, ["currency"]);
  return [amount, currency].filter(Boolean).join(" ");
}

/** Titre et phrase d’un message système, dans la langue de l’interface. */
export function systemEventCopy(
  t: Translate,
  eventType?: string | null,
  eventData?: Record<string, unknown> | null,
  fallback?: string,
): { title: string; body: string } {
  const name = text(eventData, ["userName", "actorName", "name"]);
  const sum = money(eventData);
  const round = text(eventData, ["roundIndex"]) || "—";
  const percent = text(eventData, ["percent", "milestone"]) || "0";
  const circle = text(eventData, ["tontineTitle", "title"]) || t("chat.sysCircle");
  const count = text(eventData, ["eventCount"]) || "0";

  switch (eventType) {
    case "room_created":
      return { title: t("chat.sysRoomTitle"), body: t("chat.sysRoom") };
    case "participant_joined":
      return {
        title: t("chat.sysJoinTitle"),
        body: name ? t("chat.sysJoin", { name }) : t("chat.sysJoinAnon"),
      };
    case "participant_left":
      return {
        title: t("chat.sysLeaveTitle"),
        body: name ? t("chat.sysLeave", { name }) : t("chat.sysLeaveAnon"),
      };
    case "cotisation_new":
      return {
        title: t("chat.sysPayTitle"),
        body: name
          ? t("chat.sysPay", { name, amount: sum })
          : t("chat.sysPayAnon", { amount: sum }),
      };
    case "cotisation_confirmed":
      return { title: t("chat.sysOkTitle"), body: t("chat.sysOk", { amount: sum }) };
    case "milestone_reached":
      return { title: t("chat.sysStepTitle"), body: t("chat.sysStep", { percent }) };
    case "goal_reached":
      return { title: t("chat.sysGoalTitle"), body: t("chat.sysGoal") };
    case "commitment":
      return {
        title: t("chat.sysDealTitle"),
        body: name
          ? t("chat.sysDeal", { name, amount: sum })
          : t("chat.sysDealAnon", { amount: sum }),
      };
    case "contribution_closed":
      return { title: t("chat.sysCloseTitle"), body: t("chat.sysClose") };
    case "tontine_round_paid":
      return {
        title: t("chat.sysRoundTitle"),
        body: t("chat.sysRound", { round, amount: sum }),
      };
    case "tontine_defaulted":
      return { title: t("chat.sysMissTitle"), body: t("chat.sysMiss", { round }) };
    case "tontine_round_completed":
      return {
        title: t("chat.sysRoundDoneTitle"),
        body: t("chat.sysRoundDone", { round }),
      };
    case "tontine_completed":
      return { title: t("chat.sysDoneTitle"), body: t("chat.sysDone", { name: circle }) };
    case "daily_summary":
      return { title: t("chat.sysDayTitle"), body: t("chat.sysDay", { n: count }) };
    default:
      return {
        title: t("chat.sysOtherTitle"),
        body: fallback?.trim() || t("chat.sysOther"),
      };
  }
}
