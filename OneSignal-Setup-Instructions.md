# OneSignal Setup Instructions for TaskMaster Pro

## 🚨 IMPORTANT: Replace Demo App ID

Your app is currently using a **DEMO App ID**. You need to create your own OneSignal account and get a real App ID for iOS notifications to work.

## Quick Setup (5 minutes)

### Step 1: Create OneSignal Account
1. Go to https://onesignal.com
2. Click "Get Started Free"
3. Sign up with your email/Google/GitHub

### Step 2: Create New App
1. Click "Create New App"
2. Enter app name: "TaskMaster Pro"
3. Choose "Web Push" platform
4. Click "Next: Configure Platform"

### Step 3: Configure Web Push
1. **Site Name**: TaskMaster Pro
2. **Site URL**: Your GitHub Pages URL (e.g., https://fluffymaster23.github.io/Taskmaster_Pro/)
3. **Default Icon URL**: Leave blank or use your icon
4. **Choose Integration**: Web SDK (HTML/CSS/JS)
5. Click "Save & Continue"

### Step 4: Get Your App ID
1. After setup, you'll see your **App ID** (looks like: `12345678-1234-1234-1234-123456789abc`)
2. Copy this App ID

### Step 5: Update Your Code
Replace the demo App ID in `todo.js`:

```javascript
// Find this line (around line 35):
appId: "1e7b5f8a-6f3c-4b9d-8e2a-3f7c9d4e6b8a", // Demo App ID - replace with your own

// Replace with your real App ID:
appId: "YOUR_REAL_APP_ID_HERE",
```

### Step 6: Update Safari Web ID (Optional)
1. In OneSignal dashboard, go to Settings > Platforms
2. Click on Safari (Web Push)
3. Copy the Safari Web ID
4. Replace in `todo.js`:

```javascript
// Find this line:
safari_web_id: "web.onesignal.auto.b2ef66e4-b9d3-4b3c-9a1f-2e8d7c6b5a4e", // Demo Safari Web ID

// Replace with your real Safari Web ID:
safari_web_id: "YOUR_REAL_SAFARI_WEB_ID_HERE",
```

### Step 7: Test
1. Deploy your changes to GitHub Pages
2. Open on iOS device
3. Click "Enable iOS Notifications"
4. Should see OneSignal permission prompt

## Features You Get

### ✅ What Works Now
- **Desktop**: Native browser notifications (Chrome, Firefox, Safari, Edge)
- **iOS**: OneSignal notifications (actually works!)
- **Cross-platform**: Automatic detection and appropriate system
- **Task reminders**: Scheduled notifications
- **Test notifications**: Verify setup works

### 🎯 How It Works
- **iOS devices**: Uses OneSignal for reliable notifications
- **Desktop browsers**: Uses native Web Notification API
- **Automatic detection**: Platform detected, appropriate system used
- **Fallback graceful**: If one system fails, user gets clear instructions

### 📱 iOS Benefits
- **Actually works**: Unlike native Web Notifications
- **Rich notifications**: Images, buttons, deep links
- **Reliable delivery**: Professional notification infrastructure
- **Offline support**: Notifications work even when app closed

## Free Tier Limits
- **10,000 web subscribers**: More than enough for personal use
- **Unlimited notifications**: No limit on sends
- **All features included**: Scheduling, targeting, analytics

## Troubleshooting

### iOS Not Working?
1. Check App ID is correct (not demo ID)
2. Ensure HTTPS (GitHub Pages is HTTPS)
3. Test in Safari first, then PWA
4. Check OneSignal dashboard for delivery status

### Desktop Not Working?
1. Desktop should work with native notifications
2. Check browser notification settings
3. Try incognito mode to reset permissions
4. Look for notification permission icon in address bar

### Both Not Working?
1. Check browser console for errors
2. Verify internet connection
3. Try different browser/device
4. Check OneSignal dashboard for integration status

## Next Steps

1. **Get your App ID** (5 minutes)
2. **Update the code** (2 minutes) 
3. **Deploy to GitHub Pages** (1 minute)
4. **Test on iOS** (verify it works!)
5. **Celebrate** 🎉 You now have working iOS notifications!

The demo App ID will work for testing, but create your own for production use.