const { createHash } = require('node:crypto');
const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { getTaskNotificationEvents } = require('./reminder-utils');

admin.initializeApp();

const db = admin.firestore();
const DEFAULT_NTFY_SERVER = 'https://ntfy.sh';
const DEFAULT_NTFY_TOPIC = 'fluffy-la-alerts-b214a859aa9d49bd';
const DELIVERY_LOCK_MS = 3 * 60 * 1000;

exports.sendScheduledTaskNotifications = onSchedule('every 1 minutes', async () => {
  const tasksSnapshot = await db.collectionGroup('tasks').get();
  const now = Date.now();

  for (const tasksDocument of tasksSnapshot.docs) {
    const userRef = tasksDocument.ref.parent.parent;
    if (!userRef || tasksDocument.id !== 'data') {
      continue;
    }

    const userDocument = await userRef.get();
    const settings = userDocument.get('notificationSettings') || {};
    if (settings.ntfyEnabled === false) {
      continue;
    }

    const tasks = tasksDocument.get('tasks');
    if (!Array.isArray(tasks)) {
      continue;
    }

    let endpoint;
    try {
      endpoint = getNtfyEndpoint(
        settings.ntfyServer || DEFAULT_NTFY_SERVER,
        settings.ntfyTopic || DEFAULT_NTFY_TOPIC
      );
    } catch (error) {
      console.error(`Invalid ntfy settings for account ${userRef.id}:`, error);
      continue;
    }

    for (const task of tasks) {
      for (const event of getTaskNotificationEvents(task, now)) {
        try {
          await sendTaskEvent(userRef, endpoint, task, event, now);
        } catch (error) {
          console.error(`ntfy delivery failed for account ${userRef.id}:`, error);
        }
      }
    }
  }
});

function getNtfyEndpoint(server, topic) {
  const serverUrl = new URL(server);
  if (serverUrl.protocol !== 'https:' || serverUrl.username || serverUrl.password) {
    throw new Error('ntfy server must be an HTTPS URL without embedded credentials.');
  }

  const cleanTopic = String(topic).trim();
  if (!cleanTopic) {
    throw new Error('ntfy topic is empty.');
  }

  return `${serverUrl.href.replace(/\/+$/, '')}/${encodeURIComponent(cleanTopic)}`;
}

async function sendTaskEvent(userRef, endpoint, task, event, now) {
  const taskId = String(task.id || `${task.task || 'task'}-${event.dueAt}`);
  const eventId = createHash('sha256')
    .update(`${taskId}:${event.dueAt}:${event.kind}:${event.kind === 'reminder' ? task.reminderMinutes : ''}`)
    .digest('hex');
  const deliveryRef = userRef.collection('ntfyNotificationDeliveries').doc(eventId);

  const claimed = await db.runTransaction(async transaction => {
    const delivery = await transaction.get(deliveryRef);
    const sentAt = delivery.get('sentAt');
    const lockUntil = delivery.get('lockUntil');
    if (sentAt || (lockUntil && lockUntil.toMillis() > now)) {
      return false;
    }

    transaction.set(deliveryRef, {
      taskId,
      kind: event.kind,
      lockUntil: admin.firestore.Timestamp.fromMillis(now + DELIVERY_LOCK_MS)
    });
    return true;
  });

  if (!claimed) {
    return;
  }

  const isReminder = event.kind === 'reminder';
  const taskName = String(task.task || 'Untitled task').replace(/[\r\n]+/g, ' ').slice(0, 180);
  const minutesUntilDue = Math.max(0, Math.ceil((event.dueAt - now) / 60000));
  const body = isReminder
    ? `${taskName} is due in ${minutesUntilDue} minute${minutesUntilDue === 1 ? '' : 's'}.`
    : `${taskName} is due now.`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Title': isReminder ? `TaskMaster Pro - Reminder: ${taskName}` : `TaskMaster Pro - Task Due: ${taskName}`,
        'Priority': isReminder ? '4' : '5',
        'Tags': isReminder ? 'alarm_clock' : 'bell'
      },
      body,
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`ntfy returned HTTP ${response.status}`);
    }

    await deliveryRef.set({
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      lockUntil: admin.firestore.FieldValue.delete()
    }, { merge: true });
  } catch (error) {
    await deliveryRef.delete();
    throw error;
  }
}
