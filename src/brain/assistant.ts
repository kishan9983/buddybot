import { CommandContext, CommandResult } from "../types";
import { getDateString, getTimeString } from "./systemStats";

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const jokes = [
  "Why do programmers prefer dark mode? Because light attracts bugs!",
  "I would tell you a joke about UDP, but you might not get it.",
  "Why did the computer go to the doctor? It had a virus!",
  "Why did the JavaScript developer wear glasses? Because he couldn't C#!",
  "There are 10 types of people: those who understand binary, and those who don't.",
  "A SQL query walks into a bar and asks two tables: 'Can I JOIN you?'",
  "What do you call a fish with no eyes? A fsh. Even I found that one fishy.",
  "Why was the math book sad? It had too many problems.",
];

const unknownResponses = [
  "I didn't quite catch that. Could you rephrase your command?",
  "That command isn't in my database. Try 'help' to see what I can do.",
  "I'm not sure how to handle that. My knowledge is expanding though!",
  "Command not recognized. Perhaps try a different phrasing?",
];

const greetingResponses = [
  "Hello! BuddyBot is fully operational. How may I assist you?",
  "Hey there! All systems are go. What do you need?",
  "Greetings! I'm BuddyBot. Ready to serve.",
  "Good to see you! Neural networks firing on all cylinders. What can I do for you?",
];

const helpText = `Here are things I can do:

SYSTEM CONTROL
- open whatsapp / chrome / notepad / calculator / vscode / spotify / discord
- open whatsapp and message [contact] saying [text]
- open notepad and write/type [text]
- take screenshot

VOLUME CONTROL
- volume up / volume down / mute
- set volume to [number]

BRIGHTNESS CONTROL
- brightness up / brightness down
- set brightness to [number]

POWER MANAGEMENT
- shutdown, restart, sleep, lock screen

WEB & UTILITIES
- open google / youtube / github
- search [anything]
- what's the time / what's the date

MESSAGING
- send whatsapp to [contact] saying [message]
- send whatsapp to [phone number] saying [message]

FUN
- tell me a joke
- system status / who are you
- calculate [math expression]`;

// ─── App → Web Fallback Map ───────────────────────────────────────────────────
const webFallbacks: Record<string, string> = {
  whatsapp:             "https://web.whatsapp.com/",
  "whats app":          "https://web.whatsapp.com/",
  word:                 "https://docs.google.com/",
  excel:                "https://sheets.google.com/",
  powerpoint:           "https://slides.google.com/",
  vscode:               "https://vscode.dev/",
  "vs code":            "https://vscode.dev/",
  "visual studio code": "https://vscode.dev/",
  spotify:              "https://open.spotify.com/",
  discord:              "https://discord.com/app",
  paint:                "https://jspaint.app/",
  "ms paint":           "https://jspaint.app/",
  calculator:           "https://www.google.com/search?q=calculator",
  calc:                 "https://www.google.com/search?q=calculator",
  notepad:              "https://notepad.link/",
  "online notepad":     "https://notepad.link/",
  browser:              "https://www.google.com",
  chrome:               "https://www.google.com",
  google:               "https://google.com",
  youtube:              "https://youtube.com",
  github:               "https://github.com",
  gmail:                "https://mail.google.com",
  drive:                "https://drive.google.com",
  maps:                 "https://maps.google.com",
  "google maps":        "https://maps.google.com",
  zoom:                 "https://zoom.us",
  netflix:              "https://netflix.com",
  "amazon prime":       "https://primevideo.com",
  twitter:              "https://twitter.com",
  facebook:             "https://facebook.com",
  instagram:            "https://instagram.com",
  linkedin:             "https://linkedin.com",
  reddit:               "https://reddit.com",
  "stack overflow":     "https://stackoverflow.com",
};

