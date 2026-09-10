importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyC1S6U4E_IIAw5csnapl8ZoIyBS_Lv5k2A",
  authDomain: "taskmaster-pro-bf98a.firebaseapp.com",
  projectId: "taskmaster-pro-bf98a",
  storageBucket: "taskmaster-pro-bf98a.firebasestorage.app",
  messagingSenderId: "47778628154",
  appId: "1:47778628154:web:eddd6a64147d917fcb6b03"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "TaskMaster Pro";
  const options = {
    body: payload.notification?.body || payload.data?.body || "You have a TaskMaster Pro reminder.",
    tag: payload.data?.tag || "taskmaster",
    data: payload.data || {},
    requireInteraction: false
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
    for (const client of clientList) {
      if ("focus" in client) return client.focus();
    }
    if (clients.openWindow) return clients.openWindow("./taskmaster.html");
  }));
});
