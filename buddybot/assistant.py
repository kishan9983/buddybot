"""
BuddyBot AI Brain Module
Handles intent recognition, command dispatch, and response generation
"""

import re
import logging
import random
import time
from datetime import datetime
from config import (
    USE_OPENAI, OPENAI_API_KEY, OPENAI_MODEL,
    BOT_NAME, BOT_PERSONA,
    USE_OPENROUTER, OPENROUTER_API_KEY, OPENROUTER_BASE_URL, OPENROUTER_MODEL
)
import commands

logger = logging.getLogger("BuddyBot.Assistant")

# ─── OpenAI / OpenRouter setup ─────────────────────────────────────────────────
_openai_client = None
_ai_model = OPENAI_MODEL

if USE_OPENROUTER:
    try:
        from openai import OpenAI
        _openai_client = OpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url=OPENROUTER_BASE_URL
        )
        _ai_model = OPENROUTER_MODEL
        logger.info(f"OpenRouter client initialized with model: {_ai_model}")
    except ImportError:
        logger.warning("openai library not installed. Using fallback responses.")
elif USE_OPENAI:
    try:
        from openai import OpenAI
        _openai_client = OpenAI(api_key=OPENAI_API_KEY)
        _ai_model = OPENAI_MODEL
        logger.info(f"OpenAI client initialized with model: {_ai_model}")
    except ImportError:
        logger.warning("openai library not installed. Using fallback responses.")

# ─── Conversation memory ───────────────────────────────────────────────────────
_conversation_history: list[dict] = [
    {"role": "system", "content": BOT_PERSONA}
]
MAX_HISTORY = 20

# ─── Fallback responses ────────────────────────────────────────────────────────
UNKNOWN_RESPONSES = [
    "I didn't quite catch that. Could you rephrase your command?",
    "That command isn't in my database yet. Try 'help' to see what I can do.",
    "Hmm, I'm not sure how to handle that. My knowledge is expanding though!",
    "Command not recognized. Perhaps try rephrasing?",
]

GREETING_RESPONSES = [
    f"Hello! {BOT_NAME} is fully operational. How may I assist you?",
    "Hey there! All systems are go. What do you need?",
    "Greetings! Ready to serve, Commander.",
    "Good to see you! Neural networks firing on all cylinders.",
]

JOKES = [
    "Why do programmers prefer dark mode? Because light attracts bugs!",
    "I would tell you a joke about UDP, but you might not get it.",
    "Why did the computer go to the doctor? It had a virus!",
    "Why did the JavaScript developer wear glasses? Because he couldn't C#!",
    "There are 10 types of people: those who understand binary, and those who don't.",
    "A SQL query walks into a bar and asks two tables: 'Can I JOIN you?'",
]

HELP_TEXT = f"""
{BOT_NAME} — Available Commands:

SYSTEM CONTROL:
  open [app]                    — Open Chrome, Notepad, Calculator, VS Code, WhatsApp, Paint
  close [app]                   — Close a running application
  screenshot                    — Take a screenshot (saved to Desktop)

APP + ACTION (MULTI-INTENT):
  open notepad and write [text] — Open Notepad and type text automatically
  open whatsapp and message [contact] [text]  — Open WhatsApp and send a message
  send whatsapp to [contact] saying [message] — WhatsApp message automation

VOLUME:
  volume up/down      — Adjust volume
  mute / unmute       — Toggle mute
  set volume [0-100]  — Set exact volume

BRIGHTNESS:
  brightness up/down  — Adjust screen brightness
  set brightness [10-100] — Set exact brightness

POWER:
  shutdown            — Shutdown system (with confirmation)
  restart             — Restart system (with confirmation)
  sleep               — Put system to sleep (with confirmation)
  lock screen         — Lock the screen

WEB:
  open google/youtube — Open websites
  search [query]      — Google search
  open [url]          — Open any URL

INFO:
  time / date         — Get current time/date
  battery             — Battery status
  system info         — Full system stats
  running apps        — List open processes

FUN:
  tell me a joke      — Random programming joke

Say "Hey Buddy" to activate voice mode!
"""


