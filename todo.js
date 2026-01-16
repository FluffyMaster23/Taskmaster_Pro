// === FIREBASE INITIALIZATION ===
// Version: 2026-01-15-v2
// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC1S6U4E_IIAw5csnapl8ZoIyBS_Lv5k2A",
  authDomain: "taskmaster-pro-bf98a.firebaseapp.com",
  projectId: "taskmaster-pro-bf98a",
  storageBucket: "taskmaster-pro-bf98a.firebasestorage.app",
  messagingSenderId: "47778628154",
  appId: "1:47778628154:web:eddd6a64147d917fcb6b03",
  measurementId: "G-JERNL4E72Z"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// Set auth persistence to LOCAL
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch((error) => {
  console.error('Error setting auth persistence:', error);
});

// === CONFIG ===
const DEFAULT_SECTIONS = [];

// Clear old localStorage list data with old user_ prefix
function clearOldListData() {
  if (!window.currentUser) return;
  
  const currentUserId = window.currentUser.uid;
  const keysToRemove = [];
  
  // Find all old list keys with user_ prefix
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('taskmaster_custom') && key.includes('user_') && !key.includes(currentUserId)) {
      keysToRemove.push(key);
    }
  }
  
  // Remove old keys
  if (keysToRemove.length > 0) {

    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
}

// Function to get all sections (default + user's custom lists)
async function getAllSections() {


  
  // Only use Firebase user ID if logged in
  if (!window.currentUser) {

    // Check if there's a cached user ID in localStorage
    const cachedKeys = Object.keys(localStorage).filter(k => k.startsWith('taskmaster_custom_section_names_'));

    
    if (cachedKeys.length > 0) {
      const cachedListNames = JSON.parse(localStorage.getItem(cachedKeys[0]) || '[]');
      if (cachedListNames.length > 0) {

        return [...DEFAULT_SECTIONS, ...cachedListNames];
      }
    }
    

    return DEFAULT_SECTIONS;
  }
  
  const userId = window.currentUser.uid;
  const userCustomListsKey = `taskmaster_custom_section_names_${userId}`;
  

  
  // Clear old data first
  clearOldListData();
  
  // Try localStorage cache first for instant loading
  const cachedListNames = JSON.parse(localStorage.getItem(userCustomListsKey) || '[]');

  
  // Always load from Firebase to get the latest data
  if (typeof loadCustomLists === 'function') {
    try {

      const customLists = await loadCustomLists();

      
      if (customLists && customLists.length > 0) {
        const listNames = customLists.map(list => list.name);
        // Save to localStorage for faster access next time
        localStorage.setItem(userCustomListsKey, JSON.stringify(listNames));

        return [...DEFAULT_SECTIONS, ...listNames];
      } else {

        if (cachedListNames.length > 0) {
          return [...DEFAULT_SECTIONS, ...cachedListNames];
        }
      }
    } catch (error) {
      console.error('❌ Error loading custom lists from Firebase:', error);
      // Use cache on error
      if (cachedListNames.length > 0) {

        return [...DEFAULT_SECTIONS, ...cachedListNames];
      }
    }
  } else {

  }
  
  // Final fallback to cache
  if (cachedListNames.length > 0) {

    return [...DEFAULT_SECTIONS, ...cachedListNames];
  }
  

  return DEFAULT_SECTIONS;
}

// Dynamic SECTIONS array that includes custom lists (will be updated async)
let SECTIONS = [];

window._clearMessageSpoken = false;
window._spokenTaskIds = new Set();
window._notifiedTaskIds = new Set(); // Track which tasks already sent notifications
window._reminderTaskIds = new Set(); // Track which tasks already sent advance reminders
window.selectedVoice = null;
window.speechRate = 1; // Default speech rate

// === APPLICATION INITIALIZATION ===
window.addEventListener('DOMContentLoaded', function() {
  // Clear localStorage function for testing (available in console)
  window.clearAllData = function() {

    localStorage.clear();
    
    // Reset global variables
    window._clearMessageSpoken = false;
    window._spokenTaskIds = new Set();
    window._notifiedTaskIds = new Set();
    window._reminderTaskIds = new Set();
    window.selectedVoice = null;
    window.speechRate = 1;
    window._greetingSpoken = false;
    

    alert('All data cleared! Refresh the page to start fresh and see notification prompts.');
  };
  
  // Initialize Firebase Cloud Messaging for notifications
  initializeFirebaseMessaging();

  // Page-specific initialization
  initializeCurrentPage();
  
  // Refresh sections when page becomes visible (to pick up new custom lists)
  document.addEventListener('visibilitychange', async function() {
    if (!document.hidden && window.location.pathname.includes('taskmaster.html')) {

      // Check if custom lists have been updated (now async)
      const currentSections = await getAllSections();

      
      const displayedSections = Array.from(document.querySelectorAll('[id^="summary-"]')).map(el => 
        el.textContent.trim()
      );

      
      // If sections have changed, recreate them
      if (currentSections.length !== displayedSections.length || 
          !currentSections.every(section => displayedSections.includes(section))) {

        await createSections();
      } else {

      }
    }
  });
});

// === PAGE-SPECIFIC INITIALIZATION ===
function initializeCurrentPage() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  
  switch(currentPage) {
    case 'taskmaster.html':
      initializeTaskMasterPage();
      break;
    case 'options.html':
      initializeOptionsPage();
      break;
    case 'index.html':
    case '':
      initializeHomePage();
      break;
    default:

  }
}

async function initializeTaskMasterPage() {

  
  // Setup voice functionality
  setupVoiceFunctionality();
  
  // Setup Firebase Cloud Messaging for notifications
  initializeFirebaseMessaging();
  
  // Setup real-time task listener if user is already logged in
  if (window.currentUser && !window.isGuestMode && typeof setupTasksListener === 'function') {

    setupTasksListener();
  }
  
  // Create task sections (now async)
  await createSections();
  
  // Check if we should focus on a specific list (from list.html)
  const focusList = sessionStorage.getItem('focusList');
  if (focusList) {
    sessionStorage.removeItem('focusList');
    setTimeout(() => {
      const listElement = document.getElementById(`summary-${focusList}`);
      if (listElement) {
        listElement.scrollIntoView({ behavior: 'smooth' });
        listElement.click(); // Open the details
      }
    }, 100);
  }
  
  // Setup upcoming tasks checker
  const checkUpcomingBtn = document.getElementById('checkUpcoming');
  if (checkUpcomingBtn) {
    checkUpcomingBtn.addEventListener('click', () => {

      const upcoming = getUpcomingTasks();


      
      if (upcoming.length === 0) {
        // Use the clear message when no upcoming tasks

        // Always play the clear message when manually requested, reset the flag first
        window._clearMessageSpoken = false;
        setTimeout(() => speakWizLine("clear"), 1000);
      } else {

        upcoming.forEach((task, index) => {

          setTimeout(() => speakTask(task), index * 3000); // 3 second delay between tasks
        });
      }
    });
  } else {

  }
  
  // Start the notification checker
  startNotificationChecker();
}

