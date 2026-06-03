"""
BuddyBot Voice Recognition Module
Uses SpeechRecognition library with Google Web Speech API
"""

import speech_recognition as sr
import threading
import logging
import queue
from config import (
    WAKE_WORD, WAKE_WORD_ALT,
    VOICE_TIMEOUT, VOICE_PHRASE_LIMIT
)

logger = logging.getLogger("BuddyBot.Voice")

# ─── Shared state ──────────────────────────────────────────────────────────────
_recognizer       = sr.Recognizer()
_microphone       = None
_listening_active = False
_listen_thread    = None
_result_queue     = queue.Queue()

# ─── Mic setup ─────────────────────────────────────────────────────────────────
def _get_mic() -> sr.Microphone:
    global _microphone
    if _microphone is None:
        _microphone = sr.Microphone()
    return _microphone


def calibrate_noise(duration: float = 1.0) -> None:
    """Adjust recognizer sensitivity for ambient noise."""
    try:
        mic = _get_mic()
        with mic as source:
            logger.info("Calibrating for ambient noise...")
            _recognizer.adjust_for_ambient_noise(source, duration=duration)
            logger.info(f"Noise calibration complete. Energy threshold: {_recognizer.energy_threshold:.0f}")
    except Exception as e:
        logger.error(f"Noise calibration failed: {e}")


# ─── Single recognition ─────────────────────────────────────────────────────────
def listen_once(timeout: int = VOICE_TIMEOUT, phrase_limit: int = VOICE_PHRASE_LIMIT) -> str | None:
    """
    Listen for a single phrase.
    Returns the recognized text or None on failure/timeout.
    """
    try:
        mic = _get_mic()
        with mic as source:
            _recognizer.adjust_for_ambient_noise(source, duration=0.3)
            logger.info("Listening...")
            audio = _recognizer.listen(source, timeout=timeout, phrase_time_limit=phrase_limit)

        text = _recognizer.recognize_google(audio, language="en-US")
        logger.info(f"Recognized: {text}")
        return text.strip()

    except sr.WaitTimeoutError:
        logger.debug("Listen timeout — no speech detected.")
        return None
    except sr.UnknownValueError:
        logger.debug("Could not understand audio.")
        return None
    except sr.RequestError as e:
        logger.error(f"Google API error: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected listen error: {e}")
        return None


# ─── Wake word detection ────────────────────────────────────────────────────────
def contains_wake_word(text: str) -> bool:
    """Check if text contains the wake word."""
    lower = text.lower()
    if WAKE_WORD in lower:
        return True
    return any(alt in lower for alt in WAKE_WORD_ALT)


# ─── Continuous listening mode ──────────────────────────────────────────────────
def _continuous_listen_worker(callback, stop_event: threading.Event) -> None:
    """
    Background thread: continuously listens for the wake word,
    then listens for a command after detection.
    """
    logger.info("Continuous listening mode started.")
    mic = _get_mic()
    calibrate_noise()

    while not stop_event.is_set():
        try:
            with mic as source:
                audio = _recognizer.listen(source, timeout=3, phrase_time_limit=4)

            text = _recognizer.recognize_google(audio, language="en-US").lower()
            logger.debug(f"Heard: {text}")

            if contains_wake_word(text):
                logger.info(f"Wake word detected: '{text}'")
                callback("wake_word_detected", None)

                # Listen for the actual command
                command = listen_once(timeout=VOICE_TIMEOUT, phrase_limit=VOICE_PHRASE_LIMIT)
                if command:
                    callback("command", command)
                else:
                    callback("no_command", None)

        except sr.WaitTimeoutError:
            continue
        except sr.UnknownValueError:
            continue
        except sr.RequestError as e:
            logger.error(f"SR API error: {e}")
            continue
        except Exception as e:
            if not stop_event.is_set():
                logger.error(f"Continuous listen error: {e}")
            break

    logger.info("Continuous listening mode stopped.")


def start_continuous_listening(callback) -> threading.Event:
    """
    Start continuous background listening.
    callback(event_type, data) is called with:
      - ("wake_word_detected", None)
      - ("command", text)
      - ("no_command", None)
    Returns a stop_event that you can set() to stop listening.
    """
    global _listening_active, _listen_thread
    stop_event = threading.Event()

    if _listening_active:
        logger.warning("Already listening. Stop existing listener first.")
        return stop_event

    _listening_active = True
    _listen_thread = threading.Thread(
        target=_continuous_listen_worker,
        args=(callback, stop_event),
        daemon=True,
        name="BuddyBot-VoiceListener"
    )
    _listen_thread.start()
    return stop_event


def stop_continuous_listening(stop_event: threading.Event) -> None:
    """Stop continuous listening."""
    global _listening_active
    _listening_active = False
    stop_event.set()
    logger.info("Stop signal sent to voice listener.")