def pick(lst: list) -> str:
    return random.choice(lst)


# ─── Intent matcher ─────────────────────────────────────────────────────────────
def match(pattern: str, text: str) -> re.Match | None:
    return re.search(pattern, text, re.IGNORECASE)


# ─── Multi-intent splitter ──────────────────────────────────────────────────────
def _split_compound_command(text: str):
    """
    Split compound commands like:
      "open notepad and write Hello World"
      "open whatsapp and send message to John saying Hi there"
      "open notepad and type some code"
    Returns (primary_part, secondary_part) or (text, None) if no split found.
    """
    # Pattern: open/launch/start/run [app] and (write|type|send|message|say) [rest]
    compound = re.match(
        r"^(open|launch|start|run)\s+(.+?)\s+and\s+(write|type|send|message|say|note|compose)\s+(.+)$",
        text.strip(),
        re.IGNORECASE
    )
    if compound:
        verb = compound.group(1)
        app = compound.group(2).strip()
        action_verb = compound.group(3).strip()
        rest = compound.group(4).strip()
        return (f"{verb} {app}", action_verb, rest)

    return (text, None, None)


def split_sequential_commands(text: str) -> list[str]:
    """
    Split complex commands like:
      "open notepad and write some code and then open whatsapp and send message"
    into a list of distinct command strings.
    """
    t = text.strip()
    
    # List of known helper verbs/commands to separate boundaries
    verbs = [
        "open", "launch", "start", "run", "go to",
        "write", "type", "keyboard", "say", "insert",
        "close", "quit", "kill", "stop",
        "send", "message", "whatsapp", "email",
        "search", "google", "look up",
        "screenshot", "screen cap", "capture screen",
        "volume", "mute", "unmute",
        "brightness", "set brightness",
        "shutdown", "restart", "sleep", "lock"
    ]
    
    # 1. Split on "and then", ", then", "then"
    t = re.sub(r"\b(?:and\s+)?then\b", " || ", t, flags=re.IGNORECASE)
    t = re.sub(r",\s*then\b", " || ", t, flags=re.IGNORECASE)
    
    # 2. Split on "and" or commas followed by action verbs
    for verb in verbs:
        t = re.sub(rf"\b(and)\s+({re.escape(verb)})\b", r" || \2", t, flags=re.IGNORECASE)
        t = re.sub(rf",\s*({re.escape(verb)})\b", r" || \1", t, flags=re.IGNORECASE)
        
    parts = [p.strip() for p in t.split(" || ") if p.strip()]
    
    # Clean up trailing/leading "and"s from individual parts
    cleaned_parts = []
    for p in parts:
        p_clean = re.sub(r"^(and\s+)+", "", p, flags=re.IGNORECASE).strip()
        if p_clean:
            cleaned_parts.append(p_clean)
            
    return cleaned_parts


