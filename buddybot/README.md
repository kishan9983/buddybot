# 🤖 BuddyBot — JARVIS-Style AI Desktop Assistant

A complete, production-ready AI desktop assistant with a futuristic UI, voice control, and system management capabilities.

---

## 🚀 Quick Start

### 1. Install Python dependencies

```bash
cd buddybot
pip install -r requirements.txt
```

### 2. Start the assistant

```bash
# Full web UI mode (recommended)
python main.py

# Voice-only CLI mode
python main.py --mode voice

# Text-only CLI mode
python main.py --mode text
```

### 3. Open the UI

Navigate to: **http://127.0.0.1:5000**

---

## 📂 Project Structure

```
buddybot/
├── main.py           # Entry point — Flask server + CLI launcher
├── assistant.py      # AI brain — intent recognition + response generation
├── commands.py       # System control functions
├── voice.py          # Speech recognition module
├── tts.py            # Text-to-speech module
├── config.py         # Settings and API keys
├── requirements.txt  # Python dependencies
├── templates/
│   └── index.html    # Full web UI
└── static/
    ├── css/style.css # Futuristic UI styles
    └── js/script.js  # Frontend logic + particle effects
```

---

## 🎤 Voice Commands

Say **"Hey Buddy"** to wake BuddyBot, then speak your command:

| Category | Commands |
|----------|----------|
| **Time/Date** | "What's the time", "What's the date" |
| **Volume** | "Volume up/down", "Mute", "Set volume to 50" |
| **Brightness** | "Brightness up/down", "Set brightness to 70" |
| **Apps** | "Open Chrome", "Open Notepad", "Open VS Code" |
| **Web** | "Open YouTube", "Search for Python tutorials" |
| **Power** | "Shutdown", "Restart", "Sleep", "Lock screen" |
| **System** | "System status", "Battery", "Running apps" |
| **Fun** | "Tell me a joke", "Who are you" |
| **Screenshot** | "Take a screenshot" |

---

## ⚙️ Configuration

Edit `config.py`:

```python
# Add your OpenAI API key for smarter responses
OPENAI_API_KEY = "sk-your-key-here"

# Voice settings
TTS_RATE   = 175    # Speech speed (words/min)
TTS_VOLUME = 1.0    # Volume (0.0 - 1.0)

# Server settings
FLASK_PORT = 5000
FLASK_HOST = "127.0.0.1"
```

---

## 🔐 Safety Features

- Shutdown, restart, and sleep require explicit confirmation
- App closing requires confirmation
- All errors are gracefully handled
- Logging to `buddybot_log.txt`

---

## 🎨 UI Features

- **Dark neon futuristic theme** with glassmorphism panels
- **Particle field** background animation
- **Hexagonal grid** overlay
- **Voice Orb** with state animations (idle/listening/processing/speaking)
- **Real-time system stats** (CPU, RAM, battery, processes)
- **Volume & brightness sliders**
- **Command history** with recall (↑/↓ arrow keys)
- **Keyboard shortcuts**: `Ctrl+L` = listen, `/` = focus input, `Esc` = stop

---

## 🧠 AI Features

- Intent recognition with 30+ command patterns
- Natural language understanding (multiple phrasings)
- OpenAI GPT integration (optional)
- Fallback responses when offline
- Conversation memory (with OpenAI mode)
- Wake word detection: "Hey Buddy"

---

## 📦 Requirements

| Package | Purpose |
|---------|---------|
| `flask` | Web server |
| `speechrecognition` | Voice input |
| `pyttsx3` | Text-to-speech |
| `pyautogui` | System control |
| `psutil` | System stats |
| `screen-brightness-control` | Screen brightness |
| `pycaw` | Windows audio control |
| `pygetwindow` | Window management |

---

## 🔧 Troubleshooting

**Voice not working?**
- Use Google Chrome (best SpeechRecognition support)
- Check microphone permissions in browser settings
- Ensure `pyttsx3` and `SpeechRecognition` are installed for Python TTS

**Brightness control fails?**
- Run as administrator
- Some monitors don't support software brightness control

**Volume control fails?**
- `pycaw` requires Windows 7+
- Run as administrator if needed

---

## 🌟 Architecture

```
User Input (Voice/Text)
        ↓
   Intent Recognition (assistant.py)
        ↓
   Command Dispatch (commands.py)
        ↓
   System Execution + Response
        ↓
   TTS Output (tts.py) + UI Update
```

---

*BuddyBot v2.0 — Built with Python, Flask, and a futuristic vision.*
