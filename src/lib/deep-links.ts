/**
 * Mapping deep links natifs (DeepLinkResolver / NotificationRouteResolver)
 * → routes portail.
 */

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function portalPathFromNativeDeepLink(
  pathname: string,
  search = "",
): string | null {
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

  // /c/:id[/cotiser]
  if (parts[0] === "c" && parts[1] && UUID.test(parts[1])) {
    const id = parts[1];
    if (parts[2] === "cotiser" || q.get("declare") === "1") {
      return `/app/contributions/${id}?declare=1`;
    }
    const cot = q.get("cotisation");
    return cot
      ? `/app/contributions/${id}?cotisation=${encodeURIComponent(cot)}`
      : `/app/contributions/${id}`;
  }

  // /t/:id[/pay]
  if (parts[0] === "t" && parts[1] && UUID.test(parts[1])) {
    const id = parts[1];
    if (parts[2] === "pay" || q.get("openPay") === "true" || q.get("openPay") === "1") {
      return `/app/tontines/${id}?openPay=1`;
    }
    return `/app/tontines/${id}`;
  }

  // /chat/:roomId
  if (parts[0] === "chat" && parts[1] && UUID.test(parts[1])) {
    return `/app/chat?room=${encodeURIComponent(parts[1])}`;
  }

  // Native-style path aliases already under /app
  if (parts[0] === "declare_cotisation" && parts[1] && UUID.test(parts[1])) {
    return `/app/contributions/${parts[1]}?declare=1`;
  }
  if (parts[0] === "contribution_detail" && parts[1] && UUID.test(parts[1])) {
    return `/app/contributions/${parts[1]}`;
  }
  if (parts[0] === "tontine_detail" && parts[1] && UUID.test(parts[1])) {
    const open =
      q.get("openPay") === "true" || q.get("openPay") === "1" ? "?openPay=1" : "";
    return `/app/tontines/${parts[1]}${open}`;
  }
  if (parts[0] === "chat_room" && parts[1] && UUID.test(parts[1])) {
    return `/app/chat?room=${encodeURIComponent(parts[1])}`;
  }

  return null;
}
