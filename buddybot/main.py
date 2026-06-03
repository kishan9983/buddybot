"""
BuddyBot — JARVIS-Style AI Desktop Assistant
Main Entry Point

Usage:
    python main.py              # Start with web UI (Flask)
    python main.py --voice      # Voice-only CLI mode
    python main.py --text       # Text-only CLI mode

Windows Requirements:
    pip install -r requirements.txt
"""

import sys
import os
import logging
import argparse
import threading
import signal

# ─── Logging setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    handlers=[
        logging.FileHandler("buddybot_log.txt", encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger("BuddyBot.Main")


def print_banner():
    banner = r"""
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║    ██████╗ ██╗   ██╗██████╗ ██████╗ ██╗   ██╗              ║
║    ██╔══██╗██║   ██║██╔══██╗██╔══██╗╚██╗ ██╔╝              ║
║    ██████╔╝██║   ██║██║  ██║██║  ██║ ╚████╔╝               ║
║    ██╔══██╗██║   ██║██║  ██║██║  ██║  ╚██╔╝                ║
║    ██████╔╝╚██████╔╝██████╔╝██████╔╝   ██║                 ║
║    ╚═════╝  ╚═════╝ ╚═════╝ ╚═════╝    ╚═╝                 ║
║                                                              ║
║         ██████╗  ██████╗ ████████╗                          ║
║         ██╔══██╗██╔═══██╗╚══██╔══╝                          ║
║         ██████╔╝██║   ██║   ██║                             ║
║         ██╔══██╗██║   ██║   ██║                             ║
║         ██████╔╝╚██████╔╝   ██║                             ║
║         ╚═════╝  ╚═════╝    ╚═╝                             ║
║                                                              ║
║         JARVIS-Class AI Assistant  v2.0                      ║
║         Running on Windows  |  Neural Networks ONLINE        ║
╚══════════════════════════════════════════════════════════════╝
"""
    try:
        print(banner)
    except UnicodeEncodeError:
        print("BUDDYBOT — JARVIS-Class AI Assistant v2.0")


# ─── CLI Text Mode ─────────────────────────────────────────────────────────────
def run_text_mode():
    """Interactive text-only CLI mode."""
    from assistant import process_command, execute_confirmed_action

    logger.info("Starting BuddyBot in TEXT mode.")
    print("\n[BuddyBot] Text mode active. Type 'quit' to exit.\n")

    while True:
        try:
            user_input = input("You > ").strip()
            if not user_input:
                continue
            if user_input.lower() in ["quit", "exit", "bye"]:
                print("[BuddyBot] Goodbye, Commander!")
                break

            result = process_command(user_input)
            print(f"[BuddyBot] {result['response']}\n")

            # Handle confirmations
            if result.get("requires_confirmation"):
                confirm = input("Confirm? (yes/no) > ").strip().lower()
                if confirm in ["yes", "y", "confirm"]:
                    action_result = execute_confirmed_action(result["action"])
                    print(f"[BuddyBot] {action_result}\n")
                else:
                    print("[BuddyBot] Action cancelled.\n")

        except KeyboardInterrupt:
            print("\n[BuddyBot] Interrupted. Goodbye!")
            break
        except Exception as e:
            logger.error(f"Text mode error: {e}")
            print(f"[BuddyBot] Error: {e}\n")


# ─── Voice Mode ────────────────────────────────────────────────────────────────
def run_voice_mode():
    """Full voice interaction mode."""
    from assistant import process_command, execute_confirmed_action
    import tts
    import voice

    logger.info("Starting BuddyBot in VOICE mode.")
    print("\n[BuddyBot] Voice mode active. Say 'Hey Buddy' to start. Press Ctrl+C to stop.\n")

    tts.speak("BuddyBot is online. Say Hey Buddy to get started.", blocking=True)
    voice.calibrate_noise()

    def voice_callback(event_type: str, data):
        if event_type == "wake_word_detected":
            print("[BuddyBot] Wake word detected! Listening for command...")
            tts.speak("Yes?", blocking=False)

        elif event_type == "command":
            command_text = data
            print(f"You said: {command_text}")
            result = process_command(command_text)
            response = result["response"]
            print(f"[BuddyBot] {response}")
            tts.speak(response)

            if result.get("requires_confirmation"):
                tts.speak("Say yes to confirm or no to cancel.", blocking=True)
                confirm_text = voice.listen_once(timeout=5)
                if confirm_text and any(w in confirm_text.lower() for w in ["yes", "confirm", "do it", "proceed"]):
                    action_result = execute_confirmed_action(result["action"])
                    tts.speak(action_result)
                    print(f"[BuddyBot] {action_result}")
                else:
                    tts.speak("Action cancelled.")
                    print("[BuddyBot] Action cancelled.")

        elif event_type == "no_command":
            tts.speak("I didn't catch that. Please try again.")

    stop_event = voice.start_continuous_listening(voice_callback)

    try:
        signal.pause()  # Wait for Ctrl+C
    except (KeyboardInterrupt, AttributeError):
        print("\n[BuddyBot] Shutting down voice mode...")
        voice.stop_continuous_listening(stop_event)
        tts.speak("BuddyBot going offline. Goodbye, Commander!", blocking=True)


# ─── Flask Web UI Mode ─────────────────────────────────────────────────────────
def run_web_mode():
    """Start Flask web server with full UI."""
    try:
        from flask import Flask, render_template, request, jsonify, send_from_directory
        from flask_cors import CORS
    except ImportError:
        logger.error("Flask not installed. Run: pip install flask flask-cors")
        sys.exit(1)

    from assistant import process_command, execute_confirmed_action
    from config import FLASK_HOST, FLASK_PORT, FLASK_DEBUG
    import tts

    base_dir = os.path.dirname(os.path.abspath(__file__))
    app = Flask(__name__, 
                template_folder=os.path.join(base_dir, "templates"),
                static_folder=os.path.join(base_dir, "static"))
    CORS(app)

    @app.route("/")
    def index():
        return render_template("index.html")

    @app.route("/api/chat", methods=["POST"])
    def chat():
        data = request.get_json()
        if not data or "message" not in data:
            return jsonify({"error": "Missing 'message' field"}), 400

        message = data["message"].strip()
        if not message:
            return jsonify({"error": "Empty message"}), 400

        try:
            result = process_command(message)

            # Speak the response in background
            if data.get("voice", False):
                tts.speak(result["response"])

            return jsonify({
                "response": result["response"],
                "action": result.get("action"),
                "requires_confirmation": result.get("requires_confirmation", False),
            })
        except Exception as e:
            logger.error(f"Chat endpoint error: {e}")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/confirm", methods=["POST"])
    def confirm_action():
        data = request.get_json()
        if not data or "action" not in data:
            return jsonify({"error": "Missing 'action' field"}), 400

        confirmed = data.get("confirmed", False)
        action = data["action"]

        if confirmed:
            try:
                result = execute_confirmed_action(action)
                if data.get("voice", False):
                    tts.speak(result)
                return jsonify({"response": result, "success": True})
            except Exception as e:
                return jsonify({"error": str(e)}), 500
        else:
            msg = "Action cancelled."
            return jsonify({"response": msg, "success": False})

    @app.route("/api/system-info")
    def system_info():
        from commands import get_system_info
        return jsonify(get_system_info())

    @app.route("/api/voice/toggle", methods=["POST"])
    def toggle_voice():
        data = request.get_json() or {}
        enabled = data.get("enabled", True)
        tts.set_voice_enabled(enabled)
        return jsonify({"voice_enabled": tts.is_voice_enabled()})

    logger.info(f"BuddyBot Web UI starting at http://{FLASK_HOST}:{FLASK_PORT}")
    print(f"\n[BuddyBot] Web UI: http://{FLASK_HOST}:{FLASK_PORT}\n")

    tts.speak("BuddyBot web interface is online. Welcome, Commander.")

    app.run(
        host=FLASK_HOST,
        port=FLASK_PORT,
        debug=FLASK_DEBUG,
        use_reloader=False,
        threaded=True,
    )


# ─── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print_banner()

    parser = argparse.ArgumentParser(description="BuddyBot AI Assistant")
    parser.add_argument("--mode", choices=["web", "voice", "text"], default="web",
                        help="Launch mode: web (default), voice, or text")
    args = parser.parse_args()

    logger.info(f"BuddyBot v2.0 starting in {args.mode.upper()} mode.")

    if args.mode == "text":
        run_text_mode()
    elif args.mode == "voice":
        run_voice_mode()
    else:
        run_web_mode()