function initializeOptionsPage() {

  
  // Setup voice functionality for the options page
  setupVoiceFunctionality();
  
  // Force voice loading with a small delay to ensure DOM is ready
  setTimeout(() => {

    loadVoices();
  }, 500);
}

function initializeHomePage() {

  
  // Initialize Firebase Cloud Messaging for notifications
  initializeFirebaseMessaging();
  
  // Start notification checker even on home page for background notifications
  startNotificationChecker();
  
  // Voice greeting - only if user has explicitly selected a voice
  // Check if user has a saved voice preference
  const savedVoiceIndex = localStorage.getItem("selectedVoiceIndex");
  const savedVoiceName = localStorage.getItem("selectedVoiceName");
  
  // Only greet if user has chosen a voice (not default/none)
  // Exception: if user ID contains "admin", always greet
  const userId = localStorage.getItem('taskmaster_user_id') || '';
  const isAdmin = userId.toLowerCase().includes('admin');
  
  if ((savedVoiceIndex && savedVoiceIndex !== "null") || (savedVoiceName && savedVoiceName !== "null") || isAdmin) {
    const now = new Date();
    const hour = now.getHours();
    let greeting;

    if (hour >= 5 && hour < 12) {
      greeting = "Morning, G. Let's get the day rolling.";
    } else if (hour >= 12 && hour < 18) {
      greeting = "Afternoon, boss. Time to knock some things out.";
    } else {
      greeting = "Evening, player. Still grinding?";
    }

    // Prevent multiple greetings per page load
    if (!window._greetingSpoken) {
      window._greetingSpoken = true;
      
      // Check if we're on mobile for speech handling
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // On mobile, speech might be blocked - add user interaction trigger

        
        // Add click listener to enable speech after first user interaction
        const enableMobileSpeech = () => {

          speak(greeting);
          document.removeEventListener('click', enableMobileSpeech);
          document.removeEventListener('touchstart', enableMobileSpeech);
        };
        
        // Try to speak immediately, but also add fallback
        try {
          speak(greeting);
        } catch (e) {

          document.addEventListener('click', enableMobileSpeech, { once: true });
          document.addEventListener('touchstart', enableMobileSpeech, { once: true });
        }
      } else {
        // Desktop - just speak directly
        speak(greeting);
      }
    }
  } else {

  }
}

// === TAB FUNCTIONALITY ===

// === HYBRID NOTIFICATION SYSTEM ===
// Uses OneSignal for iOS Safari, FCM for Windows/Desktop
let messaging = null;
let fcmToken = null;

async function initializeFirebaseMessaging() {

  
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  // Check if browser supports notifications
  if (!('Notification' in window)) {

    return;
  }
  
  // iOS Safari uses OneSignal
  if (isIOS && isSafari) {

    return initializeOneSignal();
  }
  
  try {
    // Check if Firebase Messaging is supported
    if (!firebase.messaging.isSupported()) {

      return initializeNativeNotifications();
    }
    
    messaging = firebase.messaging();

    
    // Request notification permission

    let permission = Notification.permission;
    
    if (permission === 'default') {
      permission = await Notification.requestPermission();

    } else {

    }
    
    if (permission === 'granted') {

      
      if ('serviceWorker' in navigator) {
        try {

          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/'
          });

          
          // Wait for service worker to be ready
          await navigator.serviceWorker.ready;

          

          fcmToken = await messaging.getToken({
            vapidKey: 'BCS6sik162IJiqA7odT7O6wGCaffPepZvCHeUWuHReHQrSkQOybm1XWOLZY6ChJP9cYJ25ytTVdwgMK-tJL19ag',
            serviceWorkerRegistration: registration
          });
          
          if (fcmToken) {
            localStorage.setItem('fcm_token', fcmToken);
            window.fcmEnabled = true;
          } else {

          }
        } catch (swError) {
          console.error('❌ Service worker registration failed:', swError);

          initializeNativeNotifications();
        }
      } else {

        initializeNativeNotifications();
      }
      
      // Handle foreground messages
      messaging.onMessage((payload) => {

        const notificationTitle = payload.notification?.title || 'TaskMaster Pro';
        const notificationOptions = {
          body: payload.notification?.body || payload.data?.body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: payload.data?.tag || 'taskmaster',
          requireInteraction: false,
          data: payload.data,
          vibrate: [200, 100, 200]
        };
        
        if (Notification.permission === 'granted') {

          new Notification(notificationTitle, notificationOptions);
        }
      });
      
      // Handle token refresh
      messaging.onTokenRefresh(async () => {

        try {
          const newToken = await messaging.getToken();

          localStorage.setItem('fcm_token', newToken);
          fcmToken = newToken;
        } catch (error) {
          console.error('❌ Token refresh failed:', error);
        }
      });
      
    } else if (permission === 'denied') {

    } else {

    }
    
  } catch (error) {
    console.error('❌ Firebase Messaging initialization error:', error);

    initializeNativeNotifications();
  }
}

