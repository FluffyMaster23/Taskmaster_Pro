# Notification test guide

## Test ntfy delivery with the browser closed

Follow [NTFY-SETUP.txt](NTFY-SETUP.txt) and deploy the scheduled function first.

1. Install ntfy on the phone and subscribe to the configured topic.
2. Sign in to TaskMaster Pro, allow ntfy reminders in Options, and save the settings.
3. Create and save a Firestore task with an advance reminder and due time a few minutes
   ahead.
4. Close the TaskMaster Pro page and browser while keeping the phone online.
5. Confirm the ntfy app receives the advance reminder and due alert.

The schedule runs once per minute and uses a five-minute delivery grace window.
Guest/local-only tasks are not available to the server scheduler.

## Foreground browser notification check

When the app is open and browser notification permission is granted, run this in the
browser console to verify local browser notifications:

```javascript
if (Notification.permission === 'granted') {
  new Notification('TaskMaster Pro test', {
    body: 'Browser notification display is working.',
    icon: './favicon.ico'
  });
} else {
  console.log('Notification permission:', Notification.permission);
}
```

For scheduled delivery failures, check Firebase Function logs, the account's
`notificationSettings` fields in Firestore, and the ntfy app subscription.
