/// <reference lib="webworker" />
/* Custom SW extras (push) — mergé par @ducanh2912/next-pwa */

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("push", (event) => {
  let title = "Akiba One";
  let body = "";
  let url = "/app/notifications";
  try {
    const data = event.data?.json() as {
      title?: string;
      body?: string;
      message?: string;
      url?: string;
      contributionId?: string;
      tontineId?: string;
      roomId?: string;
    };
    if (data?.title) title = data.title;
    body = data?.body || data?.message || "";
    if (data?.url) url = data.url;
    else if (data?.contributionId)
      url = `/app/contributions/${data.contributionId}`;
    else if (data?.tontineId) url = `/app/tontines/${data.tontineId}`;
    else if (data?.roomId) url = `/app/chat?room=${data.roomId}`;
  } catch {
    body = event.data?.text() || "";
  }
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon.png",
      badge: "/icon.png",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url =
    (event.notification.data as { url?: string } | undefined)?.url ||
    "/app/notifications";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
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

export {};
