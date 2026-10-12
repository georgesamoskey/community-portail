type Translate = (
  path: string,
  params?: Record<string, string | number>,
) => string;

type EventData = Record<string, unknown> | null | undefined;

function text(data: EventData, keys: string[]): string {
  for (const key of keys) {
    const value = data?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function money(data: EventData): string {
  const amount = text(data, ["amount", "principal"]);
  const currency = text(data, ["currency"]);
  return [amount, currency].filter(Boolean).join(" ");
}

/** Type affiché : un ancien événement ASCA générique redevient le vrai fait. */
export function resolveSystemEvent(
  eventType?: string | null,
  eventData?: EventData,
): string {
  const kind = text(eventData, ["kind"]);
  if (kind === "loan_requested") return "asca_loan_requested";
  if (kind === "loan_disburse_requested") return "asca_loan_sending";
  if (kind === "loan_disbursed") return "asca_loan_disbursed";
  if (kind === "deposit") return "asca_deposit";
  if (kind === "loan_repayment") return "asca_loan_repaid";
  if (kind === "loan_defaulted") return "asca_loan_defaulted";
  if (kind === "cycle_opened") return "asca_cycle_opened";
  if (kind === "cycle_closed") return "asca_cycle_closed";
  if (eventData?.asca === true && eventType === "tontine_round_completed") {
    return "openNext" in (eventData ?? {})
      ? "asca_cycle_closed"
      : "asca_cycle_opened";
  }
  return eventType ?? "";
}

function ascaCopy(
  t: Translate,
  fact: string,
  data: EventData,
): { title: string; body: string } | null {
  const sum = money(data);
  const cycle = text(data, ["cycleIndex", "roundIndex"]) || "1";
  if (fact === "asca_cycle_opened") {
    return {
      title: t("chat.sysCycleOpenTitle"),
      body: t("chat.sysCycleOpen", { cycle }),
    };
  }
  if (fact === "asca_cycle_closed") {
    const next = data?.openNext === true;
    return {
      title: t("chat.sysCycleCloseTitle"),
      body: next
        ? t("chat.sysCycleNext", { cycle })
        : t("chat.sysCycleClose", { cycle }),
    };
  }
  if (fact === "asca_loan_requested") {
    return {
      title: t("chat.sysLoanAskTitle"),
      body: sum ? t("chat.sysLoanAsk", { amount: sum }) : t("chat.sysLoanAskTitle"),
    };
  }
  if (fact === "asca_loan_sending") {
    return {
      title: t("chat.sysLoanSendTitle"),
      body: sum ? t("chat.sysLoanSend", { amount: sum }) : t("chat.sysLoanSendTitle"),
    };
  }
  if (fact === "asca_loan_disbursed") {
    return {
      title: t("chat.sysLoanOutTitle"),
      body: sum ? t("chat.sysLoanOut", { amount: sum }) : t("chat.sysLoanOutTitle"),
    };
  }
  if (fact === "asca_deposit") {
    return {
      title: t("chat.sysDepositTitle"),
      body: sum ? t("chat.sysDeposit", { amount: sum }) : t("chat.sysDepositTitle"),
    };
  }
  if (fact === "asca_loan_repaid") {
    const settled = data?.settled === true;
    return {
      title: t("chat.sysRepayTitle"),
      body: settled
        ? t("chat.sysRepayDone", { amount: sum })
        : t("chat.sysRepay", { amount: sum }),
    };
  }
  if (fact === "asca_loan_defaulted") {
    return {
      title: t("chat.sysLoanMissTitle"),
      body: t("chat.sysLoanMiss"),
    };
  }
  return null;
}

/** Titre et phrase d’un message système, dans la langue de l’interface. */
export function systemEventCopy(
  t: Translate,
  eventType?: string | null,
  eventData?: EventData,
  fallback?: string,
): { title: string; body: string } {
  const fact = resolveSystemEvent(eventType, eventData);
  const asca = ascaCopy(t, fact, eventData);
  if (asca) return asca;

  const name = text(eventData, ["userName", "actorName", "name"]);
  const sum = money(eventData);
  const round = text(eventData, ["roundIndex"]) || "—";
  const percent = text(eventData, ["percent", "milestone"]) || "0";
  const circle = text(eventData, ["tontineTitle", "title"]) || t("chat.sysCircle");
  const count = text(eventData, ["eventCount"]) || "0";

  switch (fact) {
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
