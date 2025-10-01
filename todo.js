// === CONFIG ===
const SECTIONS = ["Blogging", "YouTube", "UCLA Simulation", "School", "Admin", "Miscellaneous"];

window._clearMessageSpoken = false;
window._spokenTaskIds = new Set();
window._notifiedTaskIds = new Set(); // Track which tasks already sent notifications
window._reminderTaskIds = new Set(); // Track which tasks already sent advance reminders
window.selectedVoice = null;
window.speechRate = 1; // Default speech rate

// === PWA INSTALL BUTTON LOGIC ===
let deferredPrompt;
window.addEventListener('DOMContentLoaded', function() {
  const installBtn = document.getElementById('installBtn');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.style.display = 'block';
  });
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          installBtn.style.display = 'none';
        }
        deferredPrompt = null;
      }
    });
  }

  // Initialize OneSignal for iOS
  initializeOneSignal();
  
  // Check if PWA is installed on home screen
  checkPWAInstallation();
  
  // Page-specific initialization
  initializeCurrentPage();
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
  
  // Setup notification system
  setupAppleNotifications();
  
  // Create task sections
  createSections();
  
  // Setup upcoming tasks checker
  const checkUpcomingBtn = document.getElementById('checkUpcoming');
  if (checkUpcomingBtn) {
    checkUpcomingBtn.addEventListener('click', () => {
      const upcoming = getUpcomingTasks();
      if (upcoming.length === 0) {
        speakWizLine("no upcoming");
      } else {
        upcoming.forEach(task => speakTask(task));
      }
    });
  }
  
  // Start the notification checker
  startNotificationChecker();
}

function initializeOptionsPage() {
  console.log('Initializing Options page');
  
  // Setup voice functionality for the options page
  setupVoiceFunctionality();
}

function initializeHomePage() {
  console.log('Initializing Home page');
  
  // Initialize OneSignal and notifications on home page too
  // This ensures the auto-prompt shows on first visit
  setupAppleNotifications();
  
  // Start notification checker even on home page for background notifications
  startNotificationChecker();
}

// === PWA HOME SCREEN DETECTION ===
function checkPWAInstallation() {
  // Check if app is running in standalone mode (added to home screen)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIOSStandalone = window.navigator.standalone === true;
  
  if (isStandalone || isIOSStandalone) {
    console.log('🎉 PWA detected as home screen app!');
    
    // Small delay to ensure everything is loaded
    setTimeout(() => {
      sendPWAWelcomeNotification();
    }, 2000);
  }
}

function sendPWAWelcomeNotification() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  if (isIOS) {
    // For iOS, only send welcome notification if user already has notifications enabled
    window.OneSignal.push(function() {
      window.OneSignal.isPushNotificationsEnabled(function(isEnabled) {
        if (isEnabled) {
          // Send welcome notification using existing permission
          sendIOSWelcomeNotification();
        } else {
          // User hasn't enabled notifications yet, just log
          console.log('PWA added to home screen, but notifications not enabled yet');
        }
      });
    });
  } else if (!isIOS && Notification.permission === "granted") {
    // Send native notification for desktop
    const notification = new Notification("🏠 Welcome to TaskMaster Pro!", {
      body: "App successfully added to home screen! You're ready to master your tasks.",
      icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHJ4PSIxMiIgZmlsbD0iIzRmNDZlNSIvPgogIDxwYXRoIGQ9Ik0xOCAyNGw0IDRsOC04IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K",
      tag: "pwa-welcome",
      requireInteraction: false,
      silent: false
    });
    
    // Auto-close after 6 seconds
    setTimeout(() => {
      notification.close();
    }, 6000);
  }
}

function sendIOSWelcomeNotification() {
  window.OneSignal.push(function() {
    window.OneSignal.sendSelfNotification(
      "🏠 Welcome to TaskMaster Pro!", 
      "App successfully added to home screen! You're ready to master your tasks.",
      "https://fluffymaster23.github.io/Taskmaster_Pro/", // URL when notification is clicked
      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHJ4PSIxMiIgZmlsbD0iIzRmNDZlNSIvPgogIDxwYXRoIGQ9Ik0xOCAyNGw0IDRsOC04IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K" // icon
    );
    console.log('iOS welcome notification sent');
  });
}
// === END PWA HOME SCREEN DETECTION ===
// === END PWA INSTALL BUTTON LOGIC ===

