// Firebase Cloud Messaging Service Worker
// This handles background notifications when the browser/app is closed

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
const firebaseConfig = {
  apiKey: "AIzaSyC1S6U4E_IIAw5csnapl8ZoIyBS_Lv5k2A",
  authDomain: "taskmaster-pro-bf98a.firebaseapp.com",
  projectId: "taskmaster-pro-bf98a",
  storageBucket: "taskmaster-pro-bf98a.firebasestorage.app",
  messagingSenderId: "47778628154",
  appId: "1:47778628154:web:eddd6a64147d917fcb6b03",
  measurementId: "G-JERNL4E72Z"
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'TaskMaster Pro';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'You have a new notification',
    icon: payload.notification?.icon || '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.data?.tag || 'taskmaster-notification',
    requireInteraction: payload.data?.requireInteraction === 'true',
    data: payload.data,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'Open Task'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    // Just close the notification
    return;
  }
  
  // Open the app or focus existing window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a TaskMaster window is already open, focus it
        for (const client of clientList) {
          if (client.url.includes('taskmaster') && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise, open a new window
        if (clients.openWindow) {
          return clients.openWindow('/taskmaster.html');
        }
      })
  );
});