def generate_text_to_type(prompt: str) -> str:
    """
    Generate dynamic content using OpenRouter/OpenAI for writing tasks
    (e.g., code generation, letter drafting) if description pattern is matched.
    Otherwise, returns the prompt literally.
    """
    descriptive_triggers = [
        r"^(a\s+)?code\s+to\b",
        r"^(a\s+)?python\s+code\b",
        r"^(a\s+)?java(script)?\s+code\b",
        r"^(a\s+)?html\s+code\b",
        r"^(a\s+)?c\+\+\s+code\b",
        r"^(a\s+)?program\s+to\b",
        r"^(a\s+)?script\s+to\b",
        r"^(a\s+)?letter\b",
        r"^(an\s+)?email\b",
        r"^(a\s+)?resignation\b",
        r"^(a\s+)?cover\s+letter\b",
        r"^(a\s+)?poem\b",
        r"^(a\s+)?story\b",
        r"^(an\s+)?essay\b",
        r"^(a\s+)?summary\b",
        r"^how\s+to\b",
        r"^write\s+a\b",
        r"^type\s+a\b"
    ]
    
    is_descriptive = any(re.search(pat, prompt, re.IGNORECASE) for pat in descriptive_triggers)
    
    if not is_descriptive or not _openai_client:
        return prompt
        
    try:
        logger.info(f"AI content generation requested for: '{prompt}'")
        system_prompt = (
            "You are Jarvis, the digital assistant. The user wants to type or write some text. "
            "Because this prompt is a description of content to generate (like code, an email, or a poem), "
            "your job is to generate the complete, high-quality, professional document or code requested. "
            "Do NOT write any introduction, conversational filler, markdown formatting (like ```python or ```), "
            "or side explanations. Return ONLY the raw code or text content to be pasted directly into an editor."
        )
        
        response = _openai_client.chat.completions.create(
            model=_ai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            max_tokens=800,
            temperature=0.7,
        )
        
        generated = response.choices[0].message.content
        if generated:
            lines = generated.split("\n")
            if lines and lines[0].strip().startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip().startswith("```"):
                lines = lines[:-1]
            cleaned = "\n".join(lines).strip()
            logger.info(f"Successfully generated {len(cleaned)} chars of content.")
            return cleaned
    except Exception as e:
        logger.error(f"AI generation failed: {e}. Falling back to literal typing.")
        
    return prompt


def process_command(text: str) -> dict:
    t = text.strip()
    
    # Check if this is a sequence of multiple commands
    steps = split_sequential_commands(t)
    if len(steps) > 1:
        logger.info(f"Executing sequence of {len(steps)} steps: {steps}")
        results = []
        requires_confirm = False
        action_name = None
        
        for i, step in enumerate(steps):
            logger.info(f"Step {i+1}/{len(steps)}: '{step}'")
            step_res = _process_single_command(step)
            
            results.append(step_res["response"])
            
            if step_res.get("requires_confirmation"):
                requires_confirm = True
                action_name = step_res.get("action")
                
            # Sleep briefly to let the system focus windows / perform UI tasks
            if step_res.get("action") and any(x in step_res["action"] for x in ("open", "launch", "run", "type", "write", "send")):
                time.sleep(3.0)
            else:
                time.sleep(1.0)
                
        # Format the sequential output nicely
        response_lines = ["Commander, I have completed the task sequence:"]
        for idx, res in enumerate(results):
            response_lines.append(f" {idx+1}. {res}")
            
        combined_response = "\n".join(response_lines)
        return {
            "response": combined_response,
            "action": action_name if requires_confirm else "sequence_executed",
            "requires_confirmation": requires_confirm,
            "data": {"steps": steps, "results": results}
        }
        
    return _process_single_command(text)


