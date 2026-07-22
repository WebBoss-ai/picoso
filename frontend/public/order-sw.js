// Service Worker: polls for new orders and notifies even when admin tab is in background
let knownOrderIds = null;
let apiBase = 'https://picoso.in/api';
let adminToken = null;
let pollTimer = null;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('message', (event) => {
  const { type, token, base } = event.data || {};
  if (type === 'INIT_ORDER_WATCHER') {
    if (base) apiBase = base;
    if (token) adminToken = token;
    startPolling();
  }
  if (type === 'STOP_ORDER_WATCHER') {
    stopPolling();
  }
  if (type === 'UPDATE_TOKEN') {
    adminToken = token;
  }
});

function startPolling() {
  stopPolling();
  poll();
  pollTimer = setInterval(poll, 6000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function poll() {
  if (!adminToken) return;
  try {
    const res = await fetch(`${apiBase}/admin/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    const orders = data.orders || [];
    const currentIds = new Set(orders.map((o) => o._id));

    if (knownOrderIds === null) {
      knownOrderIds = currentIds;
      return;
    }

    const freshOrders = orders.filter((o) => !knownOrderIds.has(o._id));
    knownOrderIds = currentIds;

    if (freshOrders.length === 0) return;

    // Tell all open clients to play the alarm
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    clients.forEach((client) =>
      client.postMessage({ type: 'NEW_ORDER', count: freshOrders.length })
    );

    // Show a browser notification (works even if the admin tab is minimised or behind another tab)
    if (self.registration.showNotification) {
      await self.registration.showNotification(
        `🔔 ${freshOrders.length} New Order${freshOrders.length > 1 ? 's' : ''}!`,
        {
          body: freshOrders
            .map((o) => `#${o._id.slice(-6).toUpperCase()} — ₹${(o.totalPrice || 0) + (o.deliveryFee || 0)}`)
            .join('\n'),
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'new-order',
          renotify: true,
          requireInteraction: true,
          vibrate: [300, 100, 300, 100, 300],
        }
      );
    }
  } catch (_) {
    // network error — silently skip
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const adminClient = clients.find((c) => c.url.includes('/admin'));
      if (adminClient) return adminClient.focus();
      return self.clients.openWindow('/admin');
    })
  );
});
