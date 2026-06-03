"""
BuddyBot System Commands Module
Handles all OS-level operations on Windows
"""

import os
import subprocess
import webbrowser
import time
import logging
import datetime
import platform
import shutil

logger = logging.getLogger("BuddyBot.Commands")

# ─── Optional imports (graceful fallback) ──────────────────────────────────────
try:
    import pyautogui
    PYAUTOGUI_AVAILABLE = True
except ImportError:
    PYAUTOGUI_AVAILABLE = False
    logger.warning("pyautogui not available — some features limited.")

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    logger.warning("psutil not available — system stats limited.")

try:
    import screen_brightness_control as sbc
    SBC_AVAILABLE = True
except ImportError:
    SBC_AVAILABLE = False
    logger.warning("screen_brightness_control not available.")

try:
    from ctypes import cast, POINTER
    from comtypes import CLSCTX_ALL
    from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
    PYCAW_AVAILABLE = True
except ImportError:
    PYCAW_AVAILABLE = False
    logger.warning("pycaw not available — volume control limited.")

try:
    import pygetwindow as gw
    PYGETWINDOW_AVAILABLE = True
except ImportError:
    PYGETWINDOW_AVAILABLE = False


def focus_window_by_name(title_part: str, timeout: float = 6.0) -> bool:
    """Focus a window containing title_part case-insensitively, waiting up to timeout seconds."""
    if not PYGETWINDOW_AVAILABLE:
        return False
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            for w in gw.getAllWindows():
                if w.title and title_part.lower() in w.title.lower():
                    logger.info(f"Activating window: '{w.title}'")
                    if w.isMinimized:
                        w.restore()
                    w.activate()
                    return True
        except Exception as e:
            logger.warning(f"Error focusing window '{title_part}': {e}")
        time.sleep(0.5)
    return False


# ─── Volume Control ────────────────────────────────────────────────────────────
def _get_volume_interface():
    """Get Windows audio endpoint interface."""
    if not PYCAW_AVAILABLE:
        return None
    try:
        devices = AudioUtilities.GetSpeakers()
        interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
        return cast(interface, POINTER(IAudioEndpointVolume))
    except Exception as e:
        logger.error(f"Could not get audio interface: {e}")
        return None


def get_volume() -> int:
    """Get current system volume (0–100)."""
    volume = _get_volume_interface()
    if volume:
        try:
            level = volume.GetMasterVolumeLevelScalar()
            return int(level * 100)
        except Exception as e:
            logger.error(f"get_volume error: {e}")
    return -1


def set_volume(level: int) -> str:
    """Set system volume to 0–100."""
    level = max(0, min(100, level))
    volume = _get_volume_interface()
    if volume:
        try:
            volume.SetMasterVolumeLevelScalar(level / 100, None)
            return f"Volume set to {level}%."
        except Exception as e:
            logger.error(f"set_volume error: {e}")
            return f"Could not set volume: {e}"
    elif PYAUTOGUI_AVAILABLE:
        # Fallback: use keyboard shortcuts
        pyautogui.press("volumemute")
        return "Volume adjusted via keyboard shortcut."
    return "Volume control not available."