// === ONESIGNAL INITIALIZATION ===
function initializeOneSignal() {
  // Only initialize OneSignal on iOS devices
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  if (!isIOS) {
    console.log('Not iOS - using native notifications');
    return;
  }
  
  console.log('iOS detected - initializing OneSignal');
  
  window.OneSignal = window.OneSignal || [];
  OneSignal.push(function() {
    OneSignal.init({
      appId: "194275f5-45ac-4ac1-85ff-924bbe00f066", // Your real OneSignal App ID
      safari_web_id: "web.onesignal.auto.194275f5-45ac-4ac1-85ff-924bbe00f066", // Auto-generated Safari Web ID
      notifyButton: {
        enable: false, // We'll use our own button
      },
      allowLocalhostAsSecureOrigin: true,
      autoRegister: true, // Enable auto registration for auto prompt
      autoResubscribe: true,
      serviceWorkerParam: {
        scope: './',
        // Enhanced service worker config for background notifications
        updateViaCache: 'none'
      },
      serviceWorkerPath: 'OneSignalSDKWorker.js',
      // Enhanced iOS background notification settings
      persistNotification: true, // Keep notifications visible
      showCreatedAt: true, // Show timestamp
      requiresUserPrivacyConsent: false, // Don't block notifications with privacy consent
      allowLocalhostAsSecureOrigin: true, // Allow localhost testing
      welcomeNotification: {
        disable: true // Don't show welcome notification
      },
      promptOptions: {
        slidedown: {
          prompts: [
            {
              type: "push",
              autoPrompt: true, // Enable auto prompt since you configured it in dashboard
              text: {
                actionMessage: "Get notified when your tasks are due! TaskMaster Pro will remind you about upcoming deadlines even when the app is closed.",
                acceptButton: "Enable Reminders",
                cancelButton: "Not Now"
              }
            }
          ]
        }
        
      }
    });

    // Check subscription status
    OneSignal.isPushNotificationsEnabled(function(isEnabled) {
      console.log('OneSignal subscription status:', isEnabled);
      window.oneSignalEnabled = isEnabled;
    });

    // Listen for subscription changes
    OneSignal.on('subscriptionChange', function (isSubscribed) {
      console.log("OneSignal subscription changed:", isSubscribed);
      window.oneSignalEnabled = isSubscribed;

    });
  });
}

// Request permission for task deadline reminders (main prompt)
function requestTaskReminderPermission() {
  console.log('Requesting OneSignal permission for task deadline reminders');
  window.OneSignal.push(function() {
    window.OneSignal.showSlidedownPrompt().then(function() {
      console.log('Task reminder prompt shown');
      
      // Listen for the user's response
      window.OneSignal.on('subscriptionChange', function (isSubscribed) {
        if (isSubscribed) {
          console.log('✅ User enabled task reminder notifications!');
          window.oneSignalEnabled = true;
          
          // Send a test notification to confirm it's working
          setTimeout(() => {
            sendTaskReminderTestNotification();
          }, 1000);
        }
      });
    }).catch(function(error) {
      console.error('Error showing task reminder prompt:', error);
    });
  });
}

// Send test notification for task reminders
function sendTaskReminderTestNotification() {
  window.OneSignal.push(function() {
    window.OneSignal.sendSelfNotification(
      "🎉 Task Reminders Active!",
      "Perfect! You'll now get notified when your tasks are due, even when the app is closed.",
      window.location.href,
      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHJ4PSIxMiIgZmlsbD0iIzRmNDZlNSIvPgogIDxwYXRoIGQ9Ik0xOCAyNGw0IDRsOC04IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K"
    ).then(function() {
      console.log('Task reminder test notification sent successfully');
    }).catch(function(error) {
      console.error('Failed to send task reminder test notification:', error);
    });
  });
}

function requestOneSignalPermission() {
  console.log('Requesting OneSignal permission');
  OneSignal.push(function() {
    OneSignal.registerForPushNotifications().then(function() {
      console.log('OneSignal registration successful');
    }).catch(function(e) {
      console.error('OneSignal registration failed:', e);
    });
  });
}

