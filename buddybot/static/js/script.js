/* ============================================================
   BuddyBot — Frontend JavaScript
   Handles: Chat, Voice Recognition, UI state, Particle canvas
   ============================================================ */

"use strict";

// ─── State ────────────────────────────────────────────────────────────────────
const State = {
  current: "idle",          // idle | listening | thinking | speaking
  voiceEnabled: false,
  isListening: false,
  pendingAction: null,
  commandHistory: [],
  historyIndex: -1,
  volume: 70,
  brightness: 80,
  messageCount: 1,
};

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const dom = {
  messages:       $("messages"),
  input:          $("chat-input"),
  sendBtn:        $("send-btn"),
  micBtn:         $("mic-btn"),
  sidebar:        $("sidebar"),
  openSidebar:    $("open-sidebar"),
  closeSidebar:   $("close-sidebar"),
  stateBadge:     $("state-badge"),
  stateDot:       $("state-dot"),
  stateLabel:     $("state-label"),
  waveform:       $("waveform"),
  clock:          $("clock"),
  voiceToggle:    $("voice-toggle"),
  orbVoiceToggle: $("orb-voice-toggle"),
  orbBtn:         $("orb-btn"),
  orbState:       $("orb-state"),
  orbHint:        $("orb-hint"),
  orbIcon:        $("orb-icon"),
  voiceBars:      $("voice-bars"),
  cpuBar:         $("cpu-bar"),
  memBar:         $("mem-bar"),
  batBar:         $("bat-bar"),
  cpuLabel:       $("cpu-label"),
  memLabel:       $("mem-label"),
  batLabel:       $("bat-label"),
  uptimeVal:      $("uptime-val"),
  procVal:        $("proc-val"),
  netVal:         $("net-val"),
  cpuMini:        $("cpu-mini"),
  memMini:        $("mem-mini"),
  msgCount:       $("msg-count"),
  confirmArea:    $("confirm-area"),
  confirmText:    $("confirm-text"),
  confirmYes:     $("confirm-yes"),
  confirmNo:      $("confirm-no"),
  historyList:    $("history-list"),
  volumeSlider:   $("volume-slider"),
  brightnessSlider: $("brightness-slider"),
  volumeLabel:    $("volume-label"),
  brightnessLabel:$("brightness-label"),
  initTime:       $("init-time"),
  ring1:          $("ring-1"),
  ring2:          $("ring-2"),
  ring3:          $("ring-3"),
};

// ─── Particle canvas ──────────────────────────────────────────────────────────
(function initParticles() {
  const canvas = document.getElementById("particle-canvas");
  const ctx    = canvas.getContext("2d");
  let particles = [];
  let raf;

  const COLORS = [
    "rgba(0,229,255,",
    "rgba(0,150,255,",
    "rgba(120,0,255,",
    "rgba(0,200,255,",
  ];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", () => { resize(); init(); });

  function init() {
    const count = Math.min(70, Math.floor((canvas.width * canvas.height) / 14000));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r:  Math.random() * 1.5 + 0.3,
      a:  Math.random() * 0.45 + 0.08,
      c:  COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connection lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 110) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(0,200,255,${0.07 * (1 - dist / 110)})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw particles
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.c + p.a + ")";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
      ctx.fillStyle = p.c + (p.a * 0.15) + ")";
      ctx.fill();
    });

    raf = requestAnimationFrame(draw);
  }

  init();
  draw();
})();

// ─── Clock ────────────────────────────────────────────────────────────────────
function updateClock() {
  dom.clock.textContent = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
  });
}
updateClock();
setInterval(updateClock, 1000);

// Set init message time
dom.initTime.textContent = new Date().toLocaleTimeString("en-US", {
  hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
});

