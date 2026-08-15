/**
 * Firebase Data Management
 * Handles saving and loading task data to/from Firestore for logged-in users
 */

// Setup real-time listener for task updates
function setupTasksListener() {
  if (window.currentUser) {
    const userId = window.currentUser.uid;
    
    // First, load tasks from Firebase immediately
    db.collection('users').doc(userId).collection('tasks').doc('data').get()
      .then((doc) => {
        if (doc.exists) {
          const tasks = doc.data().tasks || [];
          localStorage.setItem('todos', JSON.stringify(tasks));
          if (typeof window.refreshAppleRemindersExport === 'function') {
            window.refreshAppleRemindersExport(tasks);
          }
          
          // Render tasks if on taskmaster page
          if (window.location.pathname.includes('taskmaster.html')) {
            const allUls = document.querySelectorAll('[id^="ul-"]');
            allUls.forEach(ul => {
              ul.innerHTML = '';
            });
            
            if (typeof renderExistingTasks === 'function') {
              renderExistingTasks();
            }
          }
        }
      })
      .catch((error) => {
        console.error('Error loading initial tasks:', error);
      });
    
    // Then set up real-time listener for updates
    const unsubscribe = db.collection('users').doc(userId).collection('tasks').doc('data')
      .onSnapshot((doc) => {
        if (doc.exists) {
          const tasks = doc.data().tasks || [];
          
          // Update localStorage cache
          localStorage.setItem('todos', JSON.stringify(tasks));
          if (typeof window.refreshAppleRemindersExport === 'function') {
            window.refreshAppleRemindersExport(tasks);
          }
          
          // Refresh UI if on taskmaster page
          if (window.location.pathname.includes('taskmaster.html')) {
            // Clear existing tasks from UI
            const allUls = document.querySelectorAll('[id^="ul-"]');
            allUls.forEach(ul => {
              ul.innerHTML = '';
            });
            
            // Re-render all tasks
            if (typeof renderExistingTasks === 'function') {
              renderExistingTasks();
            }
          }
        }
      }, (error) => {
        console.error('Error listening to task updates:', error);
      });
    
    // Store unsubscribe function to clean up later
    window.tasksListenerUnsubscribe = unsubscribe;
  }
}

// Setup real-time listener for custom lists updates
function setupListsListener() {
  if (window.currentUser) {
    const userId = window.currentUser.uid;
    
    // First, load lists from Firebase immediately
    db.collection('users').doc(userId).collection('lists').doc('data').get()
      .then((doc) => {
        if (doc.exists) {
          const lists = doc.data().lists || [];
          localStorage.setItem('customLists', JSON.stringify(lists));
          
          // Refresh UI if on list page
          if (window.location.pathname.includes('list.html') && typeof displayCustomLists === 'function') {
            displayCustomLists();
          }
        }
      })
      .catch((error) => {
        console.error('Error loading initial lists:', error);
      });
    
    // Then set up real-time listener for updates
    const unsubscribe = db.collection('users').doc(userId).collection('lists').doc('data')
      .onSnapshot((doc) => {
        if (doc.exists) {
          const lists = doc.data().lists || [];
          
          // Update localStorage cache
          localStorage.setItem('customLists', JSON.stringify(lists));
          
          // Refresh UI if on list page
          if (window.location.pathname.includes('list.html') && typeof displayCustomLists === 'function') {
            displayCustomLists();
          }
        }
      }, (error) => {
        console.error('Error listening to lists updates:', error);
      });
    
    // Store unsubscribe function to clean up later
    window.listsListenerUnsubscribe = unsubscribe;
  }
}