def _process_single_command(text: str) -> dict:
    """
    Main intent recognition and command dispatcher.

    Returns: {
        "response": str,
        "action": str | None,
        "requires_confirmation": bool,
        "data": dict
    }
    """
    t = text.strip()
    result = {
        "response": "",
        "action": None,
        "requires_confirmation": False,
        "data": {}
    }

    # ── Greeting ──────────────────────────────────────────────────────────────
    if match(r"^(hello|hi|hey|howdy|greetings|good (morning|afternoon|evening))", t):
        result["response"] = pick(GREETING_RESPONSES)
        return result

    # ── Help ──────────────────────────────────────────────────────────────────
    if match(r"\b(help|commands|what can you do|capabilities|features)\b", t):
        result["response"] = HELP_TEXT
        return result

    # ── Time ──────────────────────────────────────────────────────────────────
    if match(r"\b(what.?s the time|what time is it|current time|tell me the time|time now)\b", t):
        result["response"] = f"The current time is {commands.get_time()}."
        return result

    # ── Date ──────────────────────────────────────────────────────────────────
    if match(r"\b(what.?s the date|what day is it|today.?s date|current date)\b", t):
        result["response"] = f"Today is {commands.get_date()}."
        return result

    # ── Date + Time ───────────────────────────────────────────────────────────
    if match(r"\b(date and time|time and date)\b", t):
        result["response"] = f"Date: {commands.get_date()} | Time: {commands.get_time()}"
        return result

    # ── System info ───────────────────────────────────────────────────────────
    if match(r"\b(system (info|status|stats)|diagnostics|health check)\b", t):
        info = commands.get_system_info()
        lines = [f"{BOT_NAME} System Report:"]
        if "cpu_percent" in info:
            lines.append(f"  CPU: {info['cpu_percent']}%")
        if "memory_percent" in info:
            lines.append(f"  Memory: {info['memory_percent']}% ({info.get('memory_used_gb','?')} GB used)")
        if "uptime" in info:
            lines.append(f"  Uptime: {info['uptime']}")
        if "battery_percent" in info:
            status = "charging" if info.get("battery_plugged") else "discharging"
            lines.append(f"  Battery: {info['battery_percent']}% ({status})")
        lines.append(f"  OS: {info.get('os', 'Windows')}")
        result["response"] = "\n".join(lines)
        return result

    # ── Battery ───────────────────────────────────────────────────────────────
    if match(r"\bbattery\b", t):
        result["response"] = commands.get_battery()
        return result

    # ── Running apps ──────────────────────────────────────────────────────────
    if match(r"\b(running apps|running processes|open apps|what.?s running)\b", t):
        result["response"] = commands.list_running_apps()
        return result

    # ── Volume: set exact ─────────────────────────────────────────────────────
    vol_set = match(r"set volume (to |at )?(\d+)", t)
    if vol_set:
        val = int(vol_set.group(2))
        result["response"] = commands.set_volume(val)
        result["action"] = "set_volume"
        return result

    # ── Volume up ─────────────────────────────────────────────────────────────
    if match(r"\b(volume up|increase volume|turn.*(it|volume).*up|louder|raise volume)\b", t):
        result["response"] = commands.volume_up()
        result["action"] = "volume_up"
        return result

    # ── Volume down ───────────────────────────────────────────────────────────
    if match(r"\b(volume down|decrease volume|turn.*(it|volume).*down|quieter|lower volume)\b", t):
        result["response"] = commands.volume_down()
        result["action"] = "volume_down"
        return result

    # ── Mute ──────────────────────────────────────────────────────────────────
    if match(r"\b(mute|unmute|silence|no sound)\b", t):
        result["response"] = commands.mute_volume()
        result["action"] = "mute"
        return result

    # ── Brightness: set exact ─────────────────────────────────────────────────
    bright_set = match(r"set brightness (to |at )?(\d+)", t)
    if bright_set:
        val = int(bright_set.group(2))
        result["response"] = commands.set_brightness(val)
        result["action"] = "set_brightness"
        return result

    # ── Brightness up ─────────────────────────────────────────────────────────
    if match(r"\b(brightness up|increase brightness|brighter|raise brightness|more light)\b", t):
        result["response"] = commands.brightness_up()
        result["action"] = "brightness_up"
        return result

    # ── Brightness down ───────────────────────────────────────────────────────
    if match(r"\b(brightness down|decrease brightness|dimmer|lower brightness|less light)\b", t):
        result["response"] = commands.brightness_down()
        result["action"] = "brightness_down"
        return result

    # ── Screenshot ────────────────────────────────────────────────────────────
    if match(r"\b(screenshot|screen shot|screen cap|capture screen)\b", t):
        result["response"] = commands.take_screenshot()
        result["action"] = "screenshot"
        return result

    # ── Lock screen ───────────────────────────────────────────────────────────
    if match(r"\b(lock (the )?(screen|computer|pc|system)|lock it)\b", t):
        result["response"] = commands.lock_screen()
        result["action"] = "lock_screen"
        return result

    # ── Shutdown ──────────────────────────────────────────────────────────────
    if match(r"\b(shutdown|shut down|power off|turn off (the )?(computer|pc|system))\b", t):
        result["response"] = "⚠️ Confirm shutdown? This will close all apps and power off."
        result["action"] = "shutdown"
        result["requires_confirmation"] = True
        return result

    # ── Restart ───────────────────────────────────────────────────────────────
    if match(r"\b(restart|reboot|reload (the )?(computer|pc|system))\b", t):
        result["response"] = "⚠️ Confirm restart? The system will reboot."
        result["action"] = "restart"
        result["requires_confirmation"] = True
        return result

    # ── Sleep ─────────────────────────────────────────────────────────────────
    if match(r"\b(sleep|hibernate|suspend)\b", t):
        result["response"] = "⚠️ Confirm sleep mode?"
        result["action"] = "sleep"
        result["requires_confirmation"] = True
        return result

    # ── Cancel shutdown ───────────────────────────────────────────────────────
    if match(r"\b(cancel (shutdown|restart)|abort shutdown)\b", t):
        result["response"] = commands.cancel_shutdown()
        return result

    # ── Open website (explicit URL) ───────────────────────────────────────────
    open_url = match(r"open (https?://\S+)", t)
    if open_url:
        result["response"] = commands.open_website(open_url.group(1))
        return result

    # ── Open Google / YouTube / GitHub ───────────────────────────────────────
    if match(r"\b(open|go to|launch|start)\s+google\b", t):
        result["response"] = commands.open_website("google.com")
        return result
    if match(r"\b(open|go to|launch|start)\s+youtube\b", t):
        result["response"] = commands.open_website("youtube.com")
        return result
    if match(r"\b(open|go to|launch|start)\s+github\b", t):
        result["response"] = commands.open_website("github.com")
        return result

    # ── WhatsApp automation (MUST come before generic open_app) ──────────────
    # Pattern 1: "send whatsapp to [contact] saying [message]"
    # Pattern 2: "whatsapp [contact] [message]"
    # Pattern 3: "send whatsapp message to [contact] saying [message]"
    whatsapp_m = match(
        r"\b(?:send\s+)?(?:a\s+)?whatsapp\s+(?:message\s+)?(?:to\s+)?([\w\s\+\-\(\)]+?)\s+(?:saying|message|text|with|say)\s+(.+)",
        t
    )
    if whatsapp_m:
        contact = whatsapp_m.group(1).strip()
        message = whatsapp_m.group(2).strip()
        if contact and message:
            result["response"] = commands.send_whatsapp(contact, message)
            result["action"] = "send_whatsapp"
            return result

    # ── Email Automation ──────────────────────────────────────────────────────
    email_m = match(
        r"\b(?:send\s+)?email\s+(?:to\s+)?([\w\.\-\@]+)\s+(?:saying|message|subject)?\s*(.+)",
        t
    )
    if email_m:
        recipient = email_m.group(1).strip()
        body = email_m.group(2).strip()
        subject = "Message from JARVIS AI"
        sub_m = re.search(r"subject\s+(.+?)\s+(?:message|body|saying|text)\s+(.+)", body, re.IGNORECASE)
        if sub_m:
            subject = sub_m.group(1).strip()
            body = sub_m.group(2).strip()
        if recipient and body:
            result["response"] = commands.send_email(recipient, subject, body)
            result["action"] = "send_email"
            return result

    # ── Search ────────────────────────────────────────────────────────────────
    search_m = match(r"^(search|google|look up|find)\s+(.+)", t)
    if search_m:
        query = search_m.group(2)
        result["response"] = commands.search_google(query)
        return result

    # ─────────────────────────────────────────────────────────────────────────
    # COMPOUND / MULTI-INTENT COMMANDS
    # "open notepad and write some code"
    # "open whatsapp and message John saying hello"
    # "open notepad and type Hello World"
    # ─────────────────────────────────────────────────────────────────────────
    primary, action_verb, rest = _split_compound_command(t)

    if action_verb is not None:
        # Step 1: Extract app name from the primary part
        open_m = match(r"^(open|launch|start|run)\s+(.+)$", primary)
        app_name = open_m.group(2).strip() if open_m else primary.strip()

        # Step 2: Check if it's a WhatsApp compound command
        # e.g. "open whatsapp and send message to John saying hi"
        # rest = "message to John saying hi" OR "John hi there"
        if app_name.lower() in ("whatsapp", "whats app"):
            # Try to extract contact and message from rest
            # "message to [contact] saying [msg]" or "to [contact] [msg]" or "[contact] [msg]"
            wa_rest = match(
                r"(?:message\s+)?(?:to\s+)?([\w\s]+?)\s+(?:saying|with message|that|:)?\s*(.+)",
                rest
            )
            if wa_rest:
                contact = wa_rest.group(1).strip()
                message = wa_rest.group(2).strip()
                # Ensure contact is not overly long (catch-all mismatch guard)
                if contact and message and len(contact.split()) <= 4:
                    open_resp = commands.open_app("whatsapp")
                    time.sleep(3.5)
                    wa_resp = commands.send_whatsapp(contact, message)
                    result["response"] = f"{open_resp} Then: {wa_resp}"
                    result["action"] = "send_whatsapp"
                    return result

            # Fallback: just open WhatsApp
            result["response"] = commands.open_app("whatsapp")
            result["action"] = "open_whatsapp"
            return result

        # Step 3: For other apps (notepad, vscode, wordpad, etc.) open and type
        open_resp = commands.open_app(app_name)
        time.sleep(2.0)  # Wait for the app to open and focus

        # Now type the rest (AI generated if requested)
        content_to_type = generate_text_to_type(rest)
        type_resp = commands.type_text(content_to_type)
        snippet = content_to_type[:60] + "..." if len(content_to_type) > 60 else content_to_type
        result["response"] = f"{open_resp} Then typed:\n\"{snippet}\""
        result["action"] = f"open_{app_name.replace(' ', '_')}_and_type"
        return result

    # ─────────────────────────────────────────────────────────────────────────
    # SINGLE INTENT COMMANDS (after compound check)
    # ─────────────────────────────────────────────────────────────────────────

    # ── Write/Type message (standalone) ──────────────────────────────────────
    type_m = match(r"^(type|write|keyboard)\s+(?:message\s+|text\s+|code\s+|a\s+)?(.+)", t)
    if type_m:
        text_to_type = type_m.group(2).strip()
        if text_to_type:
            content_to_type = generate_text_to_type(text_to_type)
            type_resp = commands.type_text(content_to_type)
            snippet = content_to_type[:60] + "..." if len(content_to_type) > 60 else content_to_type
            result["response"] = f"Typed:\n\"{snippet}\""
            result["action"] = "type_text"
            return result

    # ── Press key ─────────────────────────────────────────────────────────────
    press_m = match(r"\b(press|hit|tap)\s+(key\s+)?(\w+)\b", t)
    if press_m:
        key_name = press_m.group(3).strip()
        result["response"] = commands.press_key(key_name)
        result["action"] = "press_key"
        return result

    # ── Key shortcut / Hotkey ─────────────────────────────────────────────────
    hotkey_m = match(r"\b(hotkey|shortcut|keys)\s+(.+)", t)
    if hotkey_m:
        keys_str = hotkey_m.group(2).strip()
        result["response"] = commands.hotkey(keys_str)
        result["action"] = "hotkey"
        return result

    # ── Open application (single app, no compound) ────────────────────────────
    open_app_m = match(r"^(open|launch|start|run)\s+(.+)", t)
    if open_app_m:
        app = open_app_m.group(2).strip()
        # Guard: don't match if "and" is still in the app name (compound missed above)
        if " and " not in app.lower() and app not in ["it", "this", "that", "here"]:
            result["response"] = commands.open_app(app)
            result["action"] = f"open_{app.replace(' ', '_')}"
            return result

    # ── Close application ─────────────────────────────────────────────────────
    close_app_m = match(r"\b(close|quit|kill|stop)\s+(.+)", t)
    if close_app_m:
        app = close_app_m.group(2).strip()
        result["response"] = commands.close_app(app)
        result["requires_confirmation"] = True
        result["action"] = f"close_{app}"
        return result

    # ── Open folder ───────────────────────────────────────────────────────────
    folder_m = match(r"\b(open|show)\s+(the )?(folder|directory|desktop|downloads|documents)\b", t)
    if folder_m:
        folder_name = folder_m.group(3)
        paths = {
            "desktop":   "~/Desktop",
            "downloads": "~/Downloads",
            "documents": "~/Documents",
        }
        path = paths.get(folder_name.lower(), "~")
        result["response"] = commands.open_folder(path)
        return result

    # ── Joke ──────────────────────────────────────────────────────────────────
    if match(r"\b(joke|tell me a joke|make me laugh|something funny)\b", t):
        result["response"] = pick(JOKES)
        return result

    # ── Who are you ───────────────────────────────────────────────────────────
    if match(r"\b(who are you|what are you|your name|introduce yourself)\b", t):
        result["response"] = (
            f"I'm {BOT_NAME} — a JARVIS-style AI desktop assistant. "
            "I can control your system, respond to voice commands, "
            "search the web, and hold intelligent conversations. "
            "Think of me as your digital co-pilot."
        )
        return result

    # ── Thanks ────────────────────────────────────────────────────────────────
    if match(r"\b(thanks|thank you|thx|cheers|appreciate|great job|well done)\b", t):
        result["response"] = pick([
            "You're welcome! Always here to help.",
            "Anytime, Commander. That's what I'm here for.",
            "Happy to assist! Anything else?",
            "My pleasure. BuddyBot at your service!",
        ])
        return result

    # ── Goodbye ───────────────────────────────────────────────────────────────
    if match(r"\b(bye|goodbye|see you|farewell|exit|quit|close)\b", t):
        result["response"] = f"Farewell, Commander. {BOT_NAME} remains on standby."
        return result

    # ── No intent matched: try OpenAI or fallback ─────────────────────────────
    result["response"] = generate_response(t)
    return result


