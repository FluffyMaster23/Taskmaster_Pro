const CACHE_NAME = 'todo-app-v19';
const APPLE_REMINDERS_PATH = '/apple-reminders.ics';
const APPLE_REMINDERS_CACHE_KEY = '/__taskmaster_apple_reminders__.ics';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './styles.css',
  './options.html',
  './taskmaster.html'
];

// Install Service Worker
self.addEventListener('install', event => {

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {

        return cache.addAll(urlsToCache);
      })
      .then(() => {

        return self.skipWaiting(); // Activate immediately
      })
  );
});

// Fetch files from cache (same-origin GET only)
self.addEventListener('fetch', event => {
  try {
    const requestUrl = new URL(event.request.url);
    const isSameOrigin = requestUrl.origin === self.location.origin;

    if (event.request.method !== 'GET' || !isSameOrigin) {
      return;
    }

    if (requestUrl.pathname.endsWith(APPLE_REMINDERS_PATH)) {
      event.respondWith(getAppleRemindersResponse());
      return;
    }

    event.respondWith(
      caches.match(event.request)
        .then(response => {
          return response || fetch(event.request);
        })
        .catch(error => {
          console.error('Service Worker: Fetch failed', error);
          return fetch(event.request);
        })
    );
  } catch (error) {
    console.error('Service Worker: Fetch handler error', error);
  }
});

// Activate Service Worker and update cache
self.addEventListener('activate', event => {

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {

            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {

      return self.clients.claim(); // Take control immediately
    })
  );
});

// Handle push notifications (for Firebase/OneSignal)
self.addEventListener('push', event => {

  
  let notificationData = {
    title: 'TaskMaster Pro',
    body: 'You have a task reminder!',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'taskmaster-reminder',
    requireInteraction: false,
    vibrate: [200, 100, 200]
  };
  
  // Try to parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || data.message || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || notificationData.tag,
        requireInteraction: data.requireInteraction || notificationData.requireInteraction,
        vibrate: data.vibrate || notificationData.vibrate,
        data: data.data || {}
      };
    } catch (error) {

    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      vibrate: notificationData.vibrate,
      data: notificationData.data
    }).then(() => {

    }).catch(error => {
      console.error('Service Worker: Could not show notification', error);
    })
  );
});

// Handle background sync for notifications
self.addEventListener('sync', event => {

  if (event.tag === 'todo-reminder') {
    event.waitUntil(checkReminders());
  }

  if (event.tag === 'apple-reminders-sync') {
    event.waitUntil(refreshAppleRemindersFromClients());
  }
});

self.addEventListener('message', event => {
  if (!event.data || typeof event.data !== 'object') {
    return;
  }

  if (event.data.type === 'UPDATE_APPLE_REMINDERS_ICS' && typeof event.data.ics === 'string') {
    event.waitUntil(storeAppleRemindersIcs(event.data.ics));
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {

  event.notification.close();
  
  // Open or focus the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === self.registration.scope && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow('./');
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', event => {

});

// Function to check reminders (placeholder)
function checkReminders() {

  // This would normally check for due tasks and send notifications
  // For now, it's a placeholder since task checking happens in the main app
  return Promise.resolve();
}

async function storeAppleRemindersIcs(icsContent) {
  const cache = await caches.open(CACHE_NAME);
  const response = new Response(icsContent, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
  await cache.put(APPLE_REMINDERS_CACHE_KEY, response);
}

async function getAppleRemindersResponse() {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(APPLE_REMINDERS_CACHE_KEY);
  if (cached) {
    return cached;
  }

  const emptyCalendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'PRODID:-//TaskMaster Pro//Apple Reminders Bridge//EN',
    'METHOD:PUBLISH',
    'END:VCALENDAR',
    ''
  ].join('\r\n');

  await storeAppleRemindersIcs(emptyCalendar);
  return new Response(emptyCalendar, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

async function refreshAppleRemindersFromClients() {
  const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });

  clientList.forEach(client => {
    client.postMessage({ type: 'REQUEST_APPLE_REMINDERS_ICS' });
  });
}
