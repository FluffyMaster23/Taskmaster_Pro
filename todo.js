// === CONFIG ===
const DEFAULT_SECTIONS = [];

// Generate or get unique user ID for this browser/device
function getUserId() {
  let userId = localStorage.getItem('taskmaster_user_id');
  if (!userId) {
    // Generate unique user ID: timestamp + random string
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('taskmaster_user_id', userId);
    console.log('🆔 New user ID generated:', userId);
  }
  return userId;
}

// Function to get all sections (default + user's custom lists)
async function getAllSections() {
  console.log('🔍 getAllSections called');
  console.log('📊 Current user:', window.currentUser ? window.currentUser.uid : 'None');
  console.log('🎭 Guest mode:', window.isGuestMode);
  
  // Try to load from Firebase first if user is logged in
  if (window.currentUser && !window.isGuestMode && typeof loadCustomLists === 'function') {
    try {
      console.log('☁️ Loading custom lists from Firebase...');
      const customLists = await loadCustomLists();
      console.log('📦 Custom lists loaded:', customLists);
      const customListNames = customLists.map(list => list.name);
      console.log('📝 List names:', customListNames);
      return [...DEFAULT_SECTIONS, ...customListNames];
    } catch (error) {
      console.error('❌ Error loading custom lists from Firebase:', error);
    }
  }
  
  // Fallback to localStorage
  console.log('💾 Loading from localStorage...');
  const userId = getUserId();
  const userCustomListsKey = `taskmaster_custom_section_names_${userId}`;
  const customListNames = JSON.parse(localStorage.getItem(userCustomListsKey) || '[]');
  console.log('📝 localStorage list names:', customListNames);
  return [...DEFAULT_SECTIONS, ...customListNames];
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
    console.log('🧹 Clearing all localStorage data...');
    localStorage.clear();
    
    // Reset global variables
    window._clearMessageSpoken = false;
    window._spokenTaskIds = new Set();
    window._notifiedTaskIds = new Set();
    window._reminderTaskIds = new Set();
    window.selectedVoice = null;
    window.speechRate = 1;
    window._greetingSpoken = false;
    
    console.log('✅ All data cleared! Refresh the page to start fresh.');
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
        console.log('Custom lists updated, refreshing sections...');
        await createSections();
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
      console.log('Unknown page, using default initialization');
  }
}

function initializeTaskMasterPage() {
  console.log('Initializing TaskMaster page');
  
  // Setup voice functionality
  setupVoiceFunctionality();
  
  // Setup Firebase Cloud Messaging for notifications
  initializeFirebaseMessaging();
  
  // Create task sections (now async)
  createSections();
  
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
      console.log('🔘 Check Upcoming Todos button clicked');
      const upcoming = getUpcomingTasks();
      console.log('📋 Found upcoming tasks:', upcoming.length);
      console.log('📋 Upcoming tasks details:', upcoming);
      
      if (upcoming.length === 0) {
        // Use the clear message when no upcoming tasks
        console.log('📭 No upcoming tasks - playing clear message');
        // Always play the clear message when manually requested, reset the flag first
        window._clearMessageSpoken = false;
        setTimeout(() => speakWizLine("clear"), 1000);
      } else {
        console.log('🔊 Speaking upcoming tasks...');
        upcoming.forEach((task, index) => {
          console.log(`📢 Scheduling task ${index + 1}/${upcoming.length}: ${task.task}`);
          setTimeout(() => speakTask(task), index * 3000); // 3 second delay between tasks
        });
      }
    });
  } else {
    console.log('⚠️ Check Upcoming button not found');
  }
  
  // Start the notification checker
  startNotificationChecker();
}

function initializeOptionsPage() {
  console.log('Initializing Options page');
  
  // Setup voice functionality for the options page
  setupVoiceFunctionality();
  
  // Force voice loading with a small delay to ensure DOM is ready
  setTimeout(() => {
    console.log('Force-loading voices after page initialization');
    loadVoices();
  }, 500);
}