// === ONESIGNAL INITIALIZATION (iOS Safari only) ===
async function initializeOneSignal() {
  window.OneSignal = window.OneSignal || [];
  
  return new Promise((resolve) => {
    OneSignal.push(function() {
      OneSignal.init({
        appId: "194275f5-45ac-4ac1-85ff-924bbe00f066",
        safari_web_id: "web.onesignal.auto.194275f5-45ac-4ac1-85ff-924bbe00f066",
        notifyButton: {
          enable: false,
        },
        allowLocalhostAsSecureOrigin: true,
        autoRegister: false,
        autoResubscribe: true,
        serviceWorkerParam: {
          scope: './',
          updateViaCache: 'none'
        },
        serviceWorkerPath: 'OneSignalSDKWorker.js',
        persistNotification: true,
        requiresUserPrivacyConsent: false,
        promptOptions: {
          slidedown: {
            enabled: true,
            autoPrompt: true,
            timeDelay: 1,
            pageViews: 1
          }
        },
        welcomeNotification: {
          disable: true
        }
      }).then(function() {
        setTimeout(() => {
          OneSignal.showNativePrompt().catch(() => {
            OneSignal.registerForPushNotifications().catch(() => {});
          });
        }, 500);
        
        OneSignal.isPushNotificationsEnabled(function(isEnabled) {
          window.oneSignalEnabled = isEnabled;
        });
        
        OneSignal.on('subscriptionChange', function (isSubscribed) {
          window.oneSignalEnabled = isSubscribed;
        });
        
        resolve();
      }).catch(function(error) {
        if (Notification.permission !== 'granted') {
          Notification.requestPermission();
        }
        resolve();
      });
    });
  });
}

function initializeNativeNotifications() {

  
  if (!('Notification' in window)) {

    return;
  }
  

  
  if (Notification.permission === 'default') {

    Notification.requestPermission().then(function(permission) {

      window.nativeNotificationsEnabled = (permission === 'granted');
      if (permission === 'granted') {

      } else {

      }
    });
  } else {
    window.nativeNotificationsEnabled = (Notification.permission === 'granted');

  }
}

async function sendTasksToServiceWorker() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    const tasks = getTasks();
    
    navigator.serviceWorker.controller.postMessage({
      type: 'UPDATE_TASKS',
      tasks: tasks
    });
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'GET_TASKS') {
      const tasks = getTasks();
      event.ports[0].postMessage({ tasks: tasks });
    }
  });
}

function scheduleTaskNotification(task) {
  const dueTime = new Date(task.time);
  const reminderMinutes = task.reminderMinutes || 0;
  const reminderTime = new Date(dueTime.getTime() - (reminderMinutes * 60 * 1000));
  const now = new Date();
  
  const timeUntilReminder = reminderTime.getTime() - now.getTime();
  if (timeUntilReminder > 0 && timeUntilReminder <= 24 * 60 * 60 * 1000) {
    setTimeout(() => {
      sendLocalNotification(task, true);
    }, timeUntilReminder);
  }
  
  const timeUntilDue = dueTime.getTime() - now.getTime();
  if (timeUntilDue > 0 && timeUntilDue <= 24 * 60 * 60 * 1000) {
    setTimeout(() => {
      sendLocalNotification(task, false);
    }, timeUntilDue);
  }
}

function sendLocalNotification(task, isReminder = false) {
  if (Notification.permission !== 'granted') return;
  
  const title = isReminder ? `⏰ Reminder: ${task.task}` : `🔔 Task Due: ${task.task}`;
  const body = isReminder 
    ? `Due in ${task.reminderMinutes} minutes` 
    : `This task is due now!`;
  
  const notification = new Notification(title, {
    body: body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: `task-${task.id}`,
    requireInteraction: !isReminder,
    data: { taskId: task.id, task: task }
  });
  
  notification.onclick = function() {
    window.focus();
    notification.close();
    // Navigate to task list if not already there
    if (!window.location.pathname.includes('taskmaster.html')) {
      window.location.href = 'taskmaster.html';
    }
  };
}

// === VOICE FUNCTIONALITY SETUP ===
function setupVoiceFunctionality() {
  // Only setup if voice elements exist on this page
  if (!document.getElementById("voiceSelect") && !document.getElementById("speechRateSelect")) {

    return;
  }
  

  
  // Load voices when they're ready
  window.speechSynthesis.onvoiceschanged = () => {

    loadVoices();
  };
  
  // Also try loading immediately (for some browsers)

  loadVoices();
  
  // Setup voice select event listener
  const voiceSelect = document.getElementById("voiceSelect");
  if (voiceSelect) {
    voiceSelect.addEventListener("change", e => {
      // Check if "Choose voice" option is selected
      if (e.target.selectedIndex === 0) {
        // "Choose voice" selected - clear voice selection
        window.selectedVoice = null;
        localStorage.removeItem("selectedVoiceIndex");
        localStorage.removeItem("selectedVoiceName");

        return;
      }
      
      // Get the original voice index from the data attribute
      const selectedOption = e.target.options[e.target.selectedIndex];
      const originalVoiceIndex = parseInt(selectedOption.dataset.originalIndex);
      const voices = window.speechSynthesis.getVoices();
      const selectedVoiceObj = voices[originalVoiceIndex];
      
      if (selectedVoiceObj) {
        // Store the voice object globally
        window.selectedVoice = selectedVoiceObj;
        
        // Save the original voice index and name for persistence
        localStorage.setItem("selectedVoiceIndex", originalVoiceIndex);
        localStorage.setItem("selectedVoiceName", selectedVoiceObj.name);
        
        // Test the voice immediately (only if not on options page to avoid duplicate announcements)
        if (!window.location.pathname.includes('options.html')) {
          speak("Voice changed to " + selectedVoiceObj.name.split(' ')[0]);
        }
      }
    });
  }
  
  // Setup speech rate event listener
  const speechRateSelect = document.getElementById("speechRateSelect");
  if (speechRateSelect) {
    speechRateSelect.addEventListener("change", e => {
      window.speechRate = parseFloat(e.target.value);
      // Save speech rate preference to localStorage
      localStorage.setItem("speechRate", e.target.value);

    });
  }
  
  // Load saved preferences
  loadSavedVoicePreferences();
}

