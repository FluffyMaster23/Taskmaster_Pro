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

  // Setup notification button and status
  setupNotificationControls();
});
// === END PWA INSTALL BUTTON LOGIC ===

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

// Load voices when they're ready
window.speechSynthesis.onvoiceschanged = loadVoices;

// Also try loading immediately (for some browsers)
loadVoices();

document.getElementById("voiceSelect").addEventListener("change", e => {
  window.selectedVoice = e.target.value;
  // Save voice preference to localStorage
  localStorage.setItem("selectedVoice", e.target.value);
  console.log('Voice changed and saved:', e.target.value);
});

// === SPEECH RATE HANDLING ===
document.getElementById("speechRateSelect").addEventListener("change", e => {
  window.speechRate = parseFloat(e.target.value);
  // Save speech rate preference to localStorage
  localStorage.setItem("speechRate", e.target.value);
  console.log('Speech rate changed and saved:', e.target.value);
});

// === SPEECH RATE HANDLING ===
document.getElementById("speechRateSelect").addEventListener("change", e => {
  window.speechRate = parseFloat(e.target.value);
  // Save speech rate preference to localStorage
  localStorage.setItem("speechRate", e.target.value);
  console.log('Speech rate changed and saved:', e.target.value);
});

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

function setupNotificationControls() {
  const enableBtn = document.getElementById('enableNotifications');
  const statusDiv = document.getElementById('notificationStatus');
  
  if (!enableBtn || !statusDiv) return;

  // Update button and status based on current permission
  function updateNotificationStatus() {
    if (!("Notification" in window)) {
      statusDiv.textContent = "❌ Notifications not supported in this browser";
      enableBtn.style.display = 'none';
      return;
    }

    const permission = Notification.permission;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    switch (permission) {
      case 'granted':
        statusDiv.textContent = "✅ Notifications enabled";
        enableBtn.textContent = "🔔 Test Notification";
        enableBtn.style.background = "#10b981";
        break;
      case 'denied':
        if (isIOS) {
          statusDiv.textContent = "❌ Notifications blocked - Check Settings > Safari > Notifications";
        } else {
          statusDiv.textContent = "❌ Notifications blocked - Check browser settings";
        }
        enableBtn.textContent = "🔔 Notifications Blocked";
        enableBtn.style.background = "#ef4444";
        break;
      case 'default':
        statusDiv.textContent = "⚠️ Click to enable task notifications";
        enableBtn.textContent = "🔔 Enable Notifications";
        enableBtn.style.background = "#4f46e5";
        break;
    }
  }

  // Handle button click
  enableBtn.addEventListener('click', async () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (Notification.permission === 'granted') {
      // Show test notification
      if (isIOS) {
        sendIOSTestNotification();
      } else {
        showConfirmationNotification();
      }
    } else if (Notification.permission === 'denied') {
      // Show instructions for re-enabling
      let instructions;
      if (isIOS) {
        instructions = "🔔 Notifications are blocked!\n\n" +
                      "To enable on iOS:\n" +
                      "• Go to Settings > Safari > Notifications\n" +
                      "• Enable 'Allow Websites to Ask for Permission'\n" +
                      "• Or delete and re-add this app to home screen";
      } else {
        instructions = "🔔 Notifications are blocked!\n\n" +
                      "To enable them:\n" +
                      "• Look for the notification icon in your browser's address bar\n" +
                      "• Or check your browser's notification settings\n" +
                      "• Allow notifications for this site\n" +
                      "• Then refresh this page";
      }
      alert(instructions);
    } else {
      // Request permission using appropriate method
      if (isIOS) {
        await requestIOSNotificationsAutomatically();
      } else {
        const isFirefox = navigator.userAgent.includes('Firefox');
        if (isFirefox) {
          showFirefoxPrompt();
        } else {
          await requestUniversalNotificationPermission();
        }
      }
    }
  });

  // Initial status update
  updateNotificationStatus();
}