function initializeHomePage() {
  console.log('Initializing Home page');
  
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
        console.log('Mobile detected - speech will play after first user interaction');
        
        // Add click listener to enable speech after first user interaction
        const enableMobileSpeech = () => {
          console.log('First user interaction - enabling speech');
          speak(greeting);
          document.removeEventListener('click', enableMobileSpeech);
          document.removeEventListener('touchstart', enableMobileSpeech);
        };
        
        // Try to speak immediately, but also add fallback
        try {
          speak(greeting);
        } catch (e) {
          console.log('Speech blocked, waiting for user interaction');
          document.addEventListener('click', enableMobileSpeech, { once: true });
          document.addEventListener('touchstart', enableMobileSpeech, { once: true });
        }
      } else {
        // Desktop - just speak directly
        speak(greeting);
      }
    }
  } else {
    console.log('No voice selected - skipping greeting for new user');
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
  
  if (isIOS && isSafari) {
    return initializeOneSignal();
  }
  
  try {
    if (!firebase.messaging.isSupported()) {
      return initializeNativeNotifications();
    }
    
    messaging = firebase.messaging();
    
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          
          fcmToken = await messaging.getToken({
            vapidKey: 'BCS6sik162IJiqA7odT7O6wGCaffPepZvCHeUWuHReHQrSkQOybm1XWOLZY6ChJP9cYJ25ytTVdwgMK-tJL19ag',
            serviceWorkerRegistration: registration
          });
          
          if (fcmToken) {
            localStorage.setItem('fcm_token', fcmToken);
            window.fcmEnabled = true;
          }
        } catch (swError) {
          initializeNativeNotifications();
        }
      }
      
      messaging.onMessage((payload) => {
        const notificationTitle = payload.notification?.title || 'TaskMaster Pro';
        const notificationOptions = {
          body: payload.notification?.body || payload.data?.body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: payload.data?.tag || 'taskmaster',
          requireInteraction: false,
          data: payload.data
        };
        
        if (Notification.permission === 'granted') {
          new Notification(notificationTitle, notificationOptions);
        }
      });
      
      messaging.onTokenRefresh(async () => {
        try {
          const newToken = await messaging.getToken();
          localStorage.setItem('fcm_token', newToken);
          fcmToken = newToken;
        } catch (error) {}
      });
      
    }
    
  } catch (error) {
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
  
  OneSignal.push(function() {
    OneSignal.getUserId().then(function(userId) {
      if (userId) {
        let title, message;
        
        if (isReminder) {
          const dueTime = new Date(task.time);
          const now = new Date();
          const timeDiff = dueTime - now;
          const hours = Math.floor(timeDiff / (1000 * 60 * 60));
          const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
          
          title = "⏰ TaskMaster Pro - Reminder";
          if (hours > 0) {
            message = `${task.task} - Due in ${hours}h ${minutes}m`;
          } else {
            message = `${task.task} - Due in ${minutes} minutes`;
          }
        } else {
          title = "🚨 TaskMaster Pro - Task Due Now!";
          message = `${task.task} - This task is due now!`;
        }
        
        // Use OneSignal's sendSelfNotification for background delivery
        OneSignal.sendSelfNotification(
          title,
          message,
          window.location.href, // URL to open when clicked
          "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHJ4PSIxMiIgZmlsbD0iIzRmNDZlNSIvPgogIDxwYXRoIGQ9Ik0xOCAyNGw0IDRsOC04IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K", // App icon
          {
            // Data payload for the notification
            task_id: task.id,
            task_title: task.task,
            is_reminder: isReminder.toString(),
            due_time: task.time
          }
        ).then(function() {
          console.log('Background notification sent successfully');
        }).catch(function(error) {
          console.error('Failed to send background notification:', error);
        });
      }
    });
  });
}
// === END ONESIGNAL IMPLEMENTATION ===