function loadSavedVoicePreferences() {
  // Load saved speech rate
  const savedRate = localStorage.getItem("speechRate");
  if (savedRate) {
    window.speechRate = parseFloat(savedRate);
    const speechRateSelect = document.getElementById("speechRateSelect");
    if (speechRateSelect) {
      speechRateSelect.value = savedRate;

    }
  }
  
  // Load saved voice index (preferred method)
  const savedVoiceIndex = localStorage.getItem("selectedVoiceIndex");
  const voices = window.speechSynthesis.getVoices();
  
  if (savedVoiceIndex && savedVoiceIndex !== "null" && voices.length > 0) {
    const index = parseInt(savedVoiceIndex);
    const voiceSelect = document.getElementById("voiceSelect");
    
    if (voiceSelect && index < voices.length) {
      // Find the option with the matching originalIndex
      const options = voiceSelect.options;
      for (let i = 1; i < options.length; i++) { // Start from 1 to skip "Choose voice"
        if (parseInt(options[i].dataset.originalIndex) === index) {
          voiceSelect.selectedIndex = i;
          window.selectedVoice = voices[index];
          return; // Successfully loaded
        }
      }
    }
  }
  
  // Fallback: try to find voice by name
  const savedVoiceName = localStorage.getItem("selectedVoiceName");
  if (savedVoiceName && voices.length > 0) {
    const voiceSelect = document.getElementById("voiceSelect");
    if (voiceSelect) {
      // Find the voice by name in the dropdown options
      const options = voiceSelect.options;
      for (let i = 1; i < options.length; i++) { // Start from 1 to skip "Choose voice"
        if (options[i].value === savedVoiceName) {
          const originalIndex = parseInt(options[i].dataset.originalIndex);
          voiceSelect.selectedIndex = i;
          window.selectedVoice = voices[originalIndex];
          return;
        }
      }
    }
  }
  
  // No saved voice found - leave on "Choose voice" option
  const voiceSelect = document.getElementById("voiceSelect");
  if (voiceSelect) {
    voiceSelect.selectedIndex = 0; // "Choose voice" option
    window.selectedVoice = null; // No voice selected

  }
}

// === VOICE LOADING ===
function loadVoices() {
  const voiceSelect = document.getElementById("voiceSelect");
  
  if (!voiceSelect) {

    return;
  }
  
  voiceSelect.innerHTML = "";
  
  const voices = speechSynthesis.getVoices();

  
  if (voices.length === 0) {
    // Retry loading voices after a short delay

    setTimeout(loadVoices, 100);
    return;
  }
  

  
  // Detect iOS for voice filtering
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  let filteredVoices;
  
  if (isIOS) {
    // For iOS, only show iOS-specific voices
    filteredVoices = voices.filter(v => 
      v.name.includes('Siri') || 
      v.localService === true ||
      v.name.includes('Alex') ||
      v.name.includes('Victoria') ||
      v.name.includes('Daniel') ||
      v.name.includes('Karen') ||
      v.name.includes('Moira') ||
      v.name.includes('Tessa') ||
      v.name.includes('Samantha') ||
      v.name.includes('Aaron') ||
      v.name.includes('Fred') ||
      v.name.includes('Nicky') ||
      v.name.includes('Vicki') ||
      v.name.includes('Princess') ||
      v.name.includes('Junior') ||
      v.name.includes('Ralph') ||
      v.name.includes('Albert') ||
      v.name.includes('Kathy') ||
      v.name.includes('Cellos') ||
      v.name.includes('Zarvox') ||
      v.name.includes('Trinoids') ||
      v.name.includes('Whisper') ||
      v.name.includes('Deranged') ||
      v.name.includes('Goodness') ||
      v.name.includes('Hysterical') ||
      v.name.includes('Novelty') ||
      v.name.includes('Organ') ||
      v.name.includes('Bubbles') ||
      v.name.includes('Boing') ||
      v.name.includes('Bahh') ||
      v.name.includes('Bells') ||
      v.name.includes('Bad News') ||
      v.name.includes('Pipe Organ')
    );

  } else {
    // For non-iOS, filter for English voices or all voices if no English found
    filteredVoices = voices.filter(v => v.lang.startsWith("en"));
    if (filteredVoices.length === 0) {
      filteredVoices = voices; // Use all voices if no English ones
    }

  }
  
  // Sort voices by name for better organization
  filteredVoices.sort((a, b) => a.name.localeCompare(b.name));
  
  // Add default "Choose voice" option
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Choose voice...";
  voiceSelect.appendChild(defaultOption);
  
  filteredVoices.forEach(voice => {
    const option = document.createElement("option");
    option.value = voice.name;
    option.textContent = `${voice.name} (${voice.lang})`;
    // Store the original voice index from the full voices array
    option.dataset.originalIndex = voices.indexOf(voice);
    voiceSelect.appendChild(option);
  });

  // Set default to "Choose voice" (will be overridden by saved preferences)
  voiceSelect.selectedIndex = 0;


  // Load saved voice preferences after voices are populated
  loadSavedVoicePreferences();
  

}

