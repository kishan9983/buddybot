"""
BuddyBot Text-To-Speech Module
Uses pyttsx3 for offline TTS
"""

import pyttsx3
import threading
import logging
from config import TTS_RATE, TTS_VOLUME, TTS_VOICE_ID

logger = logging.getLogger("BuddyBot.TTS")

# ─── Engine singleton ──────────────────────────────────────────────────────────
_engine: pyttsx3.Engine | None = None
_lock   = threading.Lock()
_voice_enabled = True


def _get_engine() -> pyttsx3.Engine:
    """Initialize or return existing TTS engine."""
    global _engine
    if _engine is None:
        try:
            _engine = pyttsx3.init()
            _engine.setProperty("rate", TTS_RATE)
            _engine.setProperty("volume", TTS_VOLUME)

            # Try to set preferred voice
            voices = _engine.getProperty("voices")
            if voices:
                # Try to find a male English voice
                for v in voices:
                    if "david" in v.name.lower() or "mark" in v.name.lower():
                        _engine.setProperty("voice", v.id)
                        break
                else:
                    # Fallback to configured index
                    idx = min(TTS_VOICE_ID, len(voices) - 1)
                    _engine.setProperty("voice", voices[idx].id)

            logger.info("TTS engine initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize TTS engine: {e}")
            raise
    return _engine


def speak(text: str, blocking: bool = False) -> None:
    """Speak text aloud. Non-blocking by default."""
    if not _voice_enabled or not text.strip():
        return

    # Strip markdown-like formatting for cleaner speech
    clean = (
        text.replace("**", "")
            .replace("*", "")
            .replace("`", "")
            .replace("#", "")
            .replace("—", " ")
    )

    def _speak():
        with _lock:
            try:
                engine = _get_engine()
                engine.say(clean)
                engine.runAndWait()
            except Exception as e:
                logger.error(f"TTS speak error: {e}")

    if blocking:
        _speak()
    else:
        thread = threading.Thread(target=_speak, daemon=True)
        thread.start()


def set_voice_enabled(enabled: bool) -> None:
    """Enable or disable voice output."""
    global _voice_enabled
    _voice_enabled = enabled
    logger.info(f"Voice output {'enabled' if enabled else 'disabled'}.")


def is_voice_enabled() -> bool:
    return _voice_enabled


def list_voices() -> list[dict]:
    """Return available voices as list of dicts."""
    try:
        engine = _get_engine()
        voices = engine.getProperty("voices")
        return [{"id": v.id, "name": v.name, "lang": v.languages} for v in voices]
    except Exception as e:
        logger.error(f"Could not list voices: {e}")
        return []


def set_rate(rate: int) -> None:
    """Set speech rate (words per minute)."""
    try:
        engine = _get_engine()
        engine.setProperty("rate", rate)
    except Exception as e:
        logger.error(f"Could not set rate: {e}")


def set_volume(volume: float) -> None:
    """Set speech volume (0.0 – 1.0)."""
    try:
        engine = _get_engine()
        engine.setProperty("volume", max(0.0, min(1.0, volume)))
    except Exception as e:
        logger.error(f"Could not set volume: {e}")
