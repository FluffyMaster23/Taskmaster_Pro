const test = require('node:test');
const assert = require('node:assert/strict');
const { getTaskNotificationEvents } = require('../reminder-utils');

const dueAt = Date.parse('2026-11-25T18:00:00.000Z');

test('selects reminder and due events in their delivery windows', () => {
  const task = { id: 'task-1', time: new Date(dueAt).toISOString(), reminderMinutes: 10 };

  assert.deepEqual(
    getTaskNotificationEvents(task, dueAt - 10 * 60 * 1000),
    [{ kind: 'reminder', dueAt }]
  );
  assert.deepEqual(
    getTaskNotificationEvents(task, dueAt),
    [{ kind: 'due', dueAt }]
  );
});

test('does not send for completed tasks, invalid dates, or expired windows', () => {
  assert.deepEqual(
    getTaskNotificationEvents({ id: 'done', time: new Date(dueAt).toISOString(), completed: true }, dueAt),
    []
  );
  assert.deepEqual(getTaskNotificationEvents({ id: 'invalid', time: 'not-a-date' }, dueAt), []);
  assert.deepEqual(
    getTaskNotificationEvents({ id: 'late', time: new Date(dueAt).toISOString() }, dueAt + 5 * 60 * 1000 + 1),
    []
  );
});