function scheduleOneSignalTaskReminder(task) {
  if (!window.oneSignalEnabled) return;
  
  console.log('Scheduling OneSignal task reminder for:', task.task);
  
  // Get user's OneSignal Player ID for server-side scheduling
  OneSignal.push(function() {
    OneSignal.getUserId().then(function(userId) {
      if (userId) {
        console.log('OneSignal User ID:', userId);
        
        // Calculate reminder time
        const dueTime = new Date(task.time);
        const reminderMinutes = task.reminderMinutes || 0;
        const reminderTime = new Date(dueTime.getTime() - (reminderMinutes * 60 * 1000));
        
        // Store task data for background notifications
        const taskData = {
          id: task.id,
          title: task.task,
          message: task.msg,
          dueTime: dueTime.toISOString(),
          reminderTime: reminderTime.toISOString(),
          reminderMinutes: reminderMinutes,
          userId: userId
        };
        
        // Store in localStorage for background processing
        let scheduledTasks = JSON.parse(localStorage.getItem('scheduledOneSignalTasks') || '[]');
        // Remove any existing task with same ID
        scheduledTasks = scheduledTasks.filter(t => t.id !== task.id);
        // Add new task
        scheduledTasks.push(taskData);
        localStorage.setItem('scheduledOneSignalTasks', JSON.stringify(scheduledTasks));
        
        console.log('Task scheduled for OneSignal background notifications');
        
        // Also set up client-side fallback for immediate notifications
        const now = new Date();
        const timeUntilReminder = reminderTime.getTime() - now.getTime();
        const timeUntilDue = dueTime.getTime() - now.getTime();
        
        // Schedule reminder notification if time is reasonable (less than 24 hours)
        if (timeUntilReminder > 0 && timeUntilReminder <= 24 * 60 * 60 * 1000) {
          setTimeout(() => {
            sendOneSignalBackgroundNotification(task, true); // isReminder = true
          }, timeUntilReminder);
        }
        
        // Schedule due notification if time is reasonable (less than 24 hours)
        if (timeUntilDue > 0 && timeUntilDue <= 24 * 60 * 60 * 1000) {
          setTimeout(() => {
            sendOneSignalBackgroundNotification(task, false); // isReminder = false
          }, timeUntilDue);
        }
      }
    });
  });
}

function sendOneSignalBackgroundNotification(task, isReminder = false) {
  if (!window.oneSignalEnabled) return;
  
  console.log('Sending OneSignal background notification for:', task.task);
  
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
  
  console.log('Setting up voice functionality');
  
  // Load voices when they're ready
  window.speechSynthesis.onvoiceschanged = loadVoices;
  
  // Also try loading immediately (for some browsers)
  loadVoices();
  
  // Setup voice select event listener
  const voiceSelect = document.getElementById("voiceSelect");
  if (voiceSelect) {
    voiceSelect.addEventListener("change", e => {
      window.selectedVoice = e.target.value;
      // Save voice preference to localStorage
      localStorage.setItem("selectedVoice", e.target.value);
      console.log('Voice changed and saved:', e.target.value);
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
    }
  }
  
  // Load saved voice (will be applied when voices are loaded)
  const savedVoice = localStorage.getItem("selectedVoice");
  if (savedVoice) {
    window.selectedVoice = savedVoice;
  }
}

// === VOICE LOADING ===
function loadVoices() {
  const voiceSelect = document.getElementById("voiceSelect");
  voiceSelect.innerHTML = "";
  
  const voices = speechSynthesis.getVoices();
  console.log('Available voices:', voices.length);
  
  if (voices.length === 0) {
    // Retry loading voices after a short delay
    setTimeout(loadVoices, 100);
    return;
  }
  
  // Filter for English voices or all voices if no English found
  let filteredVoices = voices.filter(v => v.lang.startsWith("en"));
  if (filteredVoices.length === 0) {
    filteredVoices = voices; // Use all voices if no English ones
  }
  
  // Sort voices by name for better organization
  filteredVoices.sort((a, b) => a.name.localeCompare(b.name));
  
  filteredVoices.forEach(voice => {
    const option = document.createElement("option");
    option.value = voice.name;
    option.textContent = `${voice.name} (${voice.lang})`;
    voiceSelect.appendChild(option);
  });
  
  // Load saved voice preference or set default
  const savedVoice = localStorage.getItem("selectedVoice");
  let defaultVoice = null;
  
  if (savedVoice) {
    // Use saved voice if available
    defaultVoice = filteredVoices.find(v => v.name === savedVoice);
  }
  
  if (!defaultVoice) {
    // Check if we're on iOS/mobile
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isIOS || isMobile) {
      // Prefer iOS/mobile voices
      defaultVoice = filteredVoices.find(v => 
        v.name.includes("Samantha") || 
        v.name.includes("Alex") || 
        v.name.includes("Daniel") ||
        v.name.includes("Karen") ||
        v.localService === true // iOS voices are usually local
      );
    } else {
      // Desktop - prefer Google voices
      defaultVoice = filteredVoices.find(v => v.name === "Google US English");
    }
  }
  
  // Fallback to first available voice
  if (!defaultVoice && filteredVoices.length > 0) {
    defaultVoice = filteredVoices[0];
  }
  
  if (defaultVoice) {
    window.selectedVoice = defaultVoice.name;
    voiceSelect.value = defaultVoice.name;
    console.log('Selected voice:', defaultVoice.name);
  }
}

