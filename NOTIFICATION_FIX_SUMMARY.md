# Notification delivery

TaskMaster Pro uses ntfy for scheduled phone notifications. A Firebase scheduled
function reads signed-in users' tasks from Firestore and publishes advance reminders
and due alerts to the configured ntfy server/topic. It runs once per minute and uses a
five-minute grace window with delivery markers to avoid duplicates.

Firebase Cloud Messaging and OneSignal are not used to deliver notifications. Firebase
remains the task database and scheduler. Browser-native notifications are still shown
by the local reminder checker while the app is running.

Deployment, ntfy subscription, limitations, and testing steps are documented in
[NTFY-SETUP.txt](NTFY-SETUP.txt) and [NOTIFICATION_TEST_GUIDE.md](NOTIFICATION_TEST_GUIDE.md).
