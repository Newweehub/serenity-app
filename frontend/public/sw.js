self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || '🌿 Serenity', {
      body:  data.body  || "Time to check in on your habits.",
      icon:  '/icon.png',
      badge: '/icon.png',
      data:  { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});