// === SPEAK (User-selected voice)
function speak(text) {
  const utter = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  
  if (window.selectedVoice) {
    const voice = voices.find(v => v.name === window.selectedVoice);
    if (voice) {
      utter.voice = voice;
    }
  }
  
  utter.lang = "en-US";
  utter.rate = window.speechRate || 1; // Use selected speech rate
  utter.pitch = 1;
  utter.volume = 1;
  
  // Clear any pending speech and speak
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

// === SPEAK DAVID (used for reminders, task reports)
function speakDavid(text) {
  const utter = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  
  // Always use the selected voice instead of trying to find David
  if (window.selectedVoice) {
    const voice = voices.find(v => v.name === window.selectedVoice);
    if (voice) {
      utter.voice = voice;
    }
  }
  
  // Fallback to any available voice if selected voice not found
  if (!utter.voice && voices.length > 0) {
    utter.voice = voices[0];
  }
  
  utter.lang = "en-US";
  utter.rate = window.speechRate || 1; // Use selected speech rate
  utter.pitch = 1;
  utter.volume = 1;
  
  // Clear any pending speech and speak
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
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

  // Optional: Warm-up call (quiet and fast)
  const dummy = new SpeechSynthesisUtterance("Initializing voice system.");
  dummy.volume = 0.001; // Silent
  dummy.rate = 1;
  dummy.voice = voices.find(v => v.name === window.selectedVoice || v.name === "Google US English");
  speechSynthesis.speak(dummy);
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

  // Apple-compatible notification setup
  setupAppleNotifications();

  const now = new Date();
  const hour = now.getHours();
  let greeting;

  if (hour >= 5 && hour < 12) {
    greeting = "Morning, G. Let’s get the day rolling.";
  } else if (hour >= 12 && hour < 18) {
    greeting = "Afternoon, boss. Time to knock some things out.";
  } else {
    greeting = "Evening, player. Still grinding?";
  }

  speak(greeting);
  setTimeout(() => speakWizLine("startup"), 3000);

  // Check if we're on mobile for speech handling
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    // On mobile, speech might be blocked - add user interaction trigger
    console.log('Mobile detected - speech will play after first user interaction');
    
    // Add click listener to enable speech after first user interaction
    const enableMobileSpeech = () => {
      console.log('First user interaction - enabling speech');
      speak(greeting);
      setTimeout(() => speakWizLine("startup"), 3000);
      document.removeEventListener('click', enableMobileSpeech);
      document.removeEventListener('touchstart', enableMobileSpeech);
    };
    
    // Try to speak immediately, but also add fallback
    try {
      speak(greeting);
      setTimeout(() => speakWizLine("startup"), 3000);
    } catch (e) {
      console.log('Speech blocked, waiting for user interaction');
      document.addEventListener('click', enableMobileSpeech, { once: true });
      document.addEventListener('touchstart', enableMobileSpeech, { once: true });
    }
  }

  const all = getTasks();
  all.forEach(task => {
    const ul = document.getElementById(`ul-${task.section}`);
    if (ul) renderTask(task, ul);
  });

  if (all.length > 0) {
    window._clearMessageSpoken = false;
  }
};

