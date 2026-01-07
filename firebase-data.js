/**
 * Firebase Data Management
 * Handles saving and loading task data to/from Firestore for logged-in users
 * Falls back to localStorage for guest users
 */

// Save tasks to Firestore or localStorage
async function saveTasks(tasks) {
  if (window.currentUser && !window.isGuestMode && window.db) {
    // Logged in user - save to Firestore
    try {
      const userId = window.currentUser.uid;
      await window.db.collection('users').doc(userId).collection('tasks').doc('data').set({
        tasks: tasks,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log('Tasks saved to Firestore');
    } catch (error) {
      console.error('Error saving to Firestore:', error);
      // Fallback to localStorage if Firestore fails
      localStorage.setItem('todos', JSON.stringify(tasks));
    }
  } else {
    // Guest user - save to localStorage
    localStorage.setItem('todos', JSON.stringify(tasks));
  }
}

// Load tasks from Firestore or localStorage
async function loadTasks() {
  if (window.currentUser && !window.isGuestMode && window.db) {
    // Logged in user - load from Firestore
    try {
      const userId = window.currentUser.uid;
      const doc = await window.db.collection('users').doc(userId).collection('tasks').doc('data').get();
      
      if (doc.exists) {
        console.log('Tasks loaded from Firestore');
        return doc.data().tasks || [];
      } else {
        // No data in Firestore, check localStorage for migration
        const localData = localStorage.getItem('todos');
        if (localData) {
          const tasks = JSON.parse(localData);
          // Migrate local data to Firestore
          await saveTasks(tasks);
          console.log('Migrated localStorage tasks to Firestore');
          return tasks;
        }
        return [];
      }
    } catch (error) {
      console.error('Error loading from Firestore:', error);
      // Fallback to localStorage
      const localData = localStorage.getItem('todos');
      return localData ? JSON.parse(localData) : [];
    }
  } else {
    // Guest user - load from localStorage
    const localData = localStorage.getItem('todos');
    return localData ? JSON.parse(localData) : [];
  }
}

// Save custom lists to Firestore or localStorage
async function saveCustomLists(lists) {
  if (window.currentUser && !window.isGuestMode && window.db) {
    try {
      const userId = window.currentUser.uid;
      await window.db.collection('users').doc(userId).collection('lists').doc('data').set({
        lists: lists,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log('Custom lists saved to Firestore');
    } catch (error) {
      console.error('Error saving lists to Firestore:', error);
      localStorage.setItem('customLists', JSON.stringify(lists));
    }
  } else {
    localStorage.setItem('customLists', JSON.stringify(lists));
  }
}

// Load custom lists from Firestore or localStorage
async function loadCustomLists() {
  if (window.currentUser && !window.isGuestMode && window.db) {
    try {
      const userId = window.currentUser.uid;
      const doc = await window.db.collection('users').doc(userId).collection('lists').doc('data').get();
      
      if (doc.exists) {
        console.log('Custom lists loaded from Firestore');
        return doc.data().lists || [];
      } else {
        // Check localStorage for migration
        const localData = localStorage.getItem('customLists');
        if (localData) {
          const lists = JSON.parse(localData);
          await saveCustomLists(lists);
          console.log('Migrated localStorage lists to Firestore');
          return lists;
        }
        return [];
      }
    } catch (error) {
      console.error('Error loading lists from Firestore:', error);
      const localData = localStorage.getItem('customLists');
      return localData ? JSON.parse(localData) : [];
    }
  } else {
    const localData = localStorage.getItem('customLists');
    return localData ? JSON.parse(localData) : [];
  }
}

// Delete a task from Firestore or localStorage
async function deleteTask(taskId) {
  const tasks = await loadTasks();
  const updatedTasks = tasks.filter(task => task.id !== taskId);
  await saveTasks(updatedTasks);
}

// Update a task in Firestore or localStorage
async function updateTask(taskId, updates) {
  const tasks = await loadTasks();
  const taskIndex = tasks.findIndex(task => task.id === taskId);
  
  if (taskIndex !== -1) {
    tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
    await saveTasks(tasks);
  }
}

// Add a new task to Firestore or localStorage
async function addTask(task) {
  const tasks = await loadTasks();
  tasks.push(task);
  await saveTasks(tasks);
}

// Save user settings to Firestore or localStorage
async function saveSettings(settings) {
  if (window.currentUser && !window.isGuestMode && window.db) {
    try {
      const userId = window.currentUser.uid;
      await window.db.collection('users').doc(userId).set({
        settings: settings,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      console.log('Settings saved to Firestore');
    } catch (error) {
      console.error('Error saving settings to Firestore:', error);
      // Save individual settings to localStorage as fallback
      Object.keys(settings).forEach(key => {
        localStorage.setItem(key, settings[key]);
      });
    }
  } else {
    // Guest user - save to localStorage
    Object.keys(settings).forEach(key => {
      localStorage.setItem(key, settings[key]);
    });
  }
}

// Load user settings from Firestore or localStorage
async function loadSettings(keys) {
  if (window.currentUser && !window.isGuestMode && window.db) {
    try {
      const userId = window.currentUser.uid;
      const doc = await window.db.collection('users').doc(userId).get();
      
      if (doc.exists && doc.data().settings) {
        console.log('Settings loaded from Firestore');
        return doc.data().settings;
      } else {
        // Fallback to localStorage
        const settings = {};
        keys.forEach(key => {
          settings[key] = localStorage.getItem(key);
        });
        return settings;
      }
    } catch (error) {
      console.error('Error loading settings from Firestore:', error);
      const settings = {};
      keys.forEach(key => {
        settings[key] = localStorage.getItem(key);
      });
      return settings;
    }
  } else {
    // Guest user - load from localStorage
    const settings = {};
    keys.forEach(key => {
      settings[key] = localStorage.getItem(key);
    });
    return settings;
  }
}