// === VOICE FUNCTIONALITY SETUP ===
function setupVoiceFunctionality() {
  // Only setup if voice elements exist on this page
  if (!document.getElementById("voiceSelect") && !document.getElementById("speechRateSelect")) {
    console.log('Voice elements not found on this page, skipping voice setup');
    return;
  }
  
  console.log('✅ Setting up voice functionality - voiceSelect element found');
  
  // Load voices when they're ready
  window.speechSynthesis.onvoiceschanged = () => {
    console.log('🔄 speechSynthesis.onvoiceschanged event fired');
    loadVoices();
  };
  
  // Also try loading immediately (for some browsers)
  console.log('🔄 Attempting immediate voice loading');
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
        console.log('Voice cleared - "Choose voice" option selected');
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
        
        console.log('Voice changed and saved:', {
          dropdownIndex: e.target.selectedIndex,
          originalVoiceIndex: originalVoiceIndex,
          name: selectedVoiceObj.name,
          lang: selectedVoiceObj.lang,
          voiceObject: selectedVoiceObj
        });
        
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
      console.log('Speech rate changed and saved:', e.target.value);
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
      console.log('✅ Restored speech rate:', savedRate);
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
          
          console.log('✅ Restored voice by index:', {
            originalIndex: index,
            dropdownIndex: i,
            name: voices[index].name,
            lang: voices[index].lang,
            voiceObject: voices[index]
          });
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
          
          console.log('✅ Restored voice by name:', {
            name: savedVoiceName,
            originalIndex: originalIndex,
            dropdownIndex: i,
            voiceObject: voices[originalIndex]
          });
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
    console.log('✅ No saved voice - defaulting to "Choose voice" option');
  }
}

// === VOICE LOADING ===
function loadVoices() {
  const voiceSelect = document.getElementById("voiceSelect");
  
  if (!voiceSelect) {
    console.log('voiceSelect element not found, skipping voice loading');
    return;
  }
  
  voiceSelect.innerHTML = "";
  
  const voices = speechSynthesis.getVoices();
  console.log('Available voices:', voices.length);
  
  if (voices.length === 0) {
    // Retry loading voices after a short delay
    console.log('No voices found, retrying...');
    setTimeout(loadVoices, 100);
    return;
  }
  
  console.log('Loading', voices.length, 'voices into dropdown');
  
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
    console.log(`iOS detected: Filtered to ${filteredVoices.length} iOS voices`);
  } else {
    // For non-iOS, filter for English voices or all voices if no English found
    filteredVoices = voices.filter(v => v.lang.startsWith("en"));
    if (filteredVoices.length === 0) {
      filteredVoices = voices; // Use all voices if no English ones
    }
    console.log(`Desktop detected: Using ${filteredVoices.length} English voices`);
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
  console.log('Set default to "Choose voice" option');

  // Load saved voice preferences after voices are populated
  loadSavedVoicePreferences();
  
  console.log('✅ Voice loading complete');
}

