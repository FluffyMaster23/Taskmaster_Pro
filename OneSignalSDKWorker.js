// OneSignal Service Worker for iOS background notifications
importScripts('https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js');

// Handle background sync for task reminders
self.addEventListener('sync', event => {
  if (event.tag === 'taskmaster-reminder') {
    event.waitUntil(checkScheduledTasks());
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  // Open the app when notification is clicked
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      // If app is already open, focus it
      for (let client of clientList) {
        if (client.url.includes('Taskmaster_Pro') && 'focus' in client) {
          return client.focus();
        }
      }
      // If app is not open, open it
      if (clients.openWindow) {
        return clients.openWindow('/Taskmaster_Pro/');
      }
    })
  );
});

// Check scheduled tasks for background notifications
async function checkScheduledTasks() {
  try {
    // This would normally check localStorage, but service workers have limited access
    // OneSignal handles the actual background delivery
    return Promise.resolve();
  } catch (error) {
    console.error('Error checking scheduled tasks:', error);
    return Promise.resolve();
  }
}