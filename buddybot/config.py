# ============================================================
# BuddyBot Configuration File
# ============================================================

import os

# ─── API Configuration ─────────────────────────────────────
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")   # Set your key here or via env var
OPENAI_MODEL   = "gpt-3.5-turbo"
USE_OPENAI     = bool(OPENAI_API_KEY)

# ─── OpenRouter Configuration ──────────────────────────────
OPENROUTER_API_KEY  = os.getenv("OPENROUTER_API_KEY", "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")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_MODEL    = "openrouter/free"
USE_OPENROUTER      = bool(OPENROUTER_API_KEY)

# ─── Wake Word ─────────────────────────────────────────────
WAKE_WORD      = "hey buddy"
WAKE_WORD_ALT  = ["hey bot", "buddy", "yo buddy"]

# ─── Voice / TTS ───────────────────────────────────────────
TTS_RATE       = 175          # words per minute
TTS_VOLUME     = 1.0          # 0.0 – 1.0
TTS_VOICE_ID   = 0            # 0=first system voice, change to prefer male/female
VOICE_TIMEOUT  = 5            # seconds to wait for speech
VOICE_PHRASE_LIMIT = 8        # max seconds per phrase

# ─── Flask server ──────────────────────────────────────────
FLASK_HOST     = "127.0.0.1"
FLASK_PORT     = 5000
FLASK_DEBUG    = False

# ─── Logging ───────────────────────────────────────────────
LOG_FILE       = "buddybot_log.txt"
LOG_MAX_LINES  = 1000

# ─── Screenshot ────────────────────────────────────────────
SCREENSHOT_DIR = os.path.join(os.path.expanduser("~"), "Desktop")

# ─── App paths (Windows) ───────────────────────────────────
APP_PATHS = {
    "chrome":      r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    "notepad":     "notepad.exe",
    "calculator":  "calc.exe",
    "vscode":      r"C:\Users\{username}\AppData\Local\Programs\Microsoft VS Code\Code.exe",
    "explorer":    "explorer.exe",
    "cmd":         "cmd.exe",
    "powershell":  "powershell.exe",
    "paint":       "mspaint.exe",
    "wordpad":     "write.exe",
}

# ─── Safety ────────────────────────────────────────────────
REQUIRE_CONFIRMATION = ["shutdown", "restart", "sleep", "kill_process"]

# ─── Personality ───────────────────────────────────────────
BOT_NAME       = "BuddyBot"
BOT_VERSION    = "2.0"
BOT_PERSONA    = (
    "You are BuddyBot, a JARVIS-style AI desktop assistant. "
    "You are helpful, concise, professional, and slightly witty. "
    "You speak in a futuristic, confident tone. "
    "Keep responses under 3 sentences unless a longer answer is truly needed."
)