// ─── State machine ────────────────────────────────────────────────────────────
function setState(newState) {
  State.current = newState;

  const configs = {
    idle:      { label: "STANDBY",   dotClass: "cyan",   icon: "🎤",  orbClass: "",         stateClass: "" },
    listening: { label: "LISTENING", dotClass: "green",  icon: "🛑",  orbClass: "listening", stateClass: "text-green" },
    thinking:  { label: "PROCESSING",dotClass: "amber",  icon: "⏳",  orbClass: "thinking",  stateClass: "text-amber" },
    speaking:  { label: "SPEAKING",  dotClass: "purple", icon: "🔊",  orbClass: "speaking",  stateClass: "" },
  };

  const cfg = configs[newState] || configs.idle;

  // State badge
  dom.stateDot.className  = `dot ${cfg.dotClass}`;
  dom.stateLabel.textContent = cfg.label;
  dom.stateLabel.className   = `orbitron tiny ${cfg.stateClass}`;

  // Waveform
  dom.waveform.classList.toggle("hidden", newState === "idle");

  // Orb
  dom.orbBtn.className = `orb-main ${cfg.orbClass}`;
  dom.orbIcon.textContent = cfg.icon;
  dom.orbState.textContent = cfg.label;
  dom.orbState.className = `orbitron small font-bold ${
    newState === "listening" ? "text-green" :
    newState === "thinking"  ? "text-amber" :
    newState === "speaking"  ? "text-purple" : "text-cyan"
  }`;

  // Orb rings
  const ringClass = newState !== "idle" ? `active-${newState}` : "";
  dom.ring1.className = `orb-ring ring-1 ${ringClass}`;
  dom.ring2.className = `orb-ring ring-2 ${ringClass}`;
  dom.ring3.className = `orb-ring ring-3 ${ringClass}`;

  // Voice bars animation
  animateVoiceBars(newState !== "idle");

  // Input
  dom.input.disabled = newState === "listening" || newState === "thinking";
  dom.input.placeholder =
    newState === "listening" ? "Listening..." :
    newState === "thinking"  ? "Processing..." :
    newState === "speaking"  ? "Speaking..." :
    'Type a command or say "Hey Buddy"...';
}

// ─── Voice bars ───────────────────────────────────────────────────────────────
let voiceBarInterval = null;
function animateVoiceBars(active) {
  const bars = dom.voiceBars.querySelectorAll(".v-bar");
  if (voiceBarInterval) clearInterval(voiceBarInterval);

  if (active) {
    voiceBarInterval = setInterval(() => {
      bars.forEach((b) => {
        const h = Math.floor(Math.random() * 22) + 4;
        b.style.height = h + "px";
        b.classList.add("active");
      });
    }, 100);
  } else {
    bars.forEach((b) => {
      b.style.height = "6px";
      b.classList.remove("active");
    });
  }
}

// ─── Message rendering ────────────────────────────────────────────────────────
function renderBold(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

function addMessage(role, text, type = "text") {
  State.messageCount++;
  dom.msgCount.textContent = `${State.messageCount} messages`;

  const isUser = role === "user";
  const time   = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
  });

  const bubbleClass = isUser ? "user-bubble" :
    type === "error"   ? "bot-bubble error" :
    type === "success" ? "bot-bubble success" :
    type === "command" ? "bot-bubble command" :
    type === "system"  ? "bot-bubble system" :
    "bot-bubble";

  const icon = isUser ? "👤" :
    type === "error"   ? "⚠️" :
    type === "success" ? "✅" :
    type === "command" ? "⚡" :
    type === "system"  ? "🖥️" : "🤖";

  const div = document.createElement("div");
  div.className = `message ${isUser ? "user" : "bot"}`;
  div.innerHTML = `
    <div class="avatar ${isUser ? "" : "bot-avatar"}">${icon}</div>
    <div class="bubble ${bubbleClass}">
      <div class="sender-label">${isUser ? "YOU" : "BUDDYBOT"}</div>
      <p>${renderBold(text)}</p>
      <div class="timestamp">${time}</div>
    </div>
  `;

  dom.messages.appendChild(div);
  dom.messages.scrollTop = dom.messages.scrollHeight;
}