// ─── Open an app (browser-mode: open web fallback) ────────────────────────────
function openApp(appName: string): CommandResult {
  const name = appName.toLowerCase().trim();

  // Direct match
  const directUrl = webFallbacks[name];
  if (directUrl) {
    window.open(directUrl, "_blank");
    return {
      response: `Opening ${appName} — launched in a new tab! 🚀`,
      type: "command",
    };
  }

  // Partial match
  for (const [key, url] of Object.entries(webFallbacks)) {
    if (name.includes(key) || key.includes(name)) {
      window.open(url, "_blank");
      return {
        response: `Opening ${appName} — launched in a new tab! 🚀`,
        type: "command",
      };
    }
  }

  // Google search fallback for unknown apps
  const skipWords = ["it", "this", "that", "here", "door", "window", "help", "menu", "settings", "setting"];
  if (!skipWords.includes(name)) {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(appName)}`, "_blank");
    return {
      response: `I couldn't find a direct link for '${appName}', so I searched for it on Google!`,
      type: "command",
    };
  }

  return {
    response: `I'm not sure what '${appName}' refers to. Try saying something like "open notepad" or "open whatsapp".`,
    type: "text",
  };
}

// ─── Split compound command: "open [app] and write/type/send/message [text]" ──
function splitCompoundCommand(t: string): { app: string; verb: string; rest: string } | null {
  const m = t.match(/^(?:open|launch|start|run)\s+(.+?)\s+and\s+(write|type|send|message|say|note|compose)\s+(.+)$/i);
  if (m) {
    return { app: m[1].trim(), verb: m[2].trim(), rest: m[3].trim() };
  }
  return null;
}

function splitSequentialCommands(text: string): string[] {
  let t = text.trim();
  const verbs = [
    "open", "launch", "start", "run", "go to",
    "write", "type", "keyboard", "say", "insert",
    "close", "quit", "kill", "stop",
    "send", "message", "whatsapp", "email",
    "search", "google", "look up",
    "screenshot", "screen cap", "capture screen",
    "volume", "mute", "unmute",
    "brightness", "set brightness",
    "shutdown", "restart", "sleep", "lock"
  ];
  
  // 1. Split on "and then", ", then", "then"
  t = t.replace(/\b(?:and\s+)?then\b/gi, " || ");
  t = t.replace(/,\s*then\b/gi, " || ");
  
  // 2. Split on "and" or commas followed by action verbs
  for (const verb of verbs) {
    const regexAnd = new RegExp(`\\b(and)\\s+(${verb})\\b`, "gi");
    t = t.replace(regexAnd, " || $2");
    
    const regexComma = new RegExp(`,\\s*(${verb})\\b`, "gi");
    t = t.replace(regexComma, " || $1");
  }
  
  const parts = t.split(" || ").map(p => p.trim()).filter(Boolean);
  
  const cleanedParts: string[] = [];
  for (const p of parts) {
    const cleanP = p.replace(/^(and\s+)+/i, "").trim();
    if (cleanP) {
      cleanedParts.push(cleanP);
    }
  }
  
  return cleanedParts;
}