// === STORAGE + TASK HANDLING
function getTasks() {
  return JSON.parse(localStorage.getItem("tasks") || "[]");
}
function saveTask(task) {
  const all = getTasks();
  all.push(task);
  localStorage.setItem("tasks", JSON.stringify(all));
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

// Universal notification system for all browsers with OneSignal for iOS
function setupAppleNotifications() {
  console.log('Setting up hybrid notifications: OneSignal for iOS, native for desktop');
  
  // Detect browser and platform
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  console.log('Platform - iOS:', isIOS);
  console.log('Notification support:', 'Notification' in window);
  
  if (isIOS) {
    console.log('iOS detected - automatically enabling OneSignal notifications');
    // Auto-enable notifications on iOS without button
    setTimeout(() => {
      requestIOSNotificationsAutomatically();
    }, 2000);
  } else {
    console.log('Desktop detected - notifications will work automatically via interval checker');
    console.log('Notification permission:', Notification.permission);
    
    // Desktop browsers will use automatic prompts when users add tasks
    // No manual button needed anymore since reminders work automatically
  }
}

async function requestIOSNotificationsAutomatically() {
  console.log('Automatically requesting iOS task reminder notifications');
  
  if (!window.OneSignal) {
    console.log('OneSignal not available for iOS');
    return false;
  }
  
  // Mark that we've handled notifications for iOS
  localStorage.setItem('notificationAsked', 'true');
  
  try {
    // Check if already subscribed
    window.OneSignal.push(function() {
      window.OneSignal.isPushNotificationsEnabled(function(isEnabled) {
        if (isEnabled) {
          console.log('iOS notifications already granted, sending test notification');
          window.oneSignalEnabled = true;
          setTimeout(() => {
            sendTaskReminderTestNotification();
          }, 500);
        } else {
          // Request task reminder permission
          console.log('Requesting iOS task reminder permission');
          requestTaskReminderPermission();
        }
      });
    });
    
    return true;
  } catch (error) {
    console.error('Error requesting iOS automatic notifications:', error);
    return false;
  }
}

function showFirefoxPrompt() {
  // Mark that we've shown the prompt
  localStorage.setItem('notificationAsked', 'true');
  
  console.log('Showing Firefox-specific notification prompt');
  
  // Create Firefox-optimized notification prompt
  const overlay = document.createElement('div');
  overlay.id = 'firefox-notification-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: system-ui, -apple-system, sans-serif;
  `;
  
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: white;
    border-radius: 8px;
    margin: 20px;
    max-width: 320px;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    animation: modalSlideIn 0.3s ease-out;
  `;
  
  modal.innerHTML = `
    <div style="padding: 24px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 16px;">🦊🔔</div>
      <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #000; line-height: 1.3;">
        Enable Task Notifications?
      </h3>
      <p style="margin: 0 0 12px 0; font-size: 14px; color: #666; line-height: 1.4;">
        Get reminded when your tasks are due with Firefox notifications.
      </p>
      <p style="margin: 0; font-size: 12px; color: #0060df; line-height: 1.3;">
        💡 Firefox will show a permission bar at the top of the page
      </p>
    </div>
    <div style="border-top: 1px solid #e5e5e5; display: flex;">
      <button id="firefox-deny-btn" style="
        flex: 1;
        padding: 16px;
        border: none;
        background: none;
        font-size: 16px;
        color: #666;
        border-right: 1px solid #e5e5e5;
        cursor: pointer;
        transition: background-color 0.2s;
      ">Not Now</button>
      <button id="firefox-allow-btn" style="
        flex: 1;
        padding: 16px;
        border: none;
        background: none;
        font-size: 16px;
        color: #0060df;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s;
      ">Allow</button>
    </div>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Add hover effects
  const denyBtn = modal.querySelector('#firefox-deny-btn');
  const allowBtn = modal.querySelector('#firefox-allow-btn');
  
  denyBtn.addEventListener('mouseenter', () => {
    denyBtn.style.backgroundColor = '#f5f5f5';
  });
  denyBtn.addEventListener('mouseleave', () => {
    denyBtn.style.backgroundColor = 'transparent';
  });
  
  allowBtn.addEventListener('mouseenter', () => {
    allowBtn.style.backgroundColor = '#f0f6ff';
  });
  allowBtn.addEventListener('mouseleave', () => {
    allowBtn.style.backgroundColor = 'transparent';
  });
  
  // Handle button clicks
  denyBtn.addEventListener('click', () => {
    document.body.removeChild(overlay);
    console.log('User denied Firefox notifications');
    updateNotificationControls();
  });
  
  allowBtn.addEventListener('click', async () => {
    document.body.removeChild(overlay);
    console.log('User clicked Allow on Firefox');
    await requestUniversalNotificationPermission();
  });
}

function showUniversalNotificationPrompt() {
  // Mark that we've shown the prompt
  localStorage.setItem('notificationAsked', 'true');
  
  // Create universal notification prompt that works on all browsers
  const overlay = document.createElement('div');
  overlay.id = 'notification-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  `;
  
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: white;
    border-radius: 12px;
    margin: 20px;
    max-width: 320px;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    animation: modalSlideIn 0.3s ease-out;
  `;
  
  // Add CSS animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes modalSlideIn {
      from { transform: scale(0.8); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  modal.innerHTML = `
    <div style="padding: 24px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 16px;">🔔</div>
      <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #000; line-height: 1.3;">
        Enable Task Notifications?
      </h3>
      <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.4;">
        Get reminded when your tasks are due. You can change this later in your browser settings.
      </p>
    </div>
    <div style="border-top: 1px solid #e5e5e5; display: flex;">
      <button id="deny-notifications" style="
        flex: 1;
        padding: 16px;
        border: none;
        background: none;
        font-size: 16px;
        color: #666;
        border-right: 1px solid #e5e5e5;
        cursor: pointer;
        transition: background-color 0.2s;
      ">Not Now</button>
      <button id="allow-notifications" style="
        flex: 1;
        padding: 16px;
        border: none;
        background: none;
        font-size: 16px;
        color: #4f46e5;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s;
      ">Allow</button>
    </div>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Add hover effects
  const denyBtn = modal.querySelector('#deny-notifications');
  const allowBtn = modal.querySelector('#allow-notifications');
  
  denyBtn.addEventListener('mouseenter', () => {
    denyBtn.style.backgroundColor = '#f5f5f5';
  });
  denyBtn.addEventListener('mouseleave', () => {
    denyBtn.style.backgroundColor = 'transparent';
  });
  
  allowBtn.addEventListener('mouseenter', () => {
    allowBtn.style.backgroundColor = '#f0f0ff';
  });
  allowBtn.addEventListener('mouseleave', () => {
    allowBtn.style.backgroundColor = 'transparent';
  });
  
  // Handle button clicks
  denyBtn.addEventListener('click', () => {
    document.body.removeChild(overlay);
    console.log('User declined notifications');
    updateNotificationControls();
  });
  
  allowBtn.addEventListener('click', async () => {
    document.body.removeChild(overlay);
    await requestUniversalNotificationPermission();
  });
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
      console.log('User dismissed notification prompt');
    }
  });
}

