/// <reference lib="webworker" />
/* Custom SW extras — push riche, sync, periodic */

declare const self: ServiceWorkerGlobalScope & {
  registration: ServiceWorkerRegistration;
};

self.addEventListener("push", (event) => {
  let title = "Akiba One";
  let body = "";
  let url = "/app/notifications";
  let tag = "akiba";
  let actions: Array<{ action: string; title: string }> = [];
  try {
    const data = event.data?.json() as {
      title?: string;
      body?: string;
      message?: string;
      url?: string;
      contributionId?: string;
      tontineId?: string;
      roomId?: string;
      tag?: string;
      actions?: Array<{ action: string; title: string }>;
    };
    if (data?.title) title = data.title;
    body = data?.body || data?.message || "";
    if (data?.url) url = data.url;
    else if (data?.contributionId)
      url = `/app/contributions/${data.contributionId}`;
    else if (data?.tontineId) url = `/app/tontines/${data.tontineId}`;
    else if (data?.roomId) url = `/app/chat?room=${data.roomId}`;
    if (data?.tag) tag = data.tag;
    actions = data?.actions ?? [
      { action: "open", title: "Ouvrir" },
      { action: "dismiss", title: "Plus tard" },
    ];
  } catch {
    body = event.data?.text() || "";
  }
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag,
      renotify: true,
      vibrate: [40, 60, 40],
      data: { url },
      actions,
    } as NotificationOptions),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const url =
    (event.notification.data as { url?: string } | undefined)?.url ||
    "/app/notifications";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const c of clients) {
          if ("focus" in c) {
            void c.navigate?.(url);
            return c.focus();
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});

self.addEventListener("notificationclose", () => {
  /* analytics hook possible */
});

self.addEventListener("sync", (event) => {
  const e = event as Event & { tag?: string; waitUntil: (p: Promise<unknown>) => void };
  if (e.tag === "akiba-offline-sync") {
    e.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        for (const c of clients) {
          c.postMessage({ type: "AKIBA_FLUSH_SYNC" });
        }
      }),
    );
  }
});

self.addEventListener("periodicsync", (event) => {
  const e = event as Event & { tag?: string; waitUntil: (p: Promise<unknown>) => void };
  if (e.tag === "akiba-periodic-sync") {
    e.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        for (const c of clients) {
          c.postMessage({ type: "AKIBA_PERIODIC_SYNC" });
        }
      }),
    );
  }
});

self.addEventListener("message", (event) => {
  const data = event.data as { type?: string } | string | null;
  if (data === "SKIP_WAITING" || (data && typeof data === "object" && data.type === "SKIP_WAITING")) {
    void self.skipWaiting();
  }
});

export {};