// === SPEAK (User-selected voice)
function speak(text) {
  const utter = new SpeechSynthesisUtterance(text);
  
  if (window.selectedVoice) {
    // selectedVoice is now a voice object, not a string
    utter.voice = window.selectedVoice;

  } else {
    // Fallback to first available voice
    const voices = speechSynthesis.getVoices();

    if (voices.length > 0) {
      utter.voice = voices[0];

    } else {

    }
  }
  
  utter.lang = "en-US";
  utter.rate = window.speechRate || 1; // Use selected speech rate
  utter.pitch = 1;
  utter.volume = 1;
  
  // Add event listeners for debugging
  utter.onerror = (event) => console.error('speak() - Speech error:', event);
  
  // Clear any pending speech and speak
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

// === SPEAK DAVID (used for reminders, task reports)
function speakDavid(text) {

  
  const utter = new SpeechSynthesisUtterance(text);
  
  // Always use the selected voice instead of trying to find David
  if (window.selectedVoice) {

    utter.voice = window.selectedVoice;
  } else {
    // Fallback to first available voice
    const voices = speechSynthesis.getVoices();

    if (voices.length > 0) {
      utter.voice = voices[0];

    } else {

    }
  }
  
  utter.lang = "en-US";
  utter.rate = window.speechRate || 1; // Use selected speech rate
  utter.pitch = 1;
  utter.volume = 1;
  
  // Add event listeners for debugging
  utter.onerror = (event) => console.error('Speech error:', event);
  
  // Clear any pending speech and speak
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

// === SPEAK TASK (for upcoming tasks)
function speakTask(task) {

  
  const now = new Date();
  const due = new Date(task.time);
  const timeDiff = due - now;
  
  let announcement = "";
  
  if (timeDiff < 0) {
    // Overdue task
    const overdueDays = Math.floor(Math.abs(timeDiff) / (1000 * 60 * 60 * 24));
    const overdueHours = Math.floor((Math.abs(timeDiff) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (overdueDays > 0) {
      announcement = `Overdue: ${task.task}. Was due ${overdueDays} day${overdueDays > 1 ? 's' : ''} ago.`;
    } else if (overdueHours > 0) {
      announcement = `Overdue: ${task.task}. Was due ${overdueHours} hour${overdueHours > 1 ? 's' : ''} ago.`;
    } else {
      announcement = `Overdue: ${task.task}. This task is overdue.`;
    }
  } else {
    // Upcoming task
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      announcement = `${task.task}. Due in ${days} day${days > 1 ? 's' : ''} and ${hours} hour${hours !== 1 ? 's' : ''}.`;
    } else if (hours > 0) {
      announcement = `${task.task}. Due in ${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}.`;
    } else if (minutes > 5) {
      announcement = `${task.task}. Due in ${minutes} minutes.`;
    } else if (minutes > 0) {
      announcement = `${task.task}. Due in ${minutes} minute${minutes !== 1 ? 's' : ''}. Almost due!`;
    } else {
      announcement = `${task.task}. This task is due now!`;
    }
  }
  

  speakDavid(announcement);
}

// === INITIAL LOAD
// === PRELOAD & WARM-UP ===
let voicesReady = false;

function warmUpVoices() {
  const voices = speechSynthesis.getVoices();
  if (!voices.length) {
    // Retry in 100ms until voices load
    return setTimeout(warmUpVoices, 100);
  }

  voicesReady = true;


  // Optional: Warm-up call (quiet and fast) - only if a voice is selected
  if (window.selectedVoice) {
    const dummy = new SpeechSynthesisUtterance("Initializing voice system.");
    dummy.volume = 0.001; // Silent
    dummy.rate = 1;
    dummy.voice = window.selectedVoice;
    speechSynthesis.speak(dummy);
  }
}

warmUpVoices();

window.onload = () => {
  // Load saved speech rate
  const savedRate = localStorage.getItem("speechRate");
  if (savedRate) {
    window.speechRate = parseFloat(savedRate);
    const rateSelect = document.getElementById("speechRateSelect");
    if (rateSelect) {
      rateSelect.value = savedRate;
    }
  }

  // Register Service Worker for PWA and notifications
  if ('serviceWorker' in navigator) {

    navigator.serviceWorker.register('./sw.js')
      .then(registration => {

        
        // Wait for service worker to be ready before checking notifications
        return navigator.serviceWorker.ready;
      })
      .then(registration => {

        
        // Check if notification permission is already granted
        if (Notification && Notification.permission === 'granted') {

          localStorage.setItem('notificationsEnabled', 'true');
        } else if (Notification && Notification.permission === 'default') {

        } else if (Notification && Notification.permission === 'denied') {

          localStorage.setItem('notificationsEnabled', 'false');
        }
      })
      .catch(registrationError => {
        console.error('❌ Service worker registration failed:', registrationError);
      });
  } else {

  }

  // Initialize page based on current page
  initializeCurrentPage();
  
  // Test localStorage functionality (especially important for iOS)
  testLocalStorage();

  // Load tasks on task master page only
  if (window.location.pathname.includes('taskmaster.html')) {

    const all = getTasks();

    
    all.forEach(task => {
      const ul = document.getElementById(`ul-${task.section}`);
      if (ul) {
        renderTask(task, ul);

      } else {
        console.warn(`Could not find ul element for section "${task.section}"`);
      }
    });

    if (all.length > 0) {
      window._clearMessageSpoken = false;
    }
  }
};

// === STORAGE + TASK HANDLING
function testLocalStorage() {
  try {
    const testKey = 'test_storage';
    const testValue = 'test_data';
    localStorage.setItem(testKey, testValue);
    const retrieved = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    
    if (retrieved === testValue) {

      return true;
    } else {
      console.error('❌ localStorage test failed - data mismatch');
      return false;
    }
  } catch (error) {
    console.error('❌ localStorage test failed:', error);
    return false;
  }
}

function getTasks() {
  try {
    const tasks = JSON.parse(localStorage.getItem("todos") || "[]");
    return tasks;
  } catch (error) {
    console.error('Error reading tasks from localStorage:', error);
    return [];
  }
}
async function saveTask(task) {
  try {
    const all = getTasks();
    all.push(task);
    
    // Save to Firebase if logged in, or localStorage if guest
    if (typeof saveTasks === 'function') {
      await saveTasks(all);
    } else {
      // Fallback to localStorage if firebase-data.js not loaded
      localStorage.setItem("todos", JSON.stringify(all));
    }
  } catch (error) {
    console.error('Error saving task:', error);
  }
}

async function removeTask(taskId) {
  const all = getTasks();
  const filtered = all.filter(t => t.id !== taskId);
  
  // Save to Firebase if logged in, or localStorage if guest
  if (typeof saveTasks === 'function') {
    await saveTasks(filtered);
  } else {
    // Fallback to localStorage if firebase-data.js not loaded
    localStorage.setItem("todos", JSON.stringify(filtered));
  }
  
  // Also remove from OneSignal scheduled tasks for iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  if (isIOS) {
    let scheduledTasks = JSON.parse(localStorage.getItem('scheduledOneSignalTasks') || '[]');
    scheduledTasks = scheduledTasks.filter(t => t.id !== taskId);
    localStorage.setItem('scheduledOneSignalTasks', JSON.stringify(scheduledTasks));

  }
}
function renderTask(task, ul) {
  const li = document.createElement("li");
  
  // Convert ISO string to local time for display
  const dueDate = new Date(task.time);
  const localTimeString = dueDate.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  li.textContent = `${task.task} — Due: ${localTimeString}`;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.setAttribute("aria-label", `Complete task: ${task.task}`);
  checkbox.style.marginRight = "10px";

  checkbox.addEventListener("change", async () => {
    if (checkbox.checked) {
      await removeTask(task.id);
      li.remove();
      const updated = getTasks();
      if (updated.length === 0 && !window._clearMessageSpoken) {
        window._clearMessageSpoken = true;
        setTimeout(() => speakWizLine("clear"), 1000);
      }
    }
  });

  li.prepend(checkbox);
  ul.appendChild(li);
}

// === NOTIFICATION CHECKER ===
// Check and request notifications with iOS PWA support
async function checkAndRequestNotifications() {
  if (!("Notification" in window)) {

    return;
  }

  const permission = Notification.permission;


  // Check if we're in a PWA (standalone mode)
  const isStandalone = window.navigator.standalone === true || 
                      window.matchMedia('(display-mode: standalone)').matches ||
                      window.matchMedia('(display-mode: fullscreen)').matches;



  if (permission === "default") {
    if (isStandalone) {
      // In PWA mode, request directly instead of showing custom prompt

      await requestNotificationPermission();
    } else {
      // In browser mode, request directly
      await requestNotificationPermission();
    }
  } else if (permission === "granted") {

    updateNotificationControls();
  }
}

function updateNotificationControls() {
  const enableBtn = document.getElementById('enableNotifications');
  const statusDiv = document.getElementById('notificationStatus');
  
  if (enableBtn && statusDiv) {
    setupNotificationControls();
  }
}

function updateNotificationControls() {
  const enableBtn = document.getElementById('enableNotifications');
  const statusDiv = document.getElementById('notificationStatus');
  
  if (enableBtn && statusDiv) {
    // Re-run the setup to update status
    setupNotificationControls();
  }
}

// === NOTIFICATION FUNCTIONS ===
async function requestNotificationPermission() {
  // Check if notifications are supported
  if (!("Notification" in window)) {

    return false;
  }

  // Check current permission status
  let permission = Notification.permission;


  if (permission === "default") {
    // Request permission directly (works on first visit)
    try {
      permission = await Notification.requestPermission();

    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }

  if (permission === "granted") {

    
    // Update UI controls
    updateNotificationControls();
    
    // Show a welcome notification to confirm it works
    setTimeout(() => {
      showWelcomeNotification();
    }, 1000);
    
    return true;
  } else if (permission === "denied") {

    
    // Update UI controls
    updateNotificationControls();
    
    return false;
  }

  return false;
}

function showWelcomeNotification() {
  if (Notification.permission === "granted") {
    const notification = new Notification("🎉 TaskMaster Pro", {
      body: "Notifications enabled! You'll get reminders for your tasks.",
      icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHJ4PSIxMiIgZmlsbD0iIzRmNDZlNSIvPgogIDxwYXRoIGQ9Ik0xOCAyNGw0IDRsOC04IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K",
      tag: "taskmaster-welcome",
      requireInteraction: false,
      silent: false
    });

    // Auto-close after 4 seconds
    setTimeout(() => {
      notification.close();
    }, 4000);
  }
}

function showNotification(task, isReminder = false) {

  
  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  

  
  if (!("Notification" in window)) {

    return;
  }
  

  
  if (Notification.permission !== "granted") {

    if (Notification.permission === "default") {

      Notification.requestPermission().then(permission => {

        if (permission === "granted") {
          showNotification(task, isReminder);
        }
      });
    }
    return;
  }
  

  
  const now = new Date();
  const due = new Date(task.time);
  const timeDiff = due - now;
  
  let title, body;
  
  if (isReminder) {
    const days = Math.floor(Math.abs(timeDiff) / (1000 * 60 * 60 * 24));
    const hours = Math.floor((Math.abs(timeDiff) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((Math.abs(timeDiff) % (1000 * 60 * 60)) / (1000 * 60));
    
    title = "TaskMaster Pro - Reminder";
    if (days > 0) {
      body = `${task.task}\nDue in ${days} day${days > 1 ? 's' : ''} and ${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      body = `${task.task}\nDue in ${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      body = `${task.task}\nDue in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  } else {
    title = "TaskMaster Pro - Task Due Now";
    body = `${task.task}\nThis task is due now!`;
  }


  const notification = new Notification(title, {
    body: body,
    icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHJ4PSIxMiIgZmlsbD0iIzRmNDZlNSIvPgogIDxwYXRoIGQ9Ik0xOCAyNGw0IDRsOC04IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K",
    tag: task.id,
    requireInteraction: false,
    badge: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0iIzRmNDZlNSIgeG1zbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iOCIgY3k9IjgiIHI9IjgiLz4KPC9zdmc+",
    silent: false,
    vibrate: isIOS ? undefined : [200, 100, 200]
  });



  // Handle notification click
  notification.onclick = () => {

    window.focus();
    notification.close();
  };

  // Auto-close notification after 10 seconds
  setTimeout(() => {
    notification.close();
  }, 10000);
}

// === DOM BUILD ===
async function createSections() {


  
  const sectionsDiv = document.getElementById("sections");

  
  if (!sectionsDiv) {

    return;
  }
  

  
  // Get fresh sections list (including any newly created custom lists) - now async
  const allSections = await getAllSections();
  


  
  // Update global SECTIONS for other functions
  SECTIONS = allSections;
  
  // Clear existing sections
  sectionsDiv.innerHTML = '';
  
  if (allSections.length === 0) {
    sectionsDiv.innerHTML = '<p style="color: #666; text-align: center; padding: 40px;">No lists found. <a href="list.html" style="color: #4f46e5;">Create your first list</a>!</p>';

    return;
  }
  

  
  allSections.forEach(section => {
  const details = document.createElement("details");
  details.className = "task-section";

  const summary = document.createElement("summary");
  summary.id = `summary-${section}`;
  summary.setAttribute("role", "button");
  summary.setAttribute("aria-expanded", "false");
  summary.setAttribute("aria-controls", `section-${section}`);
  summary.textContent = section;

  const wrapper = document.createElement("div");
  wrapper.id = `section-${section}`;

  const taskInput = document.createElement("input");
  taskInput.placeholder = "Task title";
  const messageInput = document.createElement("input");
  messageInput.placeholder = "Reminder message";
  const dateInput = document.createElement("input");
  dateInput.type = "datetime-local";
  
  // Create reminder dropdown
  const reminderLabel = document.createElement("div");
  reminderLabel.className = "form-label";
  reminderLabel.textContent = "Remind before:";
  
  const reminderSelect = document.createElement("select");
  const reminderOptions = [
    { value: "0", text: "At due time" },
    { value: "5", text: "5 minutes" },
    { value: "10", text: "10 minutes" },
    { value: "15", text: "15 minutes" },
    { value: "30", text: "30 minutes" },
    { value: "2880", text: "2 days" },
    { value: "7200", text: "5 days" },
    { value: "20160", text: "2 weeks" },
    { value: "30240", text: "3 weeks" },
    { value: "100800", text: "10 weeks" },
    { value: "43200", text: "1 month" },
    { value: "129600", text: "3 months" },
    { value: "525600", text: "1 year" },
    { value: "1576800", text: "3 years" }
  ];
  
  reminderOptions.forEach(option => {
    const optionElement = document.createElement("option");
    optionElement.value = option.value;
    optionElement.textContent = option.text;
    reminderSelect.appendChild(optionElement);
  });
  
  reminderSelect.value = "0"; // Default to "At due time"

  const addBtn = document.createElement("button");
  addBtn.textContent = "Add Task";

  const ul = document.createElement("ul");
  ul.id = `ul-${section}`;

  addBtn.onclick = async () => {
    const task = taskInput.value.trim();
    const msg = messageInput.value.trim();
    const time = dateInput.value;
    const reminderMinutes = parseInt(reminderSelect.value);
    if (!task || !time) return alert("Task name and due date/time are required.");
    const id = Date.now().toString();
    
    // Convert datetime-local value to ISO string (preserves local timezone)
    const localDate = new Date(time);
    const isoTime = localDate.toISOString();
    
    const data = { id, section, task, msg, time: isoTime, reminderMinutes };
    await saveTask(data);
    renderTask(data, ul);
    
    // Schedule notifications based on platform
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    if (isIOS) {
      if (window.oneSignalEnabled) {
        // Schedule OneSignal notification for iOS (production)
        scheduleOneSignalTaskReminder(data);
      } else if (window.iosNativeNotificationsAvailable) {
        // Fallback to iOS native notifications (localhost/development)

        // iOS native notifications are handled by the interval checker like desktop
      } else {

      }
    }
    // Desktop notifications are handled by the interval checker
    
    taskInput.value = "";
    messageInput.value = "";
    dateInput.value = "";
    reminderSelect.value = "0";
    window._clearMessageSpoken = false;
  };

  wrapper.appendChild(taskInput);
  wrapper.appendChild(messageInput);
  wrapper.appendChild(dateInput);
  wrapper.appendChild(reminderLabel);
  wrapper.appendChild(reminderSelect);
  wrapper.appendChild(addBtn);
  wrapper.appendChild(ul);

  details.appendChild(summary);
  details.appendChild(wrapper);
  sectionsDiv.appendChild(details);
});

// Render existing tasks after creating all sections
renderExistingTasks();
}

// === NOTIFICATION CHECKER ===
function startNotificationChecker() {
  if (!window._notifiedTaskIds) window._notifiedTaskIds = new Set();
  if (!window._reminderTaskIds) window._reminderTaskIds = new Set();
  if (!window._spokenTaskIds) window._spokenTaskIds = new Set();
  
  // Function to check tasks
  const checkTasks = () => {
    const now = new Date();
    const all = getTasks();
    
    sendTasksToServiceWorker();

    if (all.length === 0) {
      return;
    }

    all.forEach(task => {
      const due = new Date(task.time);
      const timeDiff = due - now; // milliseconds
      const timeDiffSeconds = Math.round(timeDiff / 1000);
      const timeDiffMinutes = Math.round(timeDiff / 1000 / 60);
      const reminderMinutes = task.reminderMinutes || 0;
      const reminderTime = reminderMinutes * 60 * 1000;
      
      // Check if within 2 minutes window (instead of 1 minute for better reliability)
      const notificationWindow = 120000; // 2 minutes in milliseconds
      
      if (reminderMinutes > 0 && timeDiff <= reminderTime && timeDiff > (reminderTime - notificationWindow) && !window._reminderTaskIds.has(task.id)) {

        window._reminderTaskIds.add(task.id);
        showNotification(task, true);
      }
      
      if (timeDiff <= notificationWindow && timeDiff >= -notificationWindow && !window._notifiedTaskIds.has(task.id)) {

        window._notifiedTaskIds.add(task.id);
        showNotification(task, false);
      }

      if (timeDiff <= notificationWindow && timeDiff >= -notificationWindow && !window._spokenTaskIds.has(task.id)) {
        window._spokenTaskIds.add(task.id);
        const reminderMessage = task.msg && task.msg.trim() ? task.msg : `Task: ${task.task}`;

        setTimeout(() => speakDavid(reminderMessage), 500);
      }
    });
  };
  
  // Check immediately on startup
  checkTasks();
  
  // Then check every 30 seconds (more frequent for better timing)
  setInterval(checkTasks, 30000);
}

// === RENDER EXISTING TASKS ===
function renderExistingTasks() {
  const all = getTasks();
  all.forEach(task => {
    const ul = document.getElementById(`ul-${task.section}`);
    if (ul) {
      renderTask(task, ul);
    }
  });
}

// === GET UPCOMING TASKS FUNCTION ===
function getUpcomingTasks() {
  const now = new Date();
  const all = getTasks();
  
  if (all.length === 0) {
  
  // Filter for overdue and upcoming tasks (within the next 24 hours)
  const relevant = all.filter(task => {
    const due = new Date(task.time);
    const timeDiff = due - now;
    const isRelevant = timeDiff <= 24 * 60 * 60 * 1000; // Include overdue and next 24 hours
    
    return isRelevant;
  });
  

  return relevant;
}

// === WIZ QUOTES
function speakWizLine(type = "startup") {
  const now = new Date();
  const all = getTasks();
  
  if (all.length === 0) {
    speakDavid("You have no tasks scheduled.");
    return;
  }
  
  // Filter for overdue tasks
  const overdue = all.filter(task => {
    const due = new Date(task.time);
    return due < now;
  });
  
  // Filter for upcoming tasks (within the next 24 hours)
  const upcoming = all.filter(task => {
    const due = new Date(task.time);
    const timeDiff = due - now;
    return timeDiff > 0 && timeDiff <= 24 * 60 * 60 * 1000; // Next 24 hours
  });
  
  let announcement = "";
  
  // Announce overdue tasks first
  if (overdue.length > 0) {
    // Sort overdue by how long they've been overdue (most overdue first)
    overdue.sort((a, b) => new Date(a.time) - new Date(b.time));
    
    announcement += `You have ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}. `;
    
    overdue.forEach((task, index) => {
      const due = new Date(task.time);
      const overdueTime = now - due;
      const days = Math.floor(overdueTime / (1000 * 60 * 60 * 24));
      const hours = Math.floor((overdueTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((overdueTime % (1000 * 60 * 60)) / (1000 * 60));
      
      let overdueString;
      if (days > 0) {
        overdueString = `overdue by ${days} day${days > 1 ? 's' : ''} and ${hours} hour${hours !== 1 ? 's' : ''}`;
      } else if (hours > 0) {
        overdueString = `overdue by ${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
      } else {
        overdueString = `overdue by ${minutes} minute${minutes !== 1 ? 's' : ''}`;
      }
      
      announcement += `${index + 1}. ${task.task} from ${task.section}, ${overdueString}. `;
    });
  }
  
  // Announce upcoming tasks
  if (upcoming.length > 0) {
    // Sort by due time
    upcoming.sort((a, b) => new Date(a.time) - new Date(b.time));
    
    if (overdue.length > 0) {
      announcement += `You also have ${upcoming.length} upcoming task${upcoming.length > 1 ? 's' : ''}. `;
    } else {
      announcement += `You have ${upcoming.length} upcoming task${upcoming.length > 1 ? 's' : ''}. `;
    }
    
    upcoming.forEach((task, index) => {
      const due = new Date(task.time);
      const timeDiff = due - now;
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      
      let timeString;
      if (hours > 0) {
        timeString = `in ${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
      } else {
        timeString = `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
      }
      
      announcement += `${index + 1}. ${task.task} from ${task.section}, due ${timeString}. `;
    });
  }
  
  // Handle case where no overdue or upcoming tasks
  if (overdue.length === 0 && upcoming.length === 0) {
    speakDavid("You have no overdue tasks and no tasks due in the next 24 hours.");
  } else {
    speakDavid(announcement);
  }
};

// === WIZ QUOTES
function speakWizLine(type = "startup") {
  const startupLines = [
    "Welcome back, G. Let's light this code up.",
    "Dashboard online. Hustle mode activated.",
    "Time to boss up. Wiz style.",
    "Ayo, let's make these reminders smoke.",
    "System check: All smooth. Let’s get it, player."
  ];
  const clearLines = [
    "Todo board clear. Just vibes left now.",
    "You handled that list like a pro.",
    "No tasks due. Only smoke and celebration today.",
    "Clean slate, G. That’s how it’s done.",
    "Zero stress. Maximum vibes. You earned it."
  ];
  const lines = type === "startup" ? startupLines : clearLines;
  const chosen = lines[Math.floor(Math.random() * lines.length)];
  speak(chosen);
}

// === TASKMASTER PAGE AUTH HANDLERS ===
// Check authentication state
auth.onAuthStateChanged(async (user) => {
  const welcomeMsg = document.getElementById('welcome-message');
  const guestNotice = document.getElementById('guest-notice');
  const usernameEl = document.getElementById('username');
  const adminLink = document.getElementById('admin-link');
  
  if (user) {
    const displayName = user.displayName || user.email.split('@')[0];
    if (usernameEl) usernameEl.textContent = displayName;
    if (welcomeMsg) {
      welcomeMsg.style.display = 'block';
      welcomeMsg.style.visibility = 'visible';
    }
    if (guestNotice) {
      guestNotice.style.display = 'none';
      guestNotice.style.visibility = 'hidden';
    }
    window.currentUser = user;
    window.isGuestMode = false;
    
    // Set user presence to online
    await setUserPresence(user, true);
    
    // Setup real-time task listener
    if (typeof setupTasksListener === 'function') {
      setupTasksListener();
    }
    
    // Reload sections from Firebase after authentication
    if (typeof createSections === 'function') {
      await createSections();
    }
    
    // Also check for list updates periodically
    setInterval(async () => {
      const currentSections = await getAllSections();
      const displayedSections = Array.from(document.querySelectorAll('[id^="summary-"]')).map(el => 
        el.textContent.trim()
      );
      
      if (currentSections.length !== displayedSections.length || 
          !currentSections.every(section => displayedSections.includes(section))) {
        await createSections();
      }
    }, 5000);
    
    // Show admin link if user is admin
    if (adminLink) {
      const userEmail = user.email ? user.email.toLowerCase().trim() : '';
      const adminEmail = 'fluffyfighter23@gmx.de';
      if (userEmail === adminEmail) {
        adminLink.style.display = 'inline-block';
      }
    }
  } else {
    if (welcomeMsg) {
      welcomeMsg.style.display = 'none';
      welcomeMsg.style.visibility = 'hidden';
    }
    if (guestNotice) {
      guestNotice.style.display = 'block';
      guestNotice.style.visibility = 'visible';
    }
    window.currentUser = null;
    window.isGuestMode = false;
    
    // Clean up task listener if exists
    if (window.tasksListenerUnsubscribe) {
      window.tasksListenerUnsubscribe();
      window.tasksListenerUnsubscribe = null;
    }
    
    // Clear any cached data
    localStorage.removeItem('todos');
    
    // Redirect to login page if on taskmaster page
    if (window.location.pathname.includes('taskmaster.html')) {
      window.location.href = 'account.html';
    }
  }
});

// Sign out function
async function signOut() {
  const user = auth.currentUser;
  if (user) {
    await setUserPresence(user, false);
  }
  
  auth.signOut().then(() => {
    alert('Signed out successfully!');
    window.location.reload();
  });
}

// Set user online/offline presence
function setUserPresence(user, online) {
  if (!user) return Promise.resolve();
  
  return db.collection('presence').doc(user.uid).set({
    online: online,
    username: user.displayName || user.email.split('@')[0],
    email: user.email,
    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }).catch(error => console.error('Error updating presence:', error));
}

// Heartbeat: Update lastSeen every 30 seconds
let heartbeatInterval;

auth.onAuthStateChanged((user) => {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  
  if (user) {
    setUserPresence(user, true);
    
    heartbeatInterval = setInterval(() => {
      db.collection('presence').doc(user.uid).update({
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(error => console.error('Heartbeat error:', error));
    }, 30000);
  }
});

// Mark user offline when closing tab/browser
window.addEventListener('beforeunload', () => {
  const user = auth.currentUser;
  if (user) {
    navigator.sendBeacon && db.collection('presence').doc(user.uid).update({
      online: false,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
});

// Listen for list updates from list.html
window.addEventListener('storage', async (e) => {
  if (e.key === 'list_update_trigger' || e.key === null) {
    setTimeout(async () => {
      if (typeof createSections === 'function') {
        await createSections();
      }
    }, 500);
  }
});

// Listen for focus events (when switching back to this tab)
window.addEventListener('focus', async () => {
  if (typeof getAllSections === 'function' && typeof createSections === 'function') {
    const currentSections = await getAllSections();
    const displayedSections = Array.from(document.querySelectorAll('[id^="summary-"]')).map(el => 
      el.textContent.trim()
    );
    
    if (currentSections.length !== displayedSections.length || 
        !currentSections.every(section => displayedSections.includes(section))) {
      await createSections();
    }
  }
});