async function requestUniversalNotificationPermission() {
  console.log('Requesting notification permission for all browsers');
  
  if (!('Notification' in window)) {
    console.log('Notifications not supported in this browser');
    alert('Notifications are not supported in this browser. Please try a modern browser like Chrome, Firefox, Safari, or Edge.');
    return false;
  }
  
  try {
    // Request permission using standard Web API
    const permission = await Notification.requestPermission();
    console.log('Permission result:', permission);
    
    if (permission === 'granted') {
      console.log('✅ Notifications granted!');
      
      // Update UI (no test notification)
      updateNotificationControls();
      return true;
    } else if (permission === 'denied') {
      console.log('❌ Notifications denied');
      updateNotificationControls();
      return false;
    } else {
      console.log('⚠️ Notification permission was dismissed');
      updateNotificationControls();
      return false;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    alert('There was an error requesting notification permission. Please check your browser settings.');
    return false;
  }
}

// Check first visit and request notifications like Windows
async function checkFirstVisitAndRequestNotifications() {
  if (!("Notification" in window)) {
    console.log("Notifications not supported");
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
      // In PWA mode, show a friendly prompt first
      console.log("PWA detected - showing notification prompt");
      showNotificationPrompt();
    } else {
      // In browser mode, request directly
      await requestNotificationPermission();
    }
  } else if (permission === "granted") {
    console.log("Notifications already enabled");
    updateNotificationControls();
  }
}