def volume_up(step: int = 10) -> str:
    """Increase volume by step."""
    current = get_volume()
    if current >= 0:
        return set_volume(current + step)
    elif PYAUTOGUI_AVAILABLE:
        for _ in range(step // 2):
            pyautogui.press("volumeup")
        return f"Volume increased."
    return "Volume control not available."


def volume_down(step: int = 10) -> str:
    """Decrease volume by step."""
    current = get_volume()
    if current >= 0:
        return set_volume(current - step)
    elif PYAUTOGUI_AVAILABLE:
        for _ in range(step // 2):
            pyautogui.press("volumedown")
        return f"Volume decreased."
    return "Volume control not available."


def mute_volume() -> str:
    """Toggle mute."""
    volume = _get_volume_interface()
    if volume:
        try:
            current_mute = volume.GetMute()
            volume.SetMute(not current_mute, None)
            return "Muted." if not current_mute else "Unmuted."
        except Exception as e:
            logger.error(f"mute error: {e}")
    elif PYAUTOGUI_AVAILABLE:
        pyautogui.press("volumemute")
        return "Volume toggled."
    return "Mute control not available."


# ─── Brightness Control ────────────────────────────────────────────────────────
def get_brightness() -> int:
    """Get current screen brightness (0–100)."""
    if SBC_AVAILABLE:
        try:
            return sbc.get_brightness(display=0)[0]
        except Exception as e:
            logger.error(f"get_brightness error: {e}")
    return -1


def set_brightness(level: int) -> str:
    """Set screen brightness (10–100)."""
    level = max(10, min(100, level))
    if SBC_AVAILABLE:
        try:
            sbc.set_brightness(level, display=0)
            return f"Brightness set to {level}%."
        except Exception as e:
            logger.error(f"set_brightness error: {e}")
            return f"Could not set brightness: {e}"
    return "Brightness control not available (screen_brightness_control not installed)."


def brightness_up(step: int = 15) -> str:
    """Increase brightness."""
    current = get_brightness()
    if current >= 0:
        return set_brightness(current + step)
    return "Brightness control not available."


def brightness_down(step: int = 15) -> str:
    """Decrease brightness."""
    current = get_brightness()
    if current >= 0:
        return set_brightness(current - step)
    return "Brightness control not available."


# ─── Application Control ───────────────────────────────────────────────────────
def open_app(app_name: str) -> str:
    """Open an application by name with automatic cloud/web fallbacks."""
    import re as _re
    import shutil
    import winreg
    
    # Strip trailing compound phrases like "and write ...", "and type ...", "and send ..."
    clean_name = _re.sub(
        r"\s+and\s+(write|type|send|message|say|note|compose).*$",
        "", app_name, flags=_re.IGNORECASE
    ).strip()
    name = clean_name.lower()

    # Pre-defined Cloud/Web alternative players and office services
    web_fallbacks = {
        "whatsapp":   "https://web.whatsapp.com/",
        "word":       "https://docs.google.com/",
        "excel":      "https://sheets.google.com/",
        "powerpoint": "https://slides.google.com/",
        "vscode":     "https://vscode.dev/",
        "vs code":    "https://vscode.dev/",
        "visual studio code": "https://vscode.dev/",
        "spotify":    "https://open.spotify.com/",
        "discord":    "https://discord.com/app",
        "paint":      "https://jspaint.app/",
        "calculator": "https://www.google.com/search?q=calculator",
        "calc":       "https://www.google.com/search?q=calculator",
        "browser":    "https://www.google.com",
        "chrome":     "https://www.google.com",
    }

    # Special logic for WhatsApp
    if name in ("whatsapp", "whats app", "whatsapp desktop"):
        # 1. Try UWP Shell AUMID launch first (highly reliable for Microsoft Store version)
        try:
            packages_dir = os.path.expandvars(r"%USERPROFILE%\AppData\Local\Packages")
            if os.path.exists(packages_dir):
                for folder in os.listdir(packages_dir):
                    if "WhatsAppDesktop" in folder:
                        aumid = f"{folder}!App"
                        logger.info(f"Launching WhatsApp via AUMID: {aumid}")
                        subprocess.Popen(["explorer.exe", f"shell:AppsFolder\\{aumid}"], shell=False)
                        time.sleep(0.5)
                        return "Opening WhatsApp Desktop."
        except Exception as e:
            logger.warning(f"Native WhatsApp launch via AUMID failed: {e}. Trying URI scheme...")

        # 2. Try URI scheme (alternative Windows 10/11 native Store method)
        try:
            os.startfile("whatsapp:")
            time.sleep(0.5)
            return "Opening WhatsApp Desktop."
        except Exception as e:
            logger.warning(f"Native WhatsApp launch via URI failed: {e}. Trying executable paths...")
            
        # 3. Try path resolution via common location or shutil
        for path in [
            os.path.expandvars(r"%USERPROFILE%\AppData\Local\WhatsApp\WhatsApp.exe"),
            os.path.expandvars(r"%LOCALAPPDATA%\WhatsApp\WhatsApp.exe"),
        ]:
            if os.path.exists(path):
                try:
                    subprocess.Popen([path], shell=False)
                    time.sleep(0.5)
                    return "Opening WhatsApp Desktop."
                except Exception:
                    pass
                    
        # 4. Fallback to web version
        try:
            webbrowser.open("https://web.whatsapp.com/")
            return "Opening WhatsApp Web in your browser."
        except Exception as web_err:
            return f"Failed to open WhatsApp: {web_err}"

    app_map = {
        # ── Browsers ──────────────────────────────────────────────────────────
        "chrome":               "chrome.exe",
        "google chrome":        "chrome.exe",
        "browser":              "chrome.exe",
        "edge":                 "msedge.exe",
        "microsoft edge":       "msedge.exe",
        "firefox":              "firefox.exe",
        "mozilla firefox":      "firefox.exe",
        "opera":                "opera.exe",
        "brave":                "brave.exe",
        "vivaldi":              "vivaldi.exe",

        # ── Text Editors & IDEs ───────────────────────────────────────────────
        "notepad":              "notepad.exe",
        "vscode":               "code.cmd",  # on windows, code is code.cmd or code.exe
        "vs code":              "code.cmd",
        "visual studio code":   "code.cmd",
        "visual studio":        "devenv.exe",
        "sublime":              "sublime_text.exe",
        "sublime text":         "sublime_text.exe",
        "atom":                 "atom.exe",
        "notepad++":            "notepad++.exe",
        "npp":                  "notepad++.exe",
        "wordpad":              "write.exe",
        "intellij":             "idea64.exe",
        "pycharm":              "pycharm64.exe",
        "android studio":       "studio64.exe",

        # ── System Tools ──────────────────────────────────────────────────────
        "calculator":           "calc.exe",
        "calc":                 "calc.exe",
        "explorer":             "explorer.exe",
        "file manager":         "explorer.exe",
        "file explorer":        "explorer.exe",
        "my computer":          "explorer.exe",
        "cmd":                  "cmd.exe",
        "command prompt":       "cmd.exe",
        "terminal":             "cmd.exe",
        "powershell":           "powershell.exe",
        "task manager":         "taskmgr.exe",
        "settings":             "ms-settings:",
        "windows settings":     "ms-settings:",
        "control panel":        "control.exe",
        "registry editor":      "regedit.exe",
        "registry":             "regedit.exe",
        "disk management":      "diskmgmt.msc",
        "device manager":       "devmgmt.msc",
        "services":             "services.msc",
        "event viewer":         "eventvwr.msc",
        "snipping tool":        "SnippingTool.exe",
        "snip":                 "SnippingTool.exe",
        "screen snip":          "SnippingTool.exe",
        "sticky notes":         "stikynot.exe",
        "sticky note":          "stikynot.exe",
        "character map":        "charmap.exe",
        "on screen keyboard":   "osk.exe",
        "osk":                  "osk.exe",
        "magnifier":            "magnify.exe",
        "narrator":             "narrator.exe",
        "paint":                "mspaint.exe",
        "ms paint":             "mspaint.exe",
        "paint 3d":             "ms-paint:",
        "3d paint":             "ms-paint:",
        "clock":                "ms-clock:",
        "alarms":               "ms-clock:",
        "weather":              "msnweather:",
        "xbox":                 "xbox:",
        "xbox game bar":        "ms-gamebar:",

        # ── Microsoft Office ──────────────────────────────────────────────────
        "word":                 "winword.exe",
        "microsoft word":       "winword.exe",
        "excel":                "excel.exe",
        "microsoft excel":      "excel.exe",
        "powerpoint":           "powerpnt.exe",
        "microsoft powerpoint": "powerpnt.exe",
        "outlook":              "outlook.exe",
        "microsoft outlook":    "outlook.exe",
        "onenote":              "onenote.exe",
        "one note":             "onenote.exe",
        "access":               "msaccess.exe",
        "microsoft access":     "msaccess.exe",
        "publisher":            "mspub.exe",
        "teams":                "ms-teams:",
        "microsoft teams":      "ms-teams:",

        # ── Communication & Social ────────────────────────────────────────────
        "discord":              "discord.exe",
        "slack":                "slack.exe",
        "skype":                "skype.exe",
        "telegram":             "telegram.exe",
        "signal":               "signal.exe",
        "zoom":                 "zoom.exe",

        # ── Media & Entertainment ─────────────────────────────────────────────
        "vlc":                  "vlc.exe",
        "vlc media player":     "vlc.exe",
        "media player":         "wmplayer.exe",
        "windows media player": "wmplayer.exe",
        "groove music":         "mswindowsmusic:",
        "groove":               "mswindowsmusic:",
        "movies":               "mswindowsvideo:",
        "films":                "mswindowsvideo:",
        "spotify":              "spotify.exe",
        "itunes":               "itunes.exe",
        "winamp":               "winamp.exe",
        "potplayer":            "potplayer.exe",
        "kodi":                 "kodi.exe",
        "obs":                  "obs64.exe",
        "obs studio":           "obs64.exe",

        # ── Gaming ────────────────────────────────────────────────────────────
        "steam":                "steam.exe",
        "epic games":           "EpicGamesLauncher.exe",
        "epic":                 "EpicGamesLauncher.exe",
        "origin":               "origin.exe",
        "ea app":               "EADesktop.exe",
        "gog galaxy":           "GalaxyClient.exe",
        "battlenet":            "Battle.net.exe",
        "battle.net":           "Battle.net.exe",
        "ubisoft":              "upc.exe",
        "uplay":                "upc.exe",
        "minecraft":            "minecraft.exe",
        "roblox":               "roblox.exe",

        # ── Creative & Design ─────────────────────────────────────────────────
        "photoshop":            "photoshop.exe",
        "adobe photoshop":      "photoshop.exe",
        "illustrator":          "illustrator.exe",
        "premiere":             "premiere.exe",
        "adobe premiere":       "premiere.exe",
        "after effects":        "afterfx.exe",
        "lightroom":            "lightroom.exe",
        "audacity":             "audacity.exe",
        "davinci":              "DaVinci Resolve.exe",
        "blender":              "blender.exe",
        "gimp":                 "gimp.exe",
        "inkscape":             "inkscape.exe",
        "figma":                "figma.exe",
        "canva":                "canva.exe",
        "clip studio":          "CLIPStudioPaint.exe",

        # ── Development & Tools ───────────────────────────────────────────────
        "git bash":             "git-bash.exe",
        "postman":              "postman.exe",
        "docker":               "docker desktop.exe",
        "virtualbox":           "virtualbox.exe",
        "vmware":               "vmware.exe",
        "putty":                "putty.exe",
        "winscp":               "winscp.exe",
        "filezilla":            "filezilla.exe",
        "wireshark":            "wireshark.exe",

        # ── Utilities ─────────────────────────────────────────────────────────
        "7zip":                 "7zFM.exe",
        "7-zip":                "7zFM.exe",
        "winrar":               "winrar.exe",
        "winzip":               "winzip64.exe",
        "ccleaner":             "ccleaner.exe",
        "malwarebytes":         "malwarebytes.exe",
        "avast":                "avast.exe",
        "avg":                  "avg.exe",
        "nordvpn":              "nordvpn.exe",
        "expressvpn":           "expressvpn.exe",
        "anydesk":              "anydesk.exe",
        "teamviewer":           "teamviewer.exe",
        "rufus":                "rufus.exe",
        "etcher":               "balenaEtcher.exe",
        "cpu z":                "cpuz.exe",
        "gpu z":                "gpuz.exe",
        "hwinfo":               "hwinfo64.exe",
        "hwmonitor":            "hwmonitor.exe",
        "speccy":               "speccy.exe",
        "crystaldiskinfo":      "DiskInfo64.exe",
        "process explorer":     "procexp.exe",
        "process hacker":       "ProcessHacker.exe",

        # ── Cloud & Sync ──────────────────────────────────────────────────────
        "onedrive":             "onedrive.exe",
        "one drive":            "onedrive.exe",
        "dropbox":              "dropbox.exe",
        "google drive":         "googledrivesync.exe",
        "mega":                 "MEGAsync.exe",
    }

    cmd = app_map.get(name)
    if not cmd:
        # Standardize executable names
        cmd = clean_name if "." in clean_name else f"{clean_name}.exe"

    # Define a helper to query Windows registry App Paths
    def get_registry_app_path(exe_name: str) -> str:
        if not exe_name.lower().endswith(".exe") and not exe_name.lower().endswith(".cmd") and ":" not in exe_name:
            exe_name += ".exe"
        for hkey in (winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER):
            try:
                with winreg.OpenKey(hkey, f"SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\{exe_name}") as key:
                    path = winreg.QueryValue(key, None)
                    if path:
                        path = path.strip('"')
                        if os.path.exists(path):
                            return path
            except Exception:
                pass
        return None

    try:
        # Protocol or URI scheme
        if ":" in cmd and not cmd.startswith("/"):
            os.startfile(cmd)
            return f"Opening {clean_name}."

        # Regular executables
        # Check system PATH first
        resolved = shutil.which(cmd)
        if not resolved and not cmd.endswith(".exe"):
            resolved = shutil.which(f"{cmd}.exe")
            
        # Check registry App Paths
        if not resolved:
            resolved = get_registry_app_path(cmd)

        if resolved:
            subprocess.Popen([resolved], shell=False)
            return f"Opening {clean_name}."
        else:
            # Try to launch directly via os.startfile so that Windows can resolve it if possible
            try:
                os.startfile(cmd)
                return f"Opening {clean_name}."
            except Exception:
                raise FileNotFoundError(f"Application '{clean_name}' not found on the system.")

    except Exception as e:
        logger.warning(f"Native launch failed for '{clean_name}': {e}. Attempting web fallback...")
        
        # Look for a web fallback url matching app name
        fallback_url = web_fallbacks.get(name)
        if not fallback_url:
            for key, url in web_fallbacks.items():
                if key in name:
                    fallback_url = url
                    break
        
        if fallback_url:
            try:
                webbrowser.open(fallback_url)
                return f"Desktop application '{clean_name}' not found. Opening the cloud version in your browser!"
            except Exception as web_err:
                return f"Failed to launch native application '{clean_name}' or its web alternative: {web_err}"
        
        return f"Failed to open '{clean_name}' (app not found and no web fallback configured): {e}"


def close_app(app_name: str) -> str:
    """Close an application by process name."""
    process_map = {
        "chrome":    "chrome.exe",
        "notepad":   "notepad.exe",
        "calculator":"Calculator.exe",
        "vscode":    "Code.exe",
        "paint":     "mspaint.exe",
    }

    name = app_name.lower().strip()
    proc = process_map.get(name, f"{app_name}.exe")

    if PSUTIL_AVAILABLE:
        killed = 0
        for p in psutil.process_iter(["name"]):
            if p.info["name"] and p.info["name"].lower() == proc.lower():
                try:
                    p.terminate()
                    killed += 1
                except Exception:
                    pass
        if killed:
            return f"Closed {killed} instance(s) of {app_name}."
        return f"{app_name} is not currently running."
    else:
        try:
            subprocess.run(["taskkill", "/F", "/IM", proc], capture_output=True)
            return f"Sent close signal to {app_name}."
        except Exception as e:
            return f"Failed to close {app_name}: {e}"


# ─── System Actions ────────────────────────────────────────────────────────────
def shutdown(delay: int = 5) -> str:
    """Initiate system shutdown."""
    try:
        subprocess.run(["shutdown", "/s", "/t", str(delay)], check=True)
        return f"System will shut down in {delay} seconds. Use 'shutdown /a' to cancel."
    except Exception as e:
        logger.error(f"Shutdown error: {e}")
        return f"Shutdown failed: {e}"


def restart(delay: int = 5) -> str:
    """Initiate system restart."""
    try:
        subprocess.run(["shutdown", "/r", "/t", str(delay)], check=True)
        return f"System will restart in {delay} seconds. Use 'shutdown /a' to cancel."
    except Exception as e:
        return f"Restart failed: {e}"


def sleep_system() -> str:
    """Put system to sleep."""
    try:
        subprocess.run(["rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0"])
        return "System going to sleep."
    except Exception as e:
        return f"Sleep failed: {e}"


def lock_screen() -> str:
    """Lock the Windows screen."""
    try:
        if PYAUTOGUI_AVAILABLE:
            pyautogui.hotkey("win", "l")
        else:
            subprocess.run(["rundll32.exe", "user32.dll,LockWorkStation"])
        return "Screen locked."
    except Exception as e:
        return f"Lock screen failed: {e}"


def cancel_shutdown() -> str:
    """Cancel a pending shutdown."""
    try:
        subprocess.run(["shutdown", "/a"])
        return "Shutdown/restart cancelled."
    except Exception as e:
        return f"Cancel failed: {e}"


# ─── Screenshot ────────────────────────────────────────────────────────────────
def take_screenshot(save_dir: str = None) -> str:
    """Take a screenshot and save to desktop."""
    if not PYAUTOGUI_AVAILABLE:
        return "Screenshot requires pyautogui. Run: pip install pyautogui"

    if save_dir is None:
        save_dir = os.path.join(os.path.expanduser("~"), "Desktop")

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename  = f"BuddyBot_Screenshot_{timestamp}.png"
    filepath  = os.path.join(save_dir, filename)

    try:
        screenshot = pyautogui.screenshot()
        screenshot.save(filepath)
        return f"Screenshot saved to: {filepath}"
    except Exception as e:
        logger.error(f"Screenshot error: {e}")
        return f"Screenshot failed: {e}"


# ─── Web & Utilities ───────────────────────────────────────────────────────────
def open_website(url: str) -> str:
    """Open a URL in the default browser."""
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    webbrowser.open(url)
    return f"Opening {url} in your browser."


def search_google(query: str) -> str:
    """Search Google for a query."""
    url = f"https://www.google.com/search?q={query.replace(' ', '+')}"
    webbrowser.open(url)
    return f"Searching Google for: {query}"


def open_folder(path: str = None) -> str:
    """Open a folder in File Explorer."""
    if path is None:
        path = os.path.expanduser("~")
    try:
        os.startfile(path)
        return f"Opened folder: {path}"
    except Exception as e:
        return f"Could not open folder: {e}"


# ─── System Information ────────────────────────────────────────────────────────
def get_time() -> str:
    return datetime.datetime.now().strftime("%I:%M:%S %p")


def get_date() -> str:
    return datetime.datetime.now().strftime("%A, %B %d, %Y")


def get_system_info() -> dict:
    """Return system stats as a dictionary."""
    info = {
        "os": platform.system() + " " + platform.release(),
        "hostname": platform.node(),
        "time": get_time(),
        "date": get_date(),
        "volume": get_volume(),
        "brightness": get_brightness(),
    }

    if PSUTIL_AVAILABLE:
        try:
            info["cpu_percent"] = psutil.cpu_percent(interval=0.5)
            mem = psutil.virtual_memory()
            info["memory_percent"] = mem.percent
            info["memory_used_gb"] = round(mem.used / (1024 ** 3), 1)
            info["memory_total_gb"] = round(mem.total / (1024 ** 3), 1)
            boot_time = datetime.datetime.fromtimestamp(psutil.boot_time())
            uptime = datetime.datetime.now() - boot_time
            info["uptime"] = str(uptime).split(".")[0]
            info["process_count"] = len(psutil.pids())

            # Battery
            battery = psutil.sensors_battery()
            if battery:
                info["battery_percent"] = round(battery.percent)
                info["battery_plugged"] = battery.power_plugged
        except Exception as e:
            logger.error(f"psutil stats error: {e}")

    return info


def get_battery() -> str:
    """Get battery status."""
    if PSUTIL_AVAILABLE:
        try:
            battery = psutil.sensors_battery()
            if battery:
                status = "charging" if battery.power_plugged else "discharging"
                return f"Battery is at {battery.percent:.0f}% and {status}."
            return "No battery detected (desktop system)."
        except Exception as e:
            return f"Battery check failed: {e}"
    return "Battery info requires psutil."


def list_running_apps() -> str:
    """List currently running applications."""
    if not PSUTIL_AVAILABLE:
        return "Process listing requires psutil."
    try:
        apps = set()
        for p in psutil.process_iter(["name"]):
            name = p.info.get("name", "")
            if name and name.endswith(".exe"):
                apps.add(name)
        sorted_apps = sorted(apps)[:20]
        return "Running: " + ", ".join(sorted_apps)
    except Exception as e:
        return f"Could not list processes: {e}"


# ─── File Operations ───────────────────────────────────────────────────────────
def create_file(filename: str, content: str = "") -> str:
    """Create a file with optional content."""
    try:
        path = os.path.join(os.path.expanduser("~"), "Desktop", filename)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return f"File created: {path}"
    except Exception as e:
        return f"Could not create file: {e}"


def read_file(filepath: str) -> str:
    """Read and return file contents."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return f"File not found: {filepath}"
    except Exception as e:
        return f"Could not read file: {e}"


# ─── Keyboard & Input Automation ───────────────────────────────────────────────
def type_text(text: str, delay: float = 1.5) -> str:
    """
    Simulate keyboard typing for a message or text block.
    Uses clipboard paste method for reliability with all characters (Unicode safe).
    Falls back to pyautogui.write() if pyperclip is unavailable.
    """
    if not PYAUTOGUI_AVAILABLE:
        return "Keyboard simulation not available (pyautogui is not installed)."
    try:
        # Wait for app to focus before typing
        time.sleep(delay)

        # Try clipboard-paste approach first (works with ALL characters)
        try:
            import pyperclip
            pyperclip.copy(text)
            pyautogui.hotkey("ctrl", "v")
            logger.info(f"Typed via clipboard paste: '{text}'")
        except ImportError:
            # Fallback: direct key-by-key (may miss non-ASCII chars)
            pyautogui.write(text, interval=0.03)
            logger.info(f"Typed via pyautogui.write: '{text}'")

        return f"Typed: '{text}'"
    except Exception as e:
        logger.error(f"type_text error: {e}")
        return f"Failed to type text: {e}"


def press_key(key: str) -> str:
    """Simulate pressing a specific single key."""
    if not PYAUTOGUI_AVAILABLE:
        return "Keyboard simulation not available (pyautogui is not installed)."
    try:
        key_lower = key.lower().strip()
        pyautogui.press(key_lower)
        return f"Pressed key: '{key_lower}'"
    except Exception as e:
        logger.error(f"press_key error: {e}")
        return f"Failed to press key: {e}"


def hotkey(keys_str: str) -> str:
    """Simulate a keyboard shortcut combination (e.g. 'ctrl+c', 'win+d')."""
    if not PYAUTOGUI_AVAILABLE:
        return "Keyboard simulation not available (pyautogui is not installed)."
    try:
        # Split by '+' or ' ' or '-' to support multiple keys
        import re
        keys = [k.strip().lower() for k in re.split(r'[\+\-\s]', keys_str) if k.strip()]
        pyautogui.hotkey(*keys)
        return f"Executed shortcut: {' + '.join(keys)}"
    except Exception as e:
        logger.error(f"hotkey error: {e}")
        return f"Failed to execute shortcut: {e}"


# ─── Social & Communications Automation ───────────────────────────────────────
def send_whatsapp(contact: str, message: str) -> str:
    """
    Automate sending a WhatsApp message.
    - Phone number → uses WhatsApp Web pre-fill URL (instant & reliable)
    - Contact name → opens WhatsApp Desktop, searches contact, types & sends message
    """
    if not PYAUTOGUI_AVAILABLE:
        return "Automation not available (pyautogui is not installed)."
    
    try:
        import urllib.parse
        import re as _re
        
        # Determine if contact is a phone number
        clean_contact = _re.sub(r"\D", "", contact)
        
        if clean_contact.isdigit() and len(clean_contact) >= 10:
            # Phone number path: use WhatsApp Web deep link with pre-filled text
            url = f"https://web.whatsapp.com/send?phone={clean_contact}&text={urllib.parse.quote(message)}"
            webbrowser.open(url)
            return (
                f"Opened WhatsApp Web with +{clean_contact}. "
                f"Message pre-filled: '{message}'. Press Enter in the browser to send."
            )
        else:
            # Contact name path: automate WhatsApp Desktop app
            # Step 1 — Open WhatsApp and focus it actively
            open_app("whatsapp")
            focused = focus_window_by_name("whatsapp", timeout=6.0)
            if not focused:
                logger.warning("Could not actively focus WhatsApp window.")
            time.sleep(1.5)  # Let the window settle

            # Step 2 — Click/focus the search bar using Ctrl+F and clear any existing query
            pyautogui.hotkey("ctrl", "f")
            time.sleep(0.5)
            pyautogui.hotkey("ctrl", "a")
            time.sleep(0.2)
            pyautogui.press("backspace")
            time.sleep(0.3)

            # Step 3 — Type contact name using clipboard for reliability
            try:
                import pyperclip
                pyperclip.copy(contact)
                pyautogui.hotkey("ctrl", "v")
            except ImportError:
                pyautogui.write(contact, interval=0.05)
            time.sleep(2.0)  # Wait for search results to populate

            # Step 4 — Press Enter to open the first matching chat
            pyautogui.press("enter")
            time.sleep(2.0)  # Wait for chat to open and natively focus the message input field

            # Step 5 — Type the message using clipboard paste (no 'tab' needed as cursor is focused by default)
            try:
                import pyperclip
                pyperclip.copy(message)
                pyautogui.hotkey("ctrl", "v")
            except ImportError:
                pyautogui.write(message, interval=0.05)
            time.sleep(0.8)

            # Step 6 — Send the message
            pyautogui.press("enter")

            return f"WhatsApp message sent to '{contact}': '{message}'"
            
    except Exception as e:
        logger.error(f"send_whatsapp error: {e}")
        return f"Failed to automate WhatsApp: {e}"


def send_email(recipient: str, subject: str, body: str) -> str:
    """Automate opening default system email app with pre-filled details."""
    import urllib.parse
    import webbrowser
    try:
        subject_enc = urllib.parse.quote(subject)
        body_enc = urllib.parse.quote(body)
        url = f"mailto:{recipient}?subject={subject_enc}&body={body_enc}"
        webbrowser.open(url)
        return f"Opened default email client with email addressed to '{recipient}'."
    except Exception as e:
        logger.error(f"send_email error: {e}")
        return f"Failed to open email client: {e}"
