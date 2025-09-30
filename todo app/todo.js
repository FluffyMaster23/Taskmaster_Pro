// === CONFIG ===
const SECTIONS = ["Blogging", "YouTube", "UCLA Simulation", "School", "Admin", "Miscellaneous"];

const GITHUB_USERNAME = "FluffyMaster23";
const GITHUB_REPO = "BruinHub";
const GITHUB_TOKEN = "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";

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

// === SPEAK DAVID (used for GitHub, reminders, task reports)
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

  // Request notification permission
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        console.log("Notifications enabled");
      }
    });
  }

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

// === NOTIFICATION FUNCTIONS ===
function showNotification(task, isReminder = false) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
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
    icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTkgMTJMMTEgMTRMMTUgMTBNMjEgMTJDMjEgMTYuOTcwNiAxNi45NzA2IDIxIDEyIDIxQzcuMDI5NDQgMjEgMyAxNi45NzA2IDMgMTJDMyA3LjAyOTQ0IDcuMDI5NDQgMyAxMiAzQzE2Ljk3MDYgMyAyMSA3LjAyOTQ0IDIxIDEyWiIgc3Ryb2tlPSIjNGY0NmU1IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K",
    tag: task.id,
    requireInteraction: false,
    badge: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0iIzRmNDZlNSIgeG1zbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iOCIgY3k9IjgiIHI9IjgiLz4KPHRleHQgeD0iOCIgeT0iMTIiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPvCfk5U8L3RleHQ+Cjwvc3ZnPg==",
    silent: false
  });
  
  // Auto-close notification after 10 seconds
  setTimeout(() => {
    notification.close();
  }, 10000);
}

// === DOM BUILD ===
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

// === GITHUB CHECK
document.getElementById("checkIssues").addEventListener("click", () => {
  fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/issues?state=open`, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`
    }
  })
    .then(res => {
      if (!res.ok) throw new Error("GitHub API error");
      return res.json();
    })
    .then(data => {
      // Filter out pull requests (GitHub API includes PRs in issues endpoint)
      const actualIssues = data.filter(issue => !issue.pull_request);
      
      if (actualIssues.length === 0) {
        speakDavid("You have no open GitHub issues.");
      } else {
        const issueList = actualIssues.map(issue => issue.title).join(". ");
        speakDavid(`You have ${actualIssues.length} open issue${actualIssues.length > 1 ? 's' : ''}. ${issueList}`);
      }
    })
    .catch(err => {
      console.error("GitHub Error:", err);
      speakDavid("There was an error checking GitHub issues.");
    });
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
