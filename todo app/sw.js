const CACHE_NAME = 'todo-app-v1';
const urlsToCache = [
  './',
  './index.html',
  './todo.js',
  './manifest.json'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch files from cache
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Activate Service Worker and update cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Handle background sync for notifications
self.addEventListener('sync', event => {
  if (event.tag === 'todo-reminder') {
    event.waitUntil(checkReminders());
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll().then(clientList => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('./');
    })
  );
});

// Function to check reminders (placeholder)
function checkReminders() {
  // This would normally check for due tasks and send notifications
  // For now, it's a placeholder since task checking happens in the main app
  return Promise.resolve();
}