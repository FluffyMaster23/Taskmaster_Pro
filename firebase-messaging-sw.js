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
          const targetUrl = new URL('taskmaster.html', self.registration.scope).href;
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// === BACKGROUND TASK CHECKING ===
// Store tasks in memory (sent from main app)
let cachedTasks = [];

// Listen for task updates from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'UPDATE_TASKS') {
    cachedTasks = event.data.tasks || [];
    // Immediately check for due tasks
    checkTasksAndNotify();
  } else if (event.data && event.data.type === 'CHECK_TASKS') {
    checkTasksAndNotify();
  }
});

// Check tasks periodically (every minute when SW wakes up)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-tasks') {
    event.waitUntil(checkTasksAndNotify());
  }
});

// Check on service worker activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim()
  );
});

// Set up periodic task checking (runs every minute in background)
setInterval(() => {
  checkTasksAndNotify();
}, 60000); // Check every minute

// Track notified tasks to avoid duplicates
const notifiedTaskIds = new Set();
const reminderTaskIds = new Set();

async function checkTasksAndNotify() {
  try {
    const now = new Date();
    
    cachedTasks.forEach(task => {
      const due = new Date(task.time);
      const timeDiff = due - now;
      const reminderMinutes = task.reminderMinutes || 0;
      const reminderTime = reminderMinutes * 60 * 1000;
      
      // Check if task is due now (within 1 minute window)
      if (timeDiff <= 60000 && timeDiff >= -60000 && !notifiedTaskIds.has(task.id)) {
        notifiedTaskIds.add(task.id);
        showTaskNotification(task, false);
      }
      // Check if reminder should be sent
      else if (reminderMinutes > 0 && timeDiff <= reminderTime && timeDiff > reminderTime - 60000 && !reminderTaskIds.has(task.id)) {
        reminderTaskIds.add(task.id);
        showTaskNotification(task, true);
      }
    });
  } catch (error) {
    console.error('[SW] Error checking tasks:', error);
  }
}

async function getTasksFromStorage() {
  // Return cached tasks (sent from main app)
  return cachedTasks;
}

function showTaskNotification(task, isReminder) {
  const title = isReminder ? `⏰ Reminder: ${task.task}` : `🔔 Task Due: ${task.task}`;
  const body = isReminder 
    ? `Due in ${task.reminderMinutes} minutes` 
    : 'This task is due now!';
  
  self.registration.showNotification(title, {
    body: body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: `task-${task.id}`,
    requireInteraction: !isReminder,
    vibrate: [200, 100, 200],
    data: { taskId: task.id, task: task },
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
  });
}