export async function processCommand(
  text: string,
  ctx: CommandContext
): Promise<CommandResult> {
  const t = text.trim();
  const steps = splitSequentialCommands(t);
  
  if (steps.length > 1) {
    const results: string[] = [];
    let aggregatedType: "text" | "command" | "success" | "system" | "error" = "command";
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepRes = await processSingleCommand(step, ctx);
      results.push(stepRes.response);
      if (stepRes.type === "error") {
        aggregatedType = "error";
      }
      
      if (i < steps.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    const combinedResponse = "Commander, I have completed the task sequence:\n" + 
      results.map((r, idx) => ` ${idx + 1}. ${r}`).join("\n");
      
    return {
      response: combinedResponse,
      type: aggregatedType,
    };
  }
  
  return processSingleCommand(text, ctx);
}

async function processSingleCommand(
  text: string,
  ctx: CommandContext
): Promise<CommandResult> {
  const t = text.toLowerCase().trim();

  // ── Greeting ─────────────────────────────────────────────────────────────
  if (/^(hello|hi|hey|howdy|greetings|good (morning|afternoon|evening))/i.test(t)) {
    return { response: pickRandom(greetingResponses), type: "text" };
  }

  // ── Help ─────────────────────────────────────────────────────────────────
  if (/\b(help|what can you do|commands|features|capabilities)\b/i.test(t)) {
    return { response: helpText, type: "system" };
  }

  // ── Time + Date ───────────────────────────────────────────────────────────
  if (/\b(date and time|time and date)\b/i.test(t)) {
    return { response: getDateString() + " — " + getTimeString(), type: "success" };
  }

  // ── Time ─────────────────────────────────────────────────────────────────
  if (/\b(what.*time|current time|tell me the time|time now)\b/i.test(t)) {
    return { response: "The current time is " + getTimeString() + ".", type: "success" };
  }

  // ── Date ─────────────────────────────────────────────────────────────────
  if (/\b(what.*date|today|current date|what day is it)\b/i.test(t)) {
    return { response: "Today is " + getDateString() + ".", type: "success" };
  }

  // ── Set volume ────────────────────────────────────────────────────────────
  const setVolMatch = t.match(/set volume (to |at )?(\d+)/i);
  if (setVolMatch) {
    const val = Math.min(100, Math.max(0, parseInt(setVolMatch[2])));
    ctx.setVolume(val);
    return { response: "Volume set to " + val + "%.", type: "command" };
  }

  // ── Volume up ─────────────────────────────────────────────────────────────
  if (/\b(volume up|increase volume|turn.*up|louder|raise volume|higher volume)\b/i.test(t)) {
    const newVol = Math.min(100, ctx.volume + 15);
    ctx.setVolume(newVol);
    return { response: "Volume increased to " + newVol + "%.", type: "command" };
  }

  // ── Volume down ───────────────────────────────────────────────────────────
  if (/\b(volume down|decrease volume|turn.*down|quieter|lower volume|softer)\b/i.test(t)) {
    const newVol = Math.max(0, ctx.volume - 15);
    ctx.setVolume(newVol);
    return { response: "Volume decreased to " + newVol + "%.", type: "command" };
  }

  // ── Mute ──────────────────────────────────────────────────────────────────
  if (/\b(mute|silence|quiet|no sound)\b/i.test(t)) {
    ctx.setVolume(0);
    return { response: "Volume muted.", type: "command" };
  }

  // ── Set brightness ────────────────────────────────────────────────────────
  const setBrightMatch = t.match(/set brightness (to |at )?(\d+)/i);
  if (setBrightMatch) {
    const val = Math.min(100, Math.max(10, parseInt(setBrightMatch[2])));
    ctx.setBrightness(val);
    return { response: "Brightness set to " + val + "%.", type: "command" };
  }

  // ── Brightness up ─────────────────────────────────────────────────────────
  if (/\b(brightness up|increase brightness|brighter|more brightness|raise brightness)\b/i.test(t)) {
    const newBright = Math.min(100, ctx.brightness + 15);
    ctx.setBrightness(newBright);
    return { response: "Brightness increased to " + newBright + "%.", type: "command" };
  }

  // ── Brightness down ───────────────────────────────────────────────────────
  if (/\b(brightness down|decrease brightness|dimmer|lower brightness|dim screen)\b/i.test(t)) {
    const newBright = Math.max(10, ctx.brightness - 15);
    ctx.setBrightness(newBright);
    return { response: "Brightness decreased to " + newBright + "%.", type: "command" };
  }

  // ── Shutdown ──────────────────────────────────────────────────────────────
  if (/\b(shutdown|shut down|power off|turn off.*computer|turn off.*pc|turn off.*system)\b/i.test(t)) {
    const confirmed = await ctx.askConfirmation("shutdown", "Are you sure you want to SHUTDOWN the system?");
    if (!confirmed) {
      return { response: "Shutdown cancelled. Wise choice!", type: "text", requiresConfirmation: true, confirmed: false };
    }
    return {
      response: "Shutdown command acknowledged. Connect the Python backend for real system control.",
      type: "error",
      requiresConfirmation: true,
      confirmed: true,
    };
  }

  // ── Restart ───────────────────────────────────────────────────────────────
  if (/\b(restart|reboot|reload.*computer|reload.*pc|reload.*system)\b/i.test(t)) {
    const confirmed = await ctx.askConfirmation("restart", "Are you sure you want to RESTART the system?");
    if (!confirmed) {
      return { response: "Restart cancelled.", type: "text", requiresConfirmation: true, confirmed: false };
    }
    return {
      response: "Restart command acknowledged. Connect the Python backend for real system control.",
      type: "error",
      requiresConfirmation: true,
      confirmed: true,
    };
  }

  // ── Sleep ─────────────────────────────────────────────────────────────────
  if (/\b(sleep|hibernate|suspend)\b/i.test(t)) {
    const confirmed = await ctx.askConfirmation("sleep", "Put the system to SLEEP?");
    if (!confirmed) {
      return { response: "Sleep cancelled.", type: "text", requiresConfirmation: true, confirmed: false };
    }
    return {
      response: "Sleep mode acknowledged. Connect the Python backend for real system control.",
      type: "command",
      requiresConfirmation: true,
      confirmed: true,
    };
  }

  // ── Lock screen ───────────────────────────────────────────────────────────
  if (/\b(lock.*screen|lock.*computer|lock.*pc|lock.*system|lock it)\b/i.test(t)) {
    return {
      response: "Screen lock acknowledged. Connect the Python backend to execute Win+L.",
      type: "command",
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WHATSAPP — detect before generic open_app so it's handled properly
  // ─────────────────────────────────────────────────────────────────────────

  // Pattern: "send whatsapp to [contact] saying [message]"
  // Pattern: "whatsapp [contact] saying [message]"
  // Pattern: "send whatsapp message to [contact] [message]"
  const whatsappDirectMatch = t.match(
    /\b(?:send\s+)?(?:a\s+)?whatsapp\s+(?:message\s+)?(?:to\s+)?([\w\s\+\-\(\)]+?)\s+(?:saying|message|text|with|say)\s+(.+)/i
  );
  if (whatsappDirectMatch) {
    const contact = whatsappDirectMatch[1].trim();
    const message = whatsappDirectMatch[2].trim();
    if (contact && message) {
      const cleanPhone = contact.replace(/[^\d+]/g, "");
      if (cleanPhone.length >= 10) {
        window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`, "_blank");
        return {
          response: `WhatsApp Web opened for +${cleanPhone} with message pre-filled: "${message}". Press Enter in the browser tab to send! 📱`,
          type: "command",
        };
      } else {
        window.open("https://web.whatsapp.com/", "_blank");
        return {
          response: `WhatsApp Web opened! Search for '${contact}' and the message "${message}" is ready. (For auto-send, use a phone number instead of a name.)`,
          type: "command",
        };
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMPOUND COMMANDS: "open [app] and write/type/message [text]"
  // ─────────────────────────────────────────────────────────────────────────
  const compound = splitCompoundCommand(t);
  if (compound) {
    const { app, rest } = compound;
    const appLower = app.toLowerCase();

    // WhatsApp compound: "open whatsapp and message John saying Hi"
    if (appLower === "whatsapp" || appLower === "whats app") {
      // Try to parse contact and message from rest
      const waMatch = rest.match(/^(?:message\s+)?(?:to\s+)?([\w\s]+?)\s+(?:saying|with message|that|:)?\s*(.+)$/i);
      if (waMatch) {
        const contact = waMatch[1].trim();
        const message = waMatch[2].trim();
        if (contact && message && contact.split(" ").length <= 4) {
          const cleanPhone = contact.replace(/[^\d+]/g, "");
          if (cleanPhone.length >= 10) {
            window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`, "_blank");
            return {
              response: `WhatsApp Web opened for +${cleanPhone} with message: "${message}". Press Enter to send! 📱`,
              type: "command",
            };
          } else {
            window.open("https://web.whatsapp.com/", "_blank");
            return {
              response: `WhatsApp Web opened! Find '${contact}' and send: "${message}". (Tip: use a phone number for fully automatic sending.)`,
              type: "command",
            };
          }
        }
      }
      // Fallback: just open WhatsApp Web
      window.open("https://web.whatsapp.com/", "_blank");
      return { response: "WhatsApp Web opened in a new tab! 📱", type: "command" };
    }

    // Notepad / text editor compound: "open notepad and write Hello"
    if (["notepad", "online notepad", "wordpad"].includes(appLower)) {
      const encoded = encodeURIComponent(rest);
      window.open(`https://notepad.link/?text=${encoded}`, "_blank");
      return {
        response: `Online notepad opened with your text pre-filled: "${rest}" ✏️`,
        type: "command",
      };
    }

    // Other apps: open the app first, then inform about typing
    const appResult = openApp(app);
    return {
      response: `${appResult.response} Once it's open, you can type: "${rest}"`,
      type: "command",
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SINGLE APP OPEN (no compound)
  // ─────────────────────────────────────────────────────────────────────────
  const openAppMatch = t.match(/^(open|launch|start|run)\s+(.+)/i);
  if (openAppMatch) {
    const rawApp = openAppMatch[2].trim();
    // Guard: reject if "and" is still in app name (missed compound split)
    if (!rawApp.toLowerCase().includes(" and ")) {
      return openApp(rawApp);
    }
  }

  // ── Close app ─────────────────────────────────────────────────────────────
  const closeAppMatch = t.match(/\b(close|quit|kill|stop)\s+(.+)/i);
  if (closeAppMatch) {
    const app = closeAppMatch[2].trim();
    return {
      response: `Close command for '${app}' acknowledged. Connect the Python backend for real process termination.`,
      type: "command",
    };
  }

  // ── Screenshot ────────────────────────────────────────────────────────────
  if (/\b(take|capture|grab).*(screenshot|screen shot|screen cap)\b/i.test(t) || /^screenshot$/i.test(t)) {
    return {
      response: "Screenshot requires the Python backend. Start buddybot/main.py to capture real screenshots.",
      type: "command",
    };
  }

  // ── Type / write text (standalone) ───────────────────────────────────────
  const typeMatch = t.match(/^(type|write|keyboard)\s+(?:message\s+|text\s+|code\s+|a\s+)?(.+)/i);
  if (typeMatch) {
    const textToType = typeMatch[2].trim();
    return {
      response: `Typing automation requires the Python backend. Start buddybot/main.py to type: "${textToType}"`,
      type: "command",
    };
  }

  // ── Press key ─────────────────────────────────────────────────────────────
  const pressKeyMatch = t.match(/\b(press|hit|tap)\s+(key\s+)?(\w+)\b/i);
  if (pressKeyMatch) {
    const keyName = pressKeyMatch[3];
    return {
      response: `Key press for '${keyName}' acknowledged. Connect the Python backend for real keystrokes.`,
      type: "command",
    };
  }

  // ── Hotkey / shortcut ─────────────────────────────────────────────────────
  const hotkeyMatch = t.match(/\b(hotkey|shortcut|keys)\s+(.+)/i);
  if (hotkeyMatch) {
    const keysStr = hotkeyMatch[2];
    return {
      response: `Shortcut '${keysStr}' acknowledged. Connect the Python backend to execute real keyboard shortcuts.`,
      type: "command",
    };
  }

  // ── Email ─────────────────────────────────────────────────────────────────
  const emailMatch = t.match(/\b(?:send\s+)?email\s+(?:to\s+)?([\w\.\-\@]+)\s+(?:saying|message|subject)?\s*(.+)/i);
  if (emailMatch) {
    const recipient = emailMatch[1].trim();
    let body = emailMatch[2].trim();
    let subject = "Message from JARVIS AI";
    const subMatch = body.match(/subject\s+(.+?)\s+(?:message|body|saying|text)\s+(.+)/i);
    if (subMatch) {
      subject = subMatch[1].trim();
      body = subMatch[2].trim();
    }
    window.open(`mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
    return {
      response: `Email draft opened for '${recipient}' with subject "${subject}". Your default mail app should open!`,
      type: "command",
    };
  }

  // ── Search web ────────────────────────────────────────────────────────────
  const searchMatch = t.match(/^(search|google|look up|find)\s+(.+)/i);
  if (searchMatch) {
    const query = searchMatch[2];
    window.open("https://www.google.com/search?q=" + encodeURIComponent(query), "_blank");
    return { response: "Searching for \"" + query + "\" on Google. 🔍", type: "command" };
  }

  // ── Math ──────────────────────────────────────────────────────────────────
  const mathMatch = t.match(/(?:calculate|compute|what is|=)\s*([\d\s+\-*/().]+)/i);
  if (mathMatch) {
    try {
      const expr = mathMatch[1].trim();
      // eslint-disable-next-line no-new-func
      const result = Function('"use strict"; return (' + expr + ')')();
      if (typeof result === "number" && isFinite(result)) {
        return { response: expr + " = " + result, type: "success" };
      }
    } catch (_) {}
  }

  // ── Joke ──────────────────────────────────────────────────────────────────
  if (/\b(joke|make me laugh|something funny|tell.*joke)\b/i.test(t)) {
    return { response: pickRandom(jokes), type: "text" };
  }

  // ── System status ─────────────────────────────────────────────────────────
  if (/\b(system status|diagnostics|health check|how are you|system info)\b/i.test(t)) {
    return {
      response:
        "BuddyBot System Status — Neural networks: ONLINE | Voice recognition: ACTIVE | Command processor: READY | Memory integrity: 100% | Security protocols: ENGAGED | All systems fully operational, Commander.",
      type: "system",
    };
  }

  // ── Who are you ───────────────────────────────────────────────────────────
  if (/\b(who are you|what are you|introduce yourself|your name|tell me about yourself)\b/i.test(t)) {
    return {
      response:
        "I'm BuddyBot — a JARVIS-style AI desktop assistant. Engineered to control your system, respond to voice commands, and provide an immersive futuristic experience. Think of me as your digital co-pilot.",
      type: "text",
    };
  }

  // ── Thanks ────────────────────────────────────────────────────────────────
  if (/\b(thanks|thank you|thx|cheers|appreciate|great|awesome|perfect)\b/i.test(t)) {
    return {
      response: pickRandom([
        "You're welcome! Always here to help.",
        "Anytime, Commander. That's what I'm here for.",
        "Happy to assist! Anything else you need?",
        "My pleasure. BuddyBot at your service!",
      ]),
      type: "text",
    };
  }

  // ── Goodbye ───────────────────────────────────────────────────────────────
  if (/\b(bye|goodbye|see you|farewell|exit|quit)\b/i.test(t)) {
    return {
      response: "Farewell, Commander. BuddyBot remains on standby. Neural networks conserving energy...",
      type: "system",
    };
  }

  // ── Weather ───────────────────────────────────────────────────────────────
  if (/\b(weather|temperature|forecast|how.*weather)\b/i.test(t)) {
    return {
      response:
        "Weather integration requires an API key. Connect to OpenWeatherMap for live data. For now — optimal atmospheric conditions detected for computing!",
      type: "text",
    };
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  return { response: await generateResponse(text), type: "text" };
}

export async function generateResponse(text: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 500 + Math.random() * 400));

  const keywords = text.toLowerCase();

  if (keywords.includes("love") || keywords.includes("like")) {
    return "That's interesting! As an AI, I process preferences differently, but I appreciate the sentiment.";
  }
  if (keywords.includes("feel") || keywords.includes("sad") || keywords.includes("happy")) {
    return "I'm attuned to your emotional state. Remember, I'm here to help make things easier for you!";
  }
  if (keywords.includes("smart") || keywords.includes("intelligent") || keywords.includes("ai")) {
    return "Intelligence is my core function. I continuously learn from interactions to serve you better.";
  }
  if (keywords.includes("future") || keywords.includes("technology")) {
    return "The future is now! We're living in an era of incredible technological advancement. I'm proud to be part of it.";
  }

  return pickRandom(unknownResponses);
}