// Save tasks to Firestore (login required)
async function saveTasks(tasks) {
  if (!window.currentUser) {
    console.error('Cannot save tasks: User not logged in');
    return;
  }
  
  try {
    const userId = window.currentUser.uid;
    await db.collection('users').doc(userId).collection('tasks').doc('data').set({
      tasks: tasks,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Update localStorage cache
    localStorage.setItem('todos', JSON.stringify(tasks));
  } catch (error) {
    console.error('❌ Error saving to Firestore:', error);
    throw error;
  }
}

// Load tasks from Firestore (login required)
async function loadTasks() {
  if (!window.currentUser) {
    console.error('Cannot load tasks: User not logged in');
    return [];
  }
  
  try {
    const userId = window.currentUser.uid;
    const doc = await db.collection('users').doc(userId).collection('tasks').doc('data').get();
    
    if (doc.exists) {
      const tasks = doc.data().tasks || [];
      // Update localStorage cache
      localStorage.setItem('todos', JSON.stringify(tasks));
      if (typeof window.refreshAppleRemindersExport === 'function') {
        window.refreshAppleRemindersExport(tasks);
      }
      return tasks;
    } else {
      return [];
    }
  } catch (error) {
    console.error('❌ Error loading from Firestore:', error);
    throw error;
  }
}

// Save custom lists to Firestore (login required)
async function saveCustomLists(lists) {
  if (!window.currentUser) {
    console.error('❌ Cannot save lists: User not logged in');
    return;
  }
  
  try {
    const userId = window.currentUser.uid;
    await db.collection('users').doc(userId).collection('lists').doc('data').set({
      lists: lists,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Update localStorage cache
    localStorage.setItem('customLists', JSON.stringify(lists));
    
    // Update section names cache
    const listNames = lists.map(list => list.name);
    const sectionNamesKey = `taskmaster_custom_section_names_${userId}`;
    localStorage.setItem(sectionNamesKey, JSON.stringify(listNames));
  } catch (error) {
    console.error('❌ Error saving lists to Firestore:', error);
    throw error;
  }
}

// Load custom lists from Firestore (login required)
async function loadCustomLists() {
  if (!window.currentUser) {
    return [];
  }
  
  try {
    const userId = window.currentUser.uid;
    const doc = await db.collection('users').doc(userId).collection('lists').doc('data').get();
    
    if (doc.exists) {
      const lists = doc.data().lists || [];
      
      // Update localStorage cache
      localStorage.setItem('customLists', JSON.stringify(lists));
      
      // Update section names cache
      const listNames = lists.map(list => list.name);
      const sectionNamesKey = `taskmaster_custom_section_names_${userId}`;
      localStorage.setItem(sectionNamesKey, JSON.stringify(listNames));
      
      return lists;
    } else {
      return [];
    }
  } catch (error) {
    console.error('❌ Error loading lists from Firestore:', error);
    return [];
  }
}

// Delete a task from Firestore
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
  if (window.currentUser) {
    try {
      const userId = window.currentUser.uid;
      await db.collection('users').doc(userId).set({
        settings: settings,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error saving settings to Firestore:', error);
      // Save individual settings to localStorage as fallback
      Object.keys(settings).forEach(key => {
        localStorage.setItem(key, settings[key]);
      });
    }
  } else {
    // Not logged in - save to localStorage
    Object.keys(settings).forEach(key => {
      localStorage.setItem(key, settings[key]);
    });
  }
}

// Load user settings from Firestore or localStorage
async function loadSettings(keys) {
  if (window.currentUser) {
    try {
      const userId = window.currentUser.uid;
      const doc = await db.collection('users').doc(userId).get();
      
      if (doc.exists && doc.data().settings) {
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
    // Not logged in - load from localStorage
    const settings = {};
    keys.forEach(key => {
      settings[key] = localStorage.getItem(key);
    });
    return settings;
  }
}

// Setup real-time listener for daily goals updates
function setupDailyGoalsListener() {
  if (!window.currentUser) {
    return;
  }

  const userId = window.currentUser.uid;

  db.collection('users').doc(userId).collection('dailyGoals').doc('data').get()
    .then((doc) => {
      if (doc.exists) {
        const goals = doc.data().goals || [];
        localStorage.setItem('dailyGoals', JSON.stringify(goals));
        if (typeof renderDailyGoals === 'function') {
          renderDailyGoals();
        }
      }
    })
    .catch((error) => {
      console.error('Error loading initial daily goals:', error);
    });

  const unsubscribe = db.collection('users').doc(userId).collection('dailyGoals').doc('data')
    .onSnapshot((doc) => {
      if (doc.exists) {
        const goals = doc.data().goals || [];
        localStorage.setItem('dailyGoals', JSON.stringify(goals));
        if (typeof renderDailyGoals === 'function') {
          renderDailyGoals();
        }
      }
    }, (error) => {
      console.error('Error listening to daily goals updates:', error);
    });

  window.dailyGoalsListenerUnsubscribe = unsubscribe;
}

// Setup real-time listener for weekly goals updates
function setupWeeklyGoalsListener() {
  if (!window.currentUser) {
    return;
  }

  const userId = window.currentUser.uid;

  db.collection('users').doc(userId).collection('weeklyGoals').doc('data').get()
    .then((doc) => {
      if (doc.exists) {
        const goals = doc.data().goals || [];
        localStorage.setItem('weeklyGoals', JSON.stringify(goals));
        if (typeof renderWeeklyGoals === 'function') {
          renderWeeklyGoals();
        }
      }
    })
    .catch((error) => {
      console.error('Error loading initial weekly goals:', error);
    });

  const unsubscribe = db.collection('users').doc(userId).collection('weeklyGoals').doc('data')
    .onSnapshot((doc) => {
      if (doc.exists) {
        const goals = doc.data().goals || [];
        localStorage.setItem('weeklyGoals', JSON.stringify(goals));
        if (typeof renderWeeklyGoals === 'function') {
          renderWeeklyGoals();
        }
      }
    }, (error) => {
      console.error('Error listening to weekly goals updates:', error);
    });

  window.weeklyGoalsListenerUnsubscribe = unsubscribe;
}

async function saveDailyGoals(goals) {
  if (!window.currentUser) {
    localStorage.setItem('dailyGoals', JSON.stringify(goals || []));
    return;
  }

  try {
    const userId = window.currentUser.uid;
    await db.collection('users').doc(userId).collection('dailyGoals').doc('data').set({
      goals: goals || [],
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    localStorage.setItem('dailyGoals', JSON.stringify(goals || []));
  } catch (error) {
    console.error('Error saving daily goals:', error);
    throw error;
  }
}

async function loadDailyGoals() {
  if (!window.currentUser) {
    try {
      return JSON.parse(localStorage.getItem('dailyGoals') || '[]');
    } catch (error) {
      console.error('Error reading local daily goals:', error);
      return [];
    }
  }

  try {
    const userId = window.currentUser.uid;
    const doc = await db.collection('users').doc(userId).collection('dailyGoals').doc('data').get();
    const goals = doc.exists ? (doc.data().goals || []) : [];
    localStorage.setItem('dailyGoals', JSON.stringify(goals));
    return goals;
  } catch (error) {
    console.error('Error loading daily goals:', error);
    return [];
  }
}

async function saveWeeklyGoals(goals) {
  if (!window.currentUser) {
    localStorage.setItem('weeklyGoals', JSON.stringify(goals || []));
    return;
  }

  try {
    const userId = window.currentUser.uid;
    await db.collection('users').doc(userId).collection('weeklyGoals').doc('data').set({
      goals: goals || [],
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    localStorage.setItem('weeklyGoals', JSON.stringify(goals || []));
  } catch (error) {
    console.error('Error saving weekly goals:', error);
    throw error;
  }
}

async function loadWeeklyGoals() {
  if (!window.currentUser) {
    try {
      return JSON.parse(localStorage.getItem('weeklyGoals') || '[]');
    } catch (error) {
      console.error('Error reading local weekly goals:', error);
      return [];
    }
  }

  try {
    const userId = window.currentUser.uid;
    const doc = await db.collection('users').doc(userId).collection('weeklyGoals').doc('data').get();
    const goals = doc.exists ? (doc.data().goals || []) : [];
    localStorage.setItem('weeklyGoals', JSON.stringify(goals));
    return goals;
  } catch (error) {
    console.error('Error loading weekly goals:', error);
    return [];
  }
}