function showNotificationPrompt() {
  // Create a more prominent notification prompt for PWA users
  const promptDiv = document.createElement('div');
  promptDiv.id = 'notification-prompt';
  promptDiv.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #4f46e5;
    color: white;
    padding: 15px;
    text-align: center;
    z-index: 10000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  `;
  
  promptDiv.innerHTML = `
    <div style="margin-bottom: 10px;">
      🔔 <strong>Enable Task Notifications?</strong>
    </div>
    <div style="font-size: 14px; margin-bottom: 15px;">
      Get reminded when your tasks are due
    </div>
    <button id="allow-notifications" style="background: white; color: #4f46e5; border: none; padding: 8px 20px; border-radius: 4px; margin-right: 10px; font-weight: bold;">
      Allow
    </button>
    <button id="dismiss-notifications" style="background: transparent; color: white; border: 1px solid white; padding: 8px 20px; border-radius: 4px;">
      Not Now
    </button>
  `;

  document.body.appendChild(promptDiv);

  // Handle allow button
  document.getElementById('allow-notifications').addEventListener('click', async () => {
    document.body.removeChild(promptDiv);
    await requestNotificationPermission();
  });

  // Handle dismiss button
  document.getElementById('dismiss-notifications').addEventListener('click', () => {
    document.body.removeChild(promptDiv);
    console.log("User dismissed notification prompt");
  });

  // Auto-remove after 10 seconds if no action
  setTimeout(() => {
    if (document.getElementById('notification-prompt')) {
      document.body.removeChild(promptDiv);
    }
  }, 10000);
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
  if (!("Notification" in window) || Notification.permission !== "granted") {
    console.log("Notifications not available or not permitted");
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
function createSections() {
  const sectionsDiv = document.getElementById("sections");
  if (!sectionsDiv) {
    console.log('Sections div not found, skipping section creation');
    return;
  }
  
  SECTIONS.forEach(section => {
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
    if (!task || !msg || !time) return alert("All fields required.");
    const id = Date.now().toString();
    const data = { id, section, task, msg, time, reminderMinutes };
    saveTask(data);
    renderTask(data, ul);
    
    // Schedule notifications based on platform
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    if (isIOS && window.oneSignalEnabled) {
      // Schedule OneSignal notification for iOS
      scheduleOneSignalTaskReminder(data);
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
  console.log('Starting notification checker...');
  
  // === REMINDER CHECKER
setInterval(() => {
  const now = new Date();
  const all = getTasks();

  all.forEach(task => {
    const due = new Date(task.time);
    const timeDiff = due - now;
    const reminderMinutes = task.reminderMinutes || 0;
    const reminderTime = reminderMinutes * 60 * 1000; // Convert to milliseconds
    
    // Check for advance reminder (if not already sent)
    if (reminderMinutes > 0 && timeDiff <= reminderTime && timeDiff > reminderTime - 60000 && !window._reminderTaskIds.has(task.id)) {
      window._reminderTaskIds.add(task.id);
      showNotification(task, true);
    }
    
    // Check for final due notification (if not already sent)
    if (timeDiff <= 60000 && timeDiff >= -60000 && !window._notifiedTaskIds.has(task.id)) {
      window._notifiedTaskIds.add(task.id);
      showNotification(task, false);
    }

    // Original voice reminder logic (at due time)
    if (timeDiff <= 60000 && timeDiff >= -60000 && !window._spokenTaskIds.has(task.id)) {
      window._spokenTaskIds.add(task.id);
      setTimeout(() => speakDavid(task.msg), 500);
    }
  });

  const stillRemaining = getTasks();
  if (stillRemaining.length === 0 && !window._clearMessageSpoken) {
    window._clearMessageSpoken = true;
    setTimeout(() => speakWizLine("clear"), 1000);
  }
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
  
  if (all.length === 0) {
    return [];
  }
  
  // Filter for overdue and upcoming tasks (within the next 24 hours)
  const relevant = all.filter(task => {
    const due = new Date(task.time);
    const timeDiff = due - now;
    return timeDiff <= 24 * 60 * 60 * 1000; // Include overdue and next 24 hours
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
