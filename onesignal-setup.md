# OneSignal Setup for TaskMaster Pro

## Why OneSignal?
- ✅ Actually works on iOS PWAs (unlike native Web Notifications)
- ✅ Free tier: 10,000 web push subscribers
- ✅ Works across all platforms (iOS, Android, Web)
- ✅ Rich notifications with images and action buttons
- ✅ Scheduled notifications
- ✅ User segmentation and targeting

## Setup Steps

### 1. Create OneSignal Account
1. Go to https://onesignal.com
2. Sign up for free account
3. Create a new app
4. Choose "Web Push" platform

### 2. Add OneSignal to Your App

Add to your `index.html` before closing `</head>`:

```html
<script src="https://cdn.onesignal.com/sdks/OneSignalSDK.js" async=""></script>
<script>
  window.OneSignal = window.OneSignal || [];
  OneSignal.push(function() {
    OneSignal.init({
      appId: "YOUR_APP_ID_HERE", // Get this from OneSignal dashboard
      safari_web_id: "web.onesignal.auto.YOUR_SAFARI_ID", // For Safari/iOS
      notifyButton: {
        enable: true,
      },
      allowLocalhostAsSecureOrigin: true, // For testing
    });
  });
</script>
```

### 3. Update Your JavaScript (todo.js)

Replace your current notification functions with:

```javascript
// OneSignal iOS-compatible notifications
function setupOneSignalNotifications() {
  OneSignal.push(function() {
    // Check if user is subscribed
    OneSignal.isPushNotificationsEnabled(function(isEnabled) {
      if (isEnabled) {
        console.log("Push notifications are enabled!");
        updateNotificationStatus("enabled");
      } else {
        console.log("Push notifications are not enabled yet.");
        updateNotificationStatus("disabled");
      }
    });
  });
}

function requestOneSignalPermission() {
  OneSignal.push(function() {
    OneSignal.showSlidedownPrompt().then(function() {
      console.log("OneSignal prompt shown");
    });
  });
}

function sendOneSignalNotification(title, message, url = null) {
  // This sends a notification to the current user
  OneSignal.push(function() {
    OneSignal.getExternalUserId().then(function(userId) {
      if (userId) {
        // Send notification via OneSignal REST API
        // (You'll need to implement server-side for this)
        console.log("Would send notification:", title, message);
      }
    });
  });
}

// For task reminders, use OneSignal's scheduling
function scheduleTaskReminder(task) {
  OneSignal.push(function() {
    OneSignal.sendTag("task_" + task.id, {
      title: task.task,
      message: task.msg,
      due_time: task.time,
      reminder_minutes: task.reminderMinutes || 0
    });
  });
}
```

### 4. iOS PWA Configuration

Add to your `manifest.json`:

```json
{
  "gcm_sender_id": "482941778795",
  "onesignal_app_id": "YOUR_APP_ID_HERE"
}
```

### 5. Service Worker Integration

OneSignal will handle the service worker automatically, but you can customize it:

```javascript
// In your existing sw.js, add OneSignal import
importScripts('https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js');
```

## Benefits Over Native Web Notifications

### Current Issues with Native API:
- ❌ iOS Safari blocks most notification prompts
- ❌ PWA notifications often don't work on iOS
- ❌ No scheduled notifications
- ❌ Limited customization
- ❌ Poor reliability across devices

### OneSignal Advantages:
- ✅ Works reliably on iOS Safari and PWAs
- ✅ Scheduled notifications
- ✅ Rich media (images, buttons)
- ✅ Cross-platform consistency
- ✅ Analytics and targeting
- ✅ Automatic retry logic
- ✅ Professional notification management

## Next Steps

1. **Sign up**: Create OneSignal account
2. **Get App ID**: Copy from OneSignal dashboard
3. **Update code**: Replace notification functions
4. **Test**: Deploy and test on iOS device
5. **Enhance**: Add scheduling, targeting, analytics

## Alternative Libraries

If OneSignal doesn't work for you:

1. **Firebase FCM**: More complex but very powerful
2. **Pusher Beams**: Simpler API, good docs
3. **Web Push Protocol**: Raw implementation, most work
4. **Notification API Polyfills**: Limited iOS support

## Cost

- **OneSignal Free**: 10,000 web subscribers
- **Paid plans**: Start at $9/month for more features
- **For personal projects**: Free tier is plenty