# ─── Response generation ────────────────────────────────────────────────────────
def generate_response(text: str) -> str:
    """Generate a conversational response using OpenAI or fallback."""
    if _openai_client:
        try:
            _conversation_history.append({"role": "user", "content": text})
            if len(_conversation_history) > MAX_HISTORY:
                _conversation_history[1:] = _conversation_history[-(MAX_HISTORY - 1):]

            response = _openai_client.chat.completions.create(
                model=_ai_model,
                messages=_conversation_history,
                max_tokens=200,
                temperature=0.8,
            )

            reply = response.choices[0].message.content.strip()
            _conversation_history.append({"role": "assistant", "content": reply})
            return reply

        except Exception as e:
            logger.error(f"AI API error: {e}")
            return f"My AI core is temporarily unavailable. Error: {e}"

    # Fallback heuristic responses
    t = text.lower()
    if any(w in t for w in ["love", "like", "favourite", "favorite"]):
        return "That's interesting! I process preferences analytically, but I appreciate the sentiment."
    if any(w in t for w in ["feel", "sad", "happy", "emotion"]):
        return "I'm attuned to your state. I'm here to help make things easier for you!"
    if any(w in t for w in ["smart", "intelligent", "ai", "artificial"]):
        return "Intelligence is my core function. I continuously optimize to serve you better."
    if any(w in t for w in ["future", "technology", "robot"]):
        return "The future is now! I'm proud to be at the frontier of human-AI collaboration."

    return pick(UNKNOWN_RESPONSES)


# ─── Confirmed actions executor ─────────────────────────────────────────────────
def execute_confirmed_action(action: str) -> str:
    """Execute actions that required user confirmation."""
    if action == "shutdown":
        return commands.shutdown()
    elif action == "restart":
        return commands.restart()
    elif action == "sleep":
        return commands.sleep_system()
    elif action.startswith("close_"):
        app = action[6:].replace("_", " ")
        return commands.close_app(app)
    return "Unknown action."
