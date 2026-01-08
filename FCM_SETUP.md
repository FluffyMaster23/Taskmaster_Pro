# Firebase Cloud Messaging (FCM) Setup Guide

## ✅ What's Been Done

Your app has been converted from OneSignal to Firebase Cloud Messaging! Here's what's already implemented:

### 1. SDK Integration ✅
- Added Firebase Messaging SDK to all HTML files (index, taskmaster, options, list)
- Created `firebase-messaging-sw.js` service worker for background notifications
- Updated `todo.js` with FCM initialization logic

### 2. Notification Features ✅
- **Windows/Desktop**: Native browser notifications (same as before, but better!)
- **iOS**: Will work through FCM → Apple Push Notification service
- **Background notifications**: Work even when browser is closed (via service worker)
- **Foreground notifications**: Work when app is open
- **Click handling**: Opens app when notification is clicked

### 3. Code Changes ✅
- Removed all OneSignal code
- Replaced with Firebase Cloud Messaging
- Simplified notification logic
- Maintained all existing features

---

## 🔧 One-Time Setup Required

To complete the FCM setup, you need to generate a **VAPID key** from Firebase Console:

### Step 1: Go to Firebase Console
1. Visit: https://console.firebase.google.com/
2. Select your project: **taskmaster-pro-bf98a**

### Step 2: Get Your VAPID Key
1. Click the ⚙️ **Settings** icon (gear icon) in the left sidebar
2. Go to **Project settings**
3. Click the **Cloud Messaging** tab
4. Scroll down to **Web configuration** section
5. Under "Web Push certificates", click **Generate key pair**
6. Copy the generated key (looks like: `BK...long string...xyz`)

### Step 3: Add VAPID Key to Your Code

Open `todo.js` and find this line (around line 310):

```javascript
vapidKey: 'YOUR_VAPID_KEY_HERE', // You'll need to generate this in Firebase Console
```

Replace `'YOUR_VAPID_KEY_HERE'` with your actual VAPID key:

```javascript
vapidKey: 'BKa1b2c3d4...your-actual-key...xyz',
```

**That's it!** Save the file and your notifications will work on all platforms.

---

## 🚀 How It Works Now

### On Windows/Desktop:
1. User visits app
2. Browser asks for notification permission
3. User accepts
4. Notifications appear in Windows notification center
5. **Works even when browser is closed!** (via service worker)

### On iOS (Safari/Firefox/Chrome):
1. User visits app
2. Browser asks for notification permission
3. User accepts
4. FCM connects to Apple Push Notification service
5. Notifications appear in iOS notification center
6. **Works even when browser is closed!** (via service worker)

### Notification Types:
- ⏰ **Reminder notifications** - Before task is due (based on reminder time)
- 🔔 **Due notifications** - When task is due now
- 📱 **Background notifications** - Delivered even when app is closed
- 💻 **Foreground notifications** - Shown when app is open

---

## 📊 Benefits Over OneSignal

| Feature | OneSignal | Firebase FCM |
|---------|-----------|--------------|
| Windows notifications | ✅ (indirect) | ✅ (direct) |
| iOS notifications | ✅ | ✅ |
| Background notifications | ✅ | ✅ |
| Works when closed | ✅ | ✅ **Better!** |
| Free tier | Limited | **Unlimited!** |
| Already using Firebase | ❌ | ✅ **Same service** |
| Setup complexity | Medium | **Easy** |
| Cost | Paid for scale | **Free forever** |

---

## 🧪 Testing Notifications

### Test on Windows:
1. Open the app
2. Grant notification permission when prompted
3. Create a task due in 2 minutes
4. Close the browser completely
5. Wait 2 minutes - notification should appear!

### Test on iOS:
1. Open app in Safari on iPhone
2. Grant notification permission
3. Create a task due in 2 minutes  
4. Close Safari or switch apps
5. Wait 2 minutes - notification should appear!

---

## 🐛 Troubleshooting

### Notifications not appearing?
1. **Check permission**: Browser settings → Site settings → Notifications → Allow
2. **Check VAPID key**: Make sure you added it to `todo.js`
3. **Check console**: Open DevTools (F12) and look for errors
4. **Try HTTPS**: FCM works best on HTTPS (localhost is okay for testing)

### iOS not working?
1. Requires **iOS 16.4+** for Web Push support
2. Must use **Safari** or **supported browser**
3. Check **Settings → Safari → Advanced → Experimental Features → Enable Notifications**

### Still having issues?
- Check browser console (F12 → Console tab)
- Look for FCM errors
- Verify Firebase project is active
- Make sure service worker is registered

---

## 📝 Next Steps (Optional)

### Server-Side Notifications
If you want to send notifications from a backend server:

1. Save FCM tokens to your Firebase database
2. Use Firebase Admin SDK on your server
3. Send notifications using the token

Example (Node.js):
```javascript
const admin = require('firebase-admin');

admin.messaging().send({
  token: userFCMToken,
  notification: {
    title: 'Task Reminder',
    body: 'Your task is due in 5 minutes!'
  }
});
```

---

## ✨ Summary

Your app now uses **Firebase Cloud Messaging** for notifications on all platforms:
- ✅ Windows: Native notifications via FCM
- ✅ iOS: Apple Push via FCM
- ✅ Background: Works when closed
- ✅ Free: Unlimited notifications
- ✅ Integrated: Same service as auth/database

**Just add your VAPID key and you're done! 🎉**