function addTypingIndicator() {
  const div = document.createElement("div");
  div.className = "message bot";
  div.id = "typing-msg";
  div.innerHTML = `
    <div class="avatar bot-avatar">🤖</div>
    <div class="bubble bot-bubble">
      <div class="sender-label">BUDDYBOT</div>
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  dom.messages.appendChild(div);
  dom.messages.scrollTop = dom.messages.scrollHeight;
}

function removeTypingIndicator() {
  const el = $("typing-msg");
  if (el) el.remove();
}

// ─── Command history ──────────────────────────────────────────────────────────
function pushHistory(cmd) {
  State.commandHistory.unshift(cmd);
  if (State.commandHistory.length > 50) State.commandHistory.pop();
  State.historyIndex = -1;
  renderHistory();
}

function renderHistory() {
  if (State.commandHistory.length === 0) {
    dom.historyList.innerHTML = '<p class="text-muted small text-center">No commands yet...</p>';
    return;
  }
  dom.historyList.innerHTML = State.commandHistory
    .map((cmd, i) => `
      <div class="history-item" onclick="sendCommand(${JSON.stringify(cmd)})">
        <span class="history-num">${String(i + 1).padStart(2, "0")}</span>
        <span>${cmd}</span>
      </div>
    `)
    .join("");
}

// ─── Send command ─────────────────────────────────────────────────────────────
async function sendCommand(text) {
  text = text.trim();
  if (!text || State.current === "thinking") return;

  pushHistory(text);
  addMessage("user", text);
  setState("thinking");
  addTypingIndicator();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, voice: State.voiceEnabled }),
    });

    removeTypingIndicator();

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.error) {
      setState("idle");
      addMessage("assistant", `Error: ${data.error}`, "error");
      return;
    }

    // Determine message type from action
    const type =
      data.action?.includes("volume")     ? "command" :
      data.action?.includes("brightness") ? "command" :
      data.action?.includes("open")       ? "command" :
      data.action?.includes("screenshot") ? "command" :
      data.requires_confirmation          ? "system"  : "text";

    if (data.requires_confirmation) {
      setState("idle");
      addMessage("assistant", data.response, "system");
      showConfirmation(data.response, data.action);
    } else {
      setState("speaking");
      addMessage("assistant", data.response, type);
      setTimeout(() => setState("idle"), 1800);
    }

  } catch (err) {
    removeTypingIndicator();
    setState("idle");
    addMessage("assistant", "Network error — is the BuddyBot server running? (python main.py)", "error");
    console.error("sendCommand error:", err);
  }
}

// ─── Confirmation dialog ──────────────────────────────────────────────────────
function showConfirmation(text, action) {
  State.pendingAction = action;
  dom.confirmText.textContent = `Confirm: ${text}`;
  dom.confirmArea.classList.remove("hidden");
}

function hideConfirmation() {
  State.pendingAction = null;
  dom.confirmArea.classList.add("hidden");
}

dom.confirmYes.addEventListener("click", async () => {
  if (!State.pendingAction) return;
  const action = State.pendingAction;
  hideConfirmation();
  setState("thinking");

  try {
    const res = await fetch("/api/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, confirmed: true, voice: State.voiceEnabled }),
    });
    const data = await res.json();
    setState("idle");
    addMessage("assistant", data.response, data.success ? "success" : "error");
  } catch {
    setState("idle");
    addMessage("assistant", "Failed to execute action.", "error");
  }
});

dom.confirmNo.addEventListener("click", () => {
  hideConfirmation();
  addMessage("assistant", "Action cancelled.", "system");
  State.pendingAction = null;
});

// ─── Input handling ───────────────────────────────────────────────────────────
dom.sendBtn.addEventListener("click", () => {
  const text = dom.input.value.trim();
  if (!text) return;
  sendCommand(text);
  dom.input.value = "";
});

dom.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const text = dom.input.value.trim();
    if (!text) return;
    sendCommand(text);
    dom.input.value = "";
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    State.historyIndex = Math.min(State.historyIndex + 1, State.commandHistory.length - 1);
    dom.input.value = State.commandHistory[State.historyIndex] || "";
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    State.historyIndex = Math.max(State.historyIndex - 1, -1);
    dom.input.value = State.historyIndex === -1 ? "" : State.commandHistory[State.historyIndex];
  }
});

// ─── Voice recognition ────────────────────────────────────────────────────────
let recognition = null;
let wakeRecognition = null;
let wakeRunning = false;

function getSR() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  return SR ? new SR() : null;
}

function startListening() {
  const sr = getSR();
  if (!sr) {
    addMessage("assistant", "Speech recognition is not supported in this browser. Please use Google Chrome.", "error");
    return;
  }
  if (recognition) recognition.stop();

  recognition = sr;
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onstart = () => {
    State.isListening = true;
    setState("listening");
    dom.micBtn.classList.add("listening");
  };

  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    State.isListening = false;
    dom.micBtn.classList.remove("listening");
    sendCommand(text);
  };

  recognition.onerror = () => {
    State.isListening = false;
    setState("idle");
    dom.micBtn.classList.remove("listening");
  };

  recognition.onend = () => {
    State.isListening = false;
    dom.micBtn.classList.remove("listening");
    if (State.current === "listening") setState("idle");
  };

  recognition.start();
}

function stopListening() {
  if (recognition) recognition.stop();
  State.isListening = false;
  setState("idle");
  dom.micBtn.classList.remove("listening");
}

// Wake word continuous listener
function startWakeWordListener() {
  if (!State.voiceEnabled || wakeRunning) return;
  const sr = getSR();
  if (!sr) return;

  wakeRunning = true;
  wakeRecognition = sr;
  wakeRecognition.continuous = false;
  wakeRecognition.interimResults = false;
  wakeRecognition.lang = "en-US";

  wakeRecognition.onresult = (e) => {
    const text = e.results[0][0].transcript.toLowerCase();
    if (text.includes("hey buddy") || text.includes("buddy") || text.includes("hey bot")) {
      addMessage("assistant", "Yes? I'm listening...", "system");
      setTimeout(startListening, 400);
    }
  };

  wakeRecognition.onend = () => {
    if (wakeRunning && State.voiceEnabled && !State.isListening) {
      setTimeout(startWakeWordListener, 1000);
    }
  };

  wakeRecognition.onerror = () => {
    if (wakeRunning) setTimeout(startWakeWordListener, 2000);
  };

  try { wakeRecognition.start(); } catch (_) {}
}

function stopWakeWordListener() {
  wakeRunning = false;
  if (wakeRecognition) wakeRecognition.stop();
}

// Mic button
dom.micBtn.addEventListener("click", () => {
  if (State.isListening) {
    stopListening();
  } else {
    startListening();
  }
});

// Orb button
dom.orbBtn.addEventListener("click", () => {
  if (State.isListening) {
    stopListening();
  } else {
    startListening();
  }
});

// ─── Voice toggle ─────────────────────────────────────────────────────────────
function toggleVoice() {
  State.voiceEnabled = !State.voiceEnabled;
  dom.voiceToggle.classList.toggle("active", State.voiceEnabled);
  dom.orbVoiceToggle.textContent = State.voiceEnabled ? "ON" : "OFF";
  dom.orbVoiceToggle.classList.toggle("off", !State.voiceEnabled);
  dom.orbHint.textContent = State.voiceEnabled ? 'Say "Hey Buddy" to activate' : "Voice disabled";

  if (State.voiceEnabled) {
    startWakeWordListener();
    addMessage("assistant", "Voice mode enabled. Say \"Hey Buddy\" to activate.", "system");
    // Notify server
    fetch("/api/voice/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    }).catch(() => {});
  } else {
    stopWakeWordListener();
    addMessage("assistant", "Voice mode disabled.", "system");
    fetch("/api/voice/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    }).catch(() => {});
  }
}

dom.voiceToggle.addEventListener("click", toggleVoice);
dom.orbVoiceToggle.addEventListener("click", toggleVoice);

// ─── Sidebar ──────────────────────────────────────────────────────────────────
dom.openSidebar.addEventListener("click", () => dom.sidebar.classList.add("open"));
dom.closeSidebar.addEventListener("click", () => dom.sidebar.classList.remove("open"));
document.addEventListener("click", (e) => {
  if (!dom.sidebar.contains(e.target) && !dom.openSidebar.contains(e.target)) {
    dom.sidebar.classList.remove("open");
  }
});

// ─── Volume & Brightness sliders ──────────────────────────────────────────────
dom.volumeSlider.addEventListener("input", (e) => {
  State.volume = parseInt(e.target.value);
  dom.volumeLabel.textContent = State.volume + "%";
});
dom.volumeSlider.addEventListener("change", (e) => {
  sendCommand(`set volume to ${e.target.value}`);
});

dom.brightnessSlider.addEventListener("input", (e) => {
  State.brightness = parseInt(e.target.value);
  dom.brightnessLabel.textContent = State.brightness + "%";
});
dom.brightnessSlider.addEventListener("change", (e) => {
  sendCommand(`set brightness to ${e.target.value}`);
});

// ─── System stats polling ─────────────────────────────────────────────────────
async function pollSystemStats() {
  try {
    const res  = await fetch("/api/system-info");
    const data = await res.json();

    if (data.cpu_percent !== undefined) {
      dom.cpuBar.style.width   = data.cpu_percent + "%";
      dom.cpuLabel.textContent = data.cpu_percent + "%";
      dom.cpuMini.style.width  = data.cpu_percent + "%";
    }
    if (data.memory_percent !== undefined) {
      dom.memBar.style.width   = data.memory_percent + "%";
      dom.memLabel.textContent = data.memory_percent + "%";
      dom.memMini.style.width  = data.memory_percent + "%";
    }
    if (data.battery_percent !== undefined) {
      dom.batBar.style.width   = data.battery_percent + "%";
      dom.batLabel.textContent = data.battery_percent + "%";
    }
    if (data.uptime)          dom.uptimeVal.textContent = data.uptime;
    if (data.process_count)   dom.procVal.textContent   = data.process_count;
    dom.netVal.textContent = "Active";

  } catch {
    // Server not running — show simulated stats
    simulateStats();
  }
}

// Simulated stats for when server is offline
let simCPU = 25, simMEM = 48, simBAT = 87;
let simUptime = 0;
function simulateStats() {
  simCPU  = Math.max(5,  Math.min(90,  simCPU  + (Math.random() - 0.5) * 8));
  simMEM  = Math.max(25, Math.min(80,  simMEM  + (Math.random() - 0.5) * 3));
  simBAT  = Math.max(10, Math.min(99,  simBAT  - 0.05));
  simUptime++;

  const h = Math.floor(simUptime / 1200).toString().padStart(2, "0");
  const m = Math.floor((simUptime % 1200) / 20).toString().padStart(2, "0");
  const s = (simUptime % 20).toString().padStart(2, "0");

  dom.cpuBar.style.width   = simCPU.toFixed(0) + "%";
  dom.cpuLabel.textContent = simCPU.toFixed(0) + "%";
  dom.cpuMini.style.width  = simCPU.toFixed(0) + "%";
  dom.memBar.style.width   = simMEM.toFixed(0) + "%";
  dom.memLabel.textContent = simMEM.toFixed(0) + "%";
  dom.memMini.style.width  = simMEM.toFixed(0) + "%";
  dom.batBar.style.width   = simBAT.toFixed(0) + "%";
  dom.batLabel.textContent = simBAT.toFixed(0) + "%";
  dom.uptimeVal.textContent = `${h}:${m}:${s}`;
  dom.procVal.textContent   = Math.floor(simCPU * 4 + 100);
  dom.netVal.textContent    = "Simulated";
}

// Poll every 3 seconds
pollSystemStats();
setInterval(pollSystemStats, 3000);

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  // Ctrl+L = listen
  if (e.ctrlKey && e.key === "l") {
    e.preventDefault();
    startListening();
  }
  // Escape = close sidebar / cancel confirmation
  if (e.key === "Escape") {
    dom.sidebar.classList.remove("open");
    if (State.isListening) stopListening();
  }
  // Focus input on "/" key (if not already focused)
  if (e.key === "/" && document.activeElement !== dom.input) {
    e.preventDefault();
    dom.input.focus();
  }
});

// ─── Greet on load ────────────────────────────────────────────────────────────
window.addEventListener("load", () => {
  setTimeout(() => {
    // Try to connect to server
    fetch("/api/system-info")
      .then(() => {
        addMessage("assistant", "Connected to BuddyBot server. All systems operational.", "success");
      })
      .catch(() => {
        addMessage(
          "assistant",
          "Running in demo mode (server offline). Start the Python backend with: python main.py\nAll UI features are active. Voice commands work via browser's Web Speech API.",
          "system"
        );
      });
  }, 500);
});

// ─── Expose for inline onclick ────────────────────────────────────────────────
window.sendCommand = sendCommand;
