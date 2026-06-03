import { useState, useEffect, useRef, useCallback } from "react";
import HexGrid from "./components/HexGrid";
import ParticleField from "./components/ParticleField";
import Sidebar from "./components/Sidebar";
import ChatInterface from "./components/ChatInterface";
import StatusBar from "./components/StatusBar";
import VoiceOrb from "./components/VoiceOrb";
import CommandPanel from "./components/CommandPanel";
import WakeScreen from "./components/WakeScreen";
import MobileBar from "./components/MobileBar";
import { AssistantState, Message, SystemStats } from "./types";
import { processCommand, generateResponse } from "./brain/assistant";
import { getSystemStats } from "./brain/systemStats";

const API_BASE_URL = window.location.port === "5173" ? "http://127.0.0.1:5000" : "";

export default function App() {
  const [booted, setBooted] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [state, setState] = useState<AssistantState>("idle");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      text: "BuddyBot systems online. All neural pathways initialized. Say \"Hey Buddy\" or type a command to begin.",
      timestamp: new Date(),
      type: "system",
    },
  ]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [stats, setStats] = useState<SystemStats>({
    cpuUsage: 0,
    memUsage: 0,
    uptime: "00:00:00",
    processes: 0,
    batteryLevel: 87,
    networkStatus: "Connected",
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [volume, setVolume] = useState(70);
  const [brightness, setBrightness] = useState(80);
  const [confirmation, setConfirmation] = useState<{
    action: string;
    label: string;
    resolve: (v: boolean) => void;
  } | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const statsInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Volume & Brightness OS adjustment helpers
  const handleVolumeChange = async (val: number) => {
    setVolume(val);
    if (isBackendConnected) {
      try {
        await fetch(`${API_BASE_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: `set volume ${val}` }),
        });
      } catch (e) {
        console.error("Volume adjustment API failed:", e);
      }
    }
  };

  const handleBrightnessChange = async (val: number) => {
    setBrightness(val);
    if (isBackendConnected) {
      try {
        await fetch(`${API_BASE_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: `set brightness ${val}` }),
        });
      } catch (e) {
        console.error("Brightness adjustment API failed:", e);
      }
    }
  };

  // Boot sequence
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/system-info`);
        if (res.ok) {
          setIsBackendConnected(true);
          console.log("BuddyBot Python Backend Connected!");
        }
      } catch (err) {
        console.log("Running in standalone demo mode (Python backend offline)");
      }
    };
    checkBackend();

    const t = setTimeout(() => setBooted(true), 3200);
    synthRef.current = window.speechSynthesis;
    return () => clearTimeout(t);
  }, []);

  // Live system stats
  useEffect(() => {
    if (!booted) return;

    const update = async () => {
      if (isBackendConnected) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/system-info`);
          const data = await res.json();

          setStats({
            cpuUsage: data.cpu_percent !== undefined ? Math.round(data.cpu_percent) : 0,
            memUsage: data.memory_percent !== undefined ? Math.round(data.memory_percent) : 0,
            uptime: data.uptime || "00:00:00",
            processes: data.process_count || 0,
            batteryLevel: data.battery_percent !== undefined ? data.battery_percent : 100,
            networkStatus: data.battery_plugged ? "Charging" : "Nominal",
          });

          // Sync volume and brightness from OS!
          if (data.volume !== undefined && data.volume >= 0) {
            setVolume(data.volume);
          }
          if (data.brightness !== undefined && data.brightness >= 0) {
            setBrightness(data.brightness);
          }
        } catch (err) {
          console.error("Backend stats error, falling back to simulation:", err);
          setStats(getSystemStats());
        }
      } else {
        setStats(getSystemStats());
      }
    };

    update();
    statsInterval.current = setInterval(update, 3000);
    return () => {
      if (statsInterval.current) clearInterval(statsInterval.current);
    };
  }, [booted, isBackendConnected]);

  // Speech synthesis
  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(
      (v) =>
        v.name.includes("Google UK English Male") ||
        v.name.includes("Microsoft David") ||
        v.name.includes("Microsoft Mark") ||
        v.lang === "en-GB"
    );
    if (preferred) utterance.voice = preferred;
    utterance.rate = 0.95;
    utterance.pitch = 0.9;
    utterance.volume = 1;
    setState("speaking");
    utterance.onend = () => setState("idle");
    synthRef.current.speak(utterance);
  }, [voiceEnabled]);

  // Speech recognition setup
  const startListening = useCallback(() => {
    const SRConstructor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SRConstructor) {
      addMessage("assistant", "Speech recognition is not supported in this browser. Please use Google Chrome.", "error");
      return;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    const recognition = new SRConstructor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onstart = () => {
      setIsListening(true);
      setState("listening");
    };
    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join("");
      if (e.results[e.results.length - 1].isFinal) {
        setIsListening(false);
        handleUserInput(transcript);
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
      setState("idle");
    };
    recognition.onend = () => {
      setIsListening(false);
      if (state !== "speaking") setState("idle");
    };
    recognitionRef.current = recognition;
    recognition.start();
  }, [state]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setState("idle");
  }, []);

  const addMessage = useCallback(
    (
      role: "user" | "assistant",
      text: string,
      type: Message["type"] = "text"
    ) => {
      const msg: Message = {
        id: `${Date.now()}-${Math.random()}`,
        role,
        text,
        timestamp: new Date(),
        type,
      };
      setMessages((prev) => [...prev, msg]);
      return msg;
    },
    []
  );

  const askConfirmation = useCallback(
    (action: string, label: string): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfirmation({ action, label, resolve });
      });
    },
    []
  );

  const handleUserInput = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      // Special: clear chat
      if (/^(clear|reset|wipe)/i.test(text)) {
        setMessages([{
          id: `clear-${Date.now()}`,
          role: "assistant",
          text: "Chat history cleared. All systems reset.",
          timestamp: new Date(),
          type: "system",
        }]);
        speak("Chat cleared.");
        return;
      }

      addMessage("user", text);
      setCommandHistory((prev) => [text, ...prev.slice(0, 49)]);
      setHistoryIndex(-1);
      setState("thinking");

      try {
        if (isBackendConnected) {
          const res = await fetch(`${API_BASE_URL}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text, voice: voiceEnabled }),
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error);

          if (data.requires_confirmation) {
            setState("idle");
            const confirmed = await askConfirmation(
              data.action,
              data.response
            );
            if (confirmed) {
              setState("thinking");
              const confirmRes = await fetch(`${API_BASE_URL}/api/confirm`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: data.action, confirmed: true, voice: voiceEnabled }),
              });
              const confirmData = await confirmRes.json();
              setState("idle");
              addMessage("assistant", confirmData.response, "success");
              speak(confirmData.response);
            } else {
              await fetch(`${API_BASE_URL}/api/confirm`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: data.action, confirmed: false }),
              });
              setState("idle");
              addMessage("assistant", "Action cancelled.", "system");
              speak("Action cancelled.");
            }
            return;
          }

          setState("idle");
          const msgType = data.action ? "command" : "text";
          addMessage("assistant", data.response, msgType);
          speak(data.response);
        } else {
          const result = await processCommand(text, {
            volume,
            brightness,
            setVolume,
            setBrightness,
            askConfirmation,
          });

          if (result.requiresConfirmation && !result.confirmed) {
            setState("idle");
            return;
          }

          // Handle CLEAR_CHAT response
          if (result.response === "CLEAR_CHAT") {
            setMessages([{
              id: `clear-${Date.now()}`,
              role: "assistant",
              text: "Chat history cleared. Ready for new commands.",
              timestamp: new Date(),
              type: "system",
            }]);
            setState("idle");
            speak("Chat cleared.");
            return;
          }

          const response = result.response || (await generateResponse(text));
          setState("idle");
          addMessage("assistant", response, result.type || "text");
          speak(response);
        }
      } catch (err) {
        setState("idle");
        const errMsg = "I encountered an error processing that request. Please try again.";
        addMessage("assistant", errMsg, "error");
        speak(errMsg);
      }
    },
    [volume, brightness, addMessage, speak, askConfirmation, isBackendConnected, voiceEnabled]
  );

  // Continuous wake word listening
  useEffect(() => {
    if (!voiceEnabled || !booted) return;
    const SRConstructor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SRConstructor) return;

    let wakeRecognition: any = null;
    let running = true;

    const startWake = () => {
      if (!running || isListening) return;
      try {
        wakeRecognition = new SRConstructor();
        wakeRecognition.continuous = true;
        wakeRecognition.interimResults = true;
        wakeRecognition.lang = "en-US";

        wakeRecognition.onresult = (e: any) => {
          if (!running || isListening) return;
          const lastResultIndex = e.resultIndex;
          const transcript = e.results[lastResultIndex][0].transcript.toLowerCase();
          
          if (
            transcript.includes("hey buddy") ||
            transcript.includes("buddy") ||
            transcript.includes("hey bot") ||
            transcript.includes("hi buddy") ||
            transcript.includes("hey jarvis")
          ) {
            // Stop wake word listening temporarily to avoid double triggers
            try {
              wakeRecognition.stop();
            } catch (_) { }
            
            addMessage("assistant", "Yes? I'm listening...", "system");
            speak("Yes, I'm listening.");
            setTimeout(() => startListening(), 500);
          }
        };

        wakeRecognition.onend = () => {
          if (running && !isListening) {
            setTimeout(startWake, 500);
          }
        };

        wakeRecognition.onerror = (err: any) => {
          console.log("Wake word recognition error:", err);
          if (err.error === "not-allowed") {
            console.log("Microphone access denied.");
            running = false;
          } else if (running && !isListening) {
            try {
              wakeRecognition.stop();
            } catch (_) { }
            setTimeout(startWake, 1500);
          }
        };

        wakeRecognition.start();
      } catch (err) {
        console.error("Failed to start wake recognition:", err);
      }
    };

    startWake();
    return () => {
      running = false;
      if (wakeRecognition) {
        try {
          wakeRecognition.stop();
        } catch (_) { }
      }
    };
  }, [voiceEnabled, booted, isListening, startListening, speak, addMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    handleUserInput(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
      setHistoryIndex(newIndex);
      setInput(commandHistory[newIndex] || "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIndex = Math.max(historyIndex - 1, -1);
      setHistoryIndex(newIndex);
      setInput(newIndex === -1 ? "" : commandHistory[newIndex]);
    }
  };

  if (!booted) return <WakeScreen />;

  return (
    <div className="relative min-h-screen bg-[#020b18] overflow-hidden font-rajdhani text-cyan-300 select-none">
      {/* Animated background layers */}
      <ParticleField />
      <HexGrid />

      {/* Scanline overlay */}
      <div className="pointer-events-none fixed inset-0 z-[1] scanlines" />

      {/* Vignette */}
      <div className="pointer-events-none fixed inset-0 z-[1] bg-radial-vignette" />

      {/* Main layout */}
      <div className="relative z-10 flex h-screen max-h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          commandHistory={commandHistory}
          stats={stats}
          volume={volume}
          brightness={brightness}
          onVolumeChange={handleVolumeChange}
          onBrightnessChange={handleBrightnessChange}
          onCommand={handleUserInput}
        />

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top status bar */}
          <StatusBar
            state={state}
            stats={stats}
            voiceEnabled={voiceEnabled}
            onToggleVoice={() => setVoiceEnabled((v) => !v)}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
          />

          {/* Content area */}
          <div className="flex flex-1 gap-4 overflow-hidden p-4">
            {/* Chat + Input */}
            <div className="flex flex-1 flex-col gap-4 min-w-0">
              <MobileBar onCommand={handleUserInput} />
              <ChatInterface
                messages={messages}
                state={state}
              />

              {/* Confirmation dialog */}
              {confirmation && (
                <div className="animate-fadeIn glass-panel border border-amber-500/50 rounded-xl p-4 flex items-center gap-4">
                  <span className="text-amber-400 font-orbitron text-sm flex-1">
                    ⚠ Confirm: <span className="text-white">{confirmation.label}</span>
                  </span>
                  <button
                    onClick={() => {
                      confirmation.resolve(true);
                      setConfirmation(null);
                    }}
                    className="px-4 py-1.5 bg-red-500/20 border border-red-500/60 text-red-400 rounded-lg hover:bg-red-500/40 transition-all font-orbitron text-xs"
                  >
                    CONFIRM
                  </button>
                  <button
                    onClick={() => {
                      confirmation.resolve(false);
                      setConfirmation(null);
                      addMessage("assistant", "Action cancelled.", "system");
                    }}
                    className="px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-all font-orbitron text-xs"
                  >
                    CANCEL
                  </button>
                </div>
              )}

              {/* Input bar */}
              <form
                onSubmit={handleSubmit}
                className="glass-panel border border-cyan-500/30 rounded-xl p-2 flex items-center gap-3"
              >
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse flex-shrink-0 ml-2" />
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    state === "listening"
                      ? "Listening..."
                      : state === "thinking"
                        ? "Processing..."
                        : state === "speaking"
                          ? "Speaking..."
                          : 'Type a command or "Hey Buddy"...'
                  }
                  disabled={state === "listening" || state === "thinking"}
                  className="flex-1 bg-transparent outline-none text-cyan-100 placeholder:text-cyan-600 font-share-tech text-sm"
                />
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={`relative flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${isListening
                      ? "bg-red-500/30 border border-red-400 text-red-400"
                      : "bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20"
                    }`}
                >
                  {isListening ? (
                    <span className="text-lg animate-pulse">⏹</span>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                    </svg>
                  )}
                  {isListening && (
                    <span className="absolute inset-0 rounded-lg border-2 border-red-400 animate-ping opacity-50" />
                  )}
                </button>
                <button
                  type="submit"
                  disabled={!input.trim() || state === "thinking"}
                  className="flex-shrink-0 px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 rounded-lg hover:bg-cyan-500/30 transition-all font-orbitron text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  SEND
                </button>
              </form>
            </div>

            {/* Right panel */}
            <div className="hidden xl:flex flex-col gap-4 w-72 flex-shrink-0">
              <VoiceOrb
                state={state}
                voiceEnabled={voiceEnabled}
                isListening={isListening}
                onToggleVoice={() => setVoiceEnabled((v) => !v)}
                onStartListening={startListening}
                onStopListening={stopListening}
              />
              <CommandPanel onCommand={handleUserInput} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