// === SPEAK (User-selected voice)
function speak(text) {
  console.log('🔊 speak() called with:', text);
  
  const utter = new SpeechSynthesisUtterance(text);
  
  if (window.selectedVoice) {
    // selectedVoice is now a voice object, not a string
    utter.voice = window.selectedVoice;
    console.log('Using selected voice:', window.selectedVoice.name);
  } else {
    // Fallback to first available voice
    const voices = speechSynthesis.getVoices();
    console.log('Available voices:', voices.length);
    if (voices.length > 0) {
      utter.voice = voices[0];
      console.log('Using fallback voice:', voices[0].name);
    } else {
      console.log('⚠️ No voices available');
    }
  }
  
  utter.lang = "en-US";
  utter.rate = window.speechRate || 1; // Use selected speech rate
  utter.pitch = 1;
  utter.volume = 1;
  
  // Add event listeners for debugging
  utter.onstart = () => console.log('speak() - Speech started');
  utter.onend = () => console.log('speak() - Speech ended');
  utter.onerror = (event) => console.error('speak() - Speech error:', event);
  
  // Clear any pending speech and speak
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

// === SPEAK DAVID (used for reminders, task reports)
function speakDavid(text) {
  console.log('🔊 Speaking:', text);
  
  const utter = new SpeechSynthesisUtterance(text);
  
  // Always use the selected voice instead of trying to find David
  if (window.selectedVoice) {
    console.log('Using selected voice:', window.selectedVoice.name);
    utter.voice = window.selectedVoice;
  } else {
    // Fallback to first available voice
    const voices = speechSynthesis.getVoices();
    console.log('Available voices:', voices.length);
    if (voices.length > 0) {
      utter.voice = voices[0];
      console.log('Using fallback voice:', voices[0].name);
    } else {
      console.log('⚠️ No voices available yet, using default voice');
    }
  }
  
  utter.lang = "en-US";
  utter.rate = window.speechRate || 1; // Use selected speech rate
  utter.pitch = 1;
  utter.volume = 1;
  
  // Add event listeners for debugging
  utter.onstart = () => console.log('Speech started');
  utter.onend = () => console.log('Speech ended');
  utter.onerror = (event) => console.error('Speech error:', event);
  
  // Clear any pending speech and speak
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

// === SPEAK TASK (for upcoming tasks)
function speakTask(task) {
  console.log('🗣️ Speaking task:', task.task, 'due:', task.time);
  
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
  
  console.log('📢 Announcement:', announcement);
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
  console.log('✅ Voices ready, count:', voices.length);

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
    document.getElementById("speechRateSelect").value = savedRate;
  }

  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  }

  // Initialize page based on current page
  initializeCurrentPage();
  
  // Test localStorage functionality (especially important for iOS)
  testLocalStorage();

  // Load tasks on task master page only
  if (window.location.pathname.includes('taskmaster.html')) {
    console.log('Loading tasks on TaskMaster page...');
    const all = getTasks();
    console.log(`Found ${all.length} tasks to render:`, all);
    
    all.forEach(task => {
      const ul = document.getElementById(`ul-${task.section}`);
      if (ul) {
        renderTask(task, ul);
        console.log(`Rendered task "${task.name}" in section "${task.section}"`);
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

  if (hour >= 5 && hour < 12) {
    greeting = "Morning, G. Let’s get the day rolling.";
  } else if (hour >= 12 && hour < 18) {
    greeting = "Afternoon, boss. Time to knock some things out.";
  } else {
    greeting = "Evening, player. Still grinding?";
  }

  speak(greeting);

// === STORAGE + TASK HANDLING
function testLocalStorage() {
  try {
    const testKey = 'test_storage';
    const testValue = 'test_data';
    localStorage.setItem(testKey, testValue);
    const retrieved = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    
    if (retrieved === testValue) {
      console.log('✅ localStorage is working properly');
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
    const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
    console.log(`getTasks(): Found ${tasks.length} tasks in localStorage`);
    return tasks;
  } catch (error) {
    console.error('Error reading tasks from localStorage:', error);
    return [];
  }
}
function saveTask(task) {
  try {
    const all = getTasks();
    all.push(task);
    localStorage.setItem("tasks", JSON.stringify(all));
    console.log(`saveTask(): Saved task "${task.name}" to localStorage. Total tasks: ${all.length}`);
  } catch (error) {
    console.error('Error saving task to localStorage:', error);
  }
}
function removeTask(taskId) {
  const all = getTasks();
  const filtered = all.filter(t => t.id !== taskId);
  localStorage.setItem("tasks", JSON.stringify(filtered));
  
  // Also remove from OneSignal scheduled tasks for iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  if (isIOS) {
    let scheduledTasks = JSON.parse(localStorage.getItem('scheduledOneSignalTasks') || '[]');
    scheduledTasks = scheduledTasks.filter(t => t.id !== taskId);
    localStorage.setItem('scheduledOneSignalTasks', JSON.stringify(scheduledTasks));
    console.log('Removed task from OneSignal schedule:', taskId);
  }
}
function renderTask(task, ul) {
  const li = document.createElement("li");
  li.textContent = `${task.task} — Due: ${new Date(task.time).toLocaleString()}`;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.setAttribute("aria-label", `Complete task: ${task.task}`);
  checkbox.style.marginRight = "10px";

  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      removeTask(task.id);
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
// Notification checker function (checks for upcoming tasks and sends notifications)
    return;
  }

  const permission = Notification.permission;
  const hasAskedBefore = localStorage.getItem('notificationAsked');
  const isFirstVisit = !hasAskedBefore;

  console.log("Notification permission:", permission);
  console.log("First visit:", isFirstVisit);

  // Only show automatic prompt on first visit (like Windows)
  if (isFirstVisit && permission === "default") {
    // Mark that we've asked before
    localStorage.setItem('notificationAsked', 'true');
    
    // Wait for page to fully load, then request
    setTimeout(async () => {
      console.log("First visit - requesting notification permission");
      await requestNotificationPermission();
    }, 1500);
  } else if (permission === "granted") {
    console.log("Notifications already enabled");
    updateNotificationControls();
  } else {
    // Not first visit, just update UI
    updateNotificationControls();
  }
}

// Check and request notifications with iOS PWA support
async function checkAndRequestNotifications() {
  if (!("Notification" in window)) {
    console.log("Notifications not supported");
    return;
  }

  const permission = Notification.permission;
  console.log("Notification permission status:", permission);

  // Check if we're in a PWA (standalone mode)
  const isStandalone = window.navigator.standalone === true || 
                      window.matchMedia('(display-mode: standalone)').matches ||
                      window.matchMedia('(display-mode: fullscreen)').matches;

  console.log("Running in standalone mode:", isStandalone);

  if (permission === "default") {
    if (isStandalone) {
      // In PWA mode, request directly instead of showing custom prompt
      console.log("PWA detected - requesting notification permission directly");
      await requestNotificationPermission();
    } else {
      // In browser mode, request directly
      await requestNotificationPermission();
    }
  } else if (permission === "granted") {
    console.log("Notifications already enabled");
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
    console.log("This browser does not support notifications");
    return false;
  }

  // Check current permission status
  let permission = Notification.permission;
  console.log("Current notification permission:", permission);

  if (permission === "default") {
    // Request permission directly (works on first visit)
    try {
      permission = await Notification.requestPermission();
      console.log("Notification permission after request:", permission);
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }

  if (permission === "granted") {
    console.log("✅ Notifications enabled!");
    
    // Update UI controls
    updateNotificationControls();
    
    // Show a welcome notification to confirm it works
    setTimeout(() => {
      showWelcomeNotification();
    }, 1000);
    
    return true;
  } else if (permission === "denied") {
    console.log("❌ Notifications blocked");
    
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
    silent: false
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
    console.log('Sections div not found, skipping section creation');
    return;
  }
  
  // Get fresh sections list (including any newly created custom lists) - now async
  const allSections = await getAllSections();
  
  // Update global SECTIONS for other functions
  SECTIONS = allSections;
  
  // Clear existing sections
  sectionsDiv.innerHTML = '';
  
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

  addBtn.onclick = () => {
    const task = taskInput.value.trim();
    const msg = messageInput.value.trim();
    const time = dateInput.value;
    const reminderMinutes = parseInt(reminderSelect.value);
    if (!task || !time) return alert("Task name and due date/time are required.");
    const id = Date.now().toString();
    const data = { id, section, task, msg, time, reminderMinutes };
    saveTask(data);
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
        console.log('📱 Using iOS native notifications for task:', data.task);
        // iOS native notifications are handled by the interval checker like desktop
      } else {
        console.log('⚠️ No iOS notification system available');
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
  
  sendTasksToServiceWorker();
  
setInterval(() => {
  const now = new Date();
  const all = getTasks();
  
  sendTasksToServiceWorker();

  all.forEach(task => {
    const due = new Date(task.time);
    const timeDiff = due - now;
    const reminderMinutes = task.reminderMinutes || 0;
    const reminderTime = reminderMinutes * 60 * 1000;
    
    if (reminderMinutes > 0 && timeDiff <= reminderTime && timeDiff > reminderTime - 60000 && !window._reminderTaskIds.has(task.id)) {
      window._reminderTaskIds.add(task.id);
      showNotification(task, true);
    }
    
    if (timeDiff <= 60000 && timeDiff >= -60000 && !window._notifiedTaskIds.has(task.id)) {
      window._notifiedTaskIds.add(task.id);
      showNotification(task, false);
    }

    if (timeDiff <= 60000 && timeDiff >= -60000 && !window._spokenTaskIds.has(task.id)) {
      window._spokenTaskIds.add(task.id);
      const reminderMessage = task.msg && task.msg.trim() ? task.msg : `Task: ${task.task}`;
      setTimeout(() => speakDavid(reminderMessage), 500);
    }
  });
}, 60000);
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
  
  console.log('📅 Current time:', now.toISOString());
  console.log('📋 All tasks:', all.length);
  
  if (all.length === 0) {
    console.log('📭 No tasks found in storage');
    return [];
  }
  
  // Filter for overdue and upcoming tasks (within the next 24 hours)
  const relevant = all.filter(task => {
    const due = new Date(task.time);
    const timeDiff = due - now;
    const isRelevant = timeDiff <= 24 * 60 * 60 * 1000; // Include overdue and next 24 hours
    
    console.log(`⏰ Task "${task.task}" due ${due.toISOString()}, diff: ${Math.round(timeDiff / 1000 / 60)} minutes, relevant: ${isRelevant}`);
    
    return isRelevant;
  });
  
  console.log('🎯 Filtered relevant tasks:', relevant.length);
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
