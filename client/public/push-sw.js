self.addEventListener('push', (event) => {
  const data = event.data.json();
  const title = data.title || 'Kryonex Notification';
  const options = {
    body: data.body || 'New update available!',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      url: self.location.origin + '/portal'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