// Universal notification system for all browsers
function setupAppleNotifications() {
  console.log('Setting up universal notifications for all browsers');
  
  // Detect browser and platform
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isFirefox = navigator.userAgent.includes('Firefox');
  const isChrome = navigator.userAgent.includes('Chrome') && !navigator.userAgent.includes('Edge');
  const isSafari = navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome');
  const isEdge = navigator.userAgent.includes('Edge');
  
  // Check if this is first visit
  const hasAskedBefore = localStorage.getItem('notificationAsked');
  const isFirstVisit = !hasAskedBefore;
  
  console.log('Platform - iOS:', isIOS, 'Firefox:', isFirefox, 'Chrome:', isChrome, 'Safari:', isSafari, 'Edge:', isEdge);
  console.log('First visit:', isFirstVisit);
  console.log('Notification support:', 'Notification' in window);
  console.log('Notification permission:', Notification.permission);
  
  // Setup notification controls
  setupNotificationControls();
  
  // Handle iOS automatically, show prompts for other browsers on first visit
  if (isIOS) {
    // For iOS, automatically request notifications and send test notification
    setTimeout(() => {
      requestIOSNotificationsAutomatically();
    }, 1500);
  } else if (isFirstVisit && 'Notification' in window && Notification.permission === 'default') {
    if (isFirefox) {
      // Firefox-specific handling
      setTimeout(() => {
        showFirefoxPrompt();
      }, 1000);
    } else {
      // For Chrome, Edge, and other browsers
      setTimeout(() => {
        showUniversalNotificationPrompt();
      }, 500);
    }
  }
}

async function requestIOSNotificationsAutomatically() {
  console.log('Automatically requesting iOS notifications and sending test notification');
  
  if (!('Notification' in window)) {
    console.log('Notifications not supported on iOS');
    return false;
  }
  
  // Mark that we've handled notifications for iOS
  localStorage.setItem('notificationAsked', 'true');
  
  try {
    const permission = Notification.permission;
    console.log('Current iOS notification permission:', permission);
    
    if (permission === 'default') {
      // Request permission automatically
      console.log('Requesting iOS notification permission automatically...');
      const newPermission = await Notification.requestPermission();
      console.log('iOS permission result:', newPermission);
      
      if (newPermission === 'granted') {
        console.log('✅ iOS Notifications granted automatically!');
        
        // Send immediate test notification
        setTimeout(() => {
          sendIOSTestNotification();
        }, 1000);
        
        // Update UI
        updateNotificationControls();
        return true;
      } else {
        console.log('❌ iOS Notifications denied');
        updateNotificationControls();
        return false;
      }
    } else if (permission === 'granted') {
      // Already granted, just send test notification
      console.log('iOS notifications already granted, sending test notification');
      setTimeout(() => {
        sendIOSTestNotification();
      }, 1000);
      updateNotificationControls();
      return true;
    } else {
      // Denied
      console.log('iOS notifications denied');
      updateNotificationControls();
      return false;
    }
  } catch (error) {
    console.error('Error with iOS notification handling:', error);
    return false;
  }
}

function sendIOSTestNotification() {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    console.log('Cannot send iOS test notification - permission not granted');
    return;
  }
  
  console.log('Sending iOS test notification');
  
  const notification = new Notification('🎉 TaskMaster Pro - iOS Ready!', {
    body: 'Notifications are working on your iOS device! You\'ll get task reminders with sound.',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHJ4PSIxMiIgZmlsbD0iIzRmNDZlNSIvPgogIDxwYXRoIGQ9Ik0xOCAyNGw0IDRsOC04IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K',
    tag: 'taskmaster-ios-test',
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200]
  });
  
  // Handle notification click
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
  
  // Auto-close after 8 seconds
  setTimeout(() => {
    notification.close();
  }, 8000);
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
      
      // Show immediate confirmation notification
      setTimeout(() => {
        showConfirmationNotification();
      }, 500);
      
      // Update UI
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

function showConfirmationNotification() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  
  console.log('Showing confirmation notification');
  
  const notification = new Notification('🎉 TaskMaster Pro', {
    body: 'Notifications are now enabled! You\'ll receive reminders for your tasks.',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHJ4PSIxMiIgZmlsbD0iIzRmNDZlNSIvPgogIDxwYXRoIGQ9Ik0xOCAyNGw0IDRsOC04IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K',
    tag: 'taskmaster-enabled',
    requireInteraction: false,
    silent: false
  });
  
  // Handle notification click
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
  
  // Auto-close after 5 seconds
  setTimeout(() => {
    notification.close();
  }, 5000);
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

function showTestNotification() {
  if (Notification.permission === "granted") {
    const notification = new Notification("🎉 TaskMaster Pro", {
      body: "Notifications are now enabled! You'll get reminders for your tasks.",
      icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHJ4PSIxMiIgZmlsbD0iIzRmNDZlNSIvPgogIDxwYXRoIGQ9Ik0xOCAyNGw0IDRsOC04IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K",
      tag: "taskmaster-welcome",
      requireInteraction: false,
      silent: false
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
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
}// === DOM BUILD ===
const sectionsDiv = document.getElementById("sections");
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

// === CHECK UPCOMING TODOS
document.getElementById("checkUpcoming").addEventListener("click", () => {
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
});

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
