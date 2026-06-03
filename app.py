"""
BuddyBot — JARVIS-Style AI Desktop Assistant
Root Wrapper Script

This script acts as a wrapper to easily run the BuddyBot assistant
from the root directory using the standard 'python app.py' command.
It forwards all arguments and executes the actual entrypoint at 'buddybot/main.py'.
"""

import sys
import os
import subprocess

def main():
    # Find the absolute path to buddybot/main.py relative to this script
    root_dir = os.path.dirname(os.path.abspath(__file__))
    main_py = os.path.join(root_dir, "buddybot", "main.py")
    
    if not os.path.exists(main_py):
        print(f"Error: BuddyBot entrypoint script not found at: {main_py}", file=sys.stderr)
        print("Please ensure the 'buddybot' directory exists and contains 'main.py'.", file=sys.stderr)
        sys.exit(1)
        
    # Construct the command to run buddybot/main.py using the current Python interpreter
    cmd = [sys.executable, main_py] + sys.argv[1:]
    
    try:
        # Run the command and pass-through stdin, stdout, stderr.
        # Run in the root directory to preserve logs and paths in the workspace root.
        result = subprocess.run(cmd, cwd=root_dir)
        sys.exit(result.returncode)
    except KeyboardInterrupt:
        # Gracefully handle manual termination (Ctrl+C)
        print("\n[BuddyBot] Wrapper script terminated by user.")
        sys.exit(0)
    except Exception as e:
        print(f"Error executing BuddyBot: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
