const DELIVERY_GRACE_MS = 5 * 60 * 1000;

function getTaskNotificationEvents(task, now = Date.now()) {
  if (!task || task.completed || task.done || task.status === 'completed') {
    return [];
  }

  const dueAt = new Date(task.time).getTime();
  if (!Number.isFinite(dueAt)) {
    return [];
  }

  const events = [];
  const reminderMinutes = Number(task.reminderMinutes) || 0;
  if (reminderMinutes > 0) {
    const reminderAt = dueAt - reminderMinutes * 60 * 1000;
    if (now >= reminderAt && now <= reminderAt + DELIVERY_GRACE_MS) {
      events.push({ kind: 'reminder', dueAt });
    }
  }

  if (now >= dueAt && now <= dueAt + DELIVERY_GRACE_MS) {
    events.push({ kind: 'due', dueAt });
  }

  return events;
}

module.exports = { getTaskNotificationEvents };
