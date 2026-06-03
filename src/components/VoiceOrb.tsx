import { AssistantState } from "../types";

interface Props {
  state: AssistantState;
  voiceEnabled: boolean;
  isListening: boolean;
  onToggleVoice: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
}

const stateColors = {
  idle: {
    outer: "border-cyan-500/30",
    middle: "border-cyan-500/20",
    inner: "bg-cyan-500/5 border-cyan-500/30",
    orb: "from-cyan-600/40 to-blue-700/40 shadow-[0_0_30px_rgba(0,255,255,0.15)]",
    label: "STANDBY",
    labelColor: "text-cyan-600",
  },
  listening: {
    outer: "border-green-400/50",
    middle: "border-green-400/30",
    inner: "bg-green-500/10 border-green-400/40",
    orb: "from-green-500/50 to-emerald-600/50 shadow-[0_0_40px_rgba(0,255,100,0.3)]",
    label: "LISTENING",
    labelColor: "text-green-400",
  },
  thinking: {
    outer: "border-amber-400/50",
    middle: "border-amber-400/30",
    inner: "bg-amber-500/10 border-amber-400/40",
    orb: "from-amber-500/50 to-orange-600/50 shadow-[0_0_40px_rgba(255,200,0,0.3)]",
    label: "PROCESSING",
    labelColor: "text-amber-400",
  },
  speaking: {
    outer: "border-purple-400/50",
    middle: "border-purple-400/30",
    inner: "bg-purple-500/10 border-purple-400/40",
    orb: "from-purple-500/50 to-violet-600/50 shadow-[0_0_40px_rgba(160,0,255,0.3)]",
    label: "SPEAKING",
    labelColor: "text-purple-400",
  },
};

export default function VoiceOrb({
  state,
  voiceEnabled,
  isListening,
  onToggleVoice,
  onStartListening,
  onStopListening,
}: Props) {
  const cfg = stateColors[state];
  const isActive = state !== "idle";

  return (
    <div className="glass-panel border border-cyan-900/30 rounded-xl p-5 flex flex-col items-center gap-4 flex-shrink-0">
      {/* Title */}
      <div className="w-full flex items-center justify-between">
        <span className="font-orbitron text-xs text-cyan-600 tracking-widest">VOICE ORB</span>
        <button
          onClick={onToggleVoice}
          className={`px-2 py-0.5 rounded text-[10px] font-orbitron border transition-all ${
            voiceEnabled
              ? "border-cyan-500/50 text-cyan-400 bg-cyan-500/10"
              : "border-red-500/40 text-red-500 bg-red-500/10"
          }`}
        >
          {voiceEnabled ? "ON" : "OFF"}
        </button>
      </div>

      {/* Orb */}
      <div className="relative flex items-center justify-center w-36 h-36">
        {/* Animated rings */}
        <div
          className={`absolute inset-0 rounded-full border ${cfg.outer} transition-all duration-500 ${
            isActive ? "animate-ping opacity-30" : ""
          }`}
        />
        <div
          className={`absolute inset-3 rounded-full border ${cfg.middle} transition-all duration-500 ${
            isActive ? "animate-pulse" : ""
          }`}
        />
        <div
          className={`absolute inset-6 rounded-full border ${cfg.inner} transition-all duration-500`}
        />

        {/* Main orb button */}
        <button
          onClick={isListening ? onStopListening : onStartListening}
          className={`relative z-10 w-20 h-20 rounded-full bg-gradient-to-br ${cfg.orb} border border-cyan-500/30 flex items-center justify-center transition-all duration-500 active:scale-95 group`}
        >
          {/* Waveform bars for active state */}
          {state === "listening" && (
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-green-300 rounded-full animate-bounce"
                  style={{
                    height: `${8 + Math.random() * 16}px`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: "0.5s",
                  }}
                />
              ))}
            </div>
          )}
          {state === "thinking" && (
            <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          )}
          {state === "speaking" && (
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-purple-300 rounded-full animate-bounce"
                  style={{
                    height: `${6 + Math.random() * 14}px`,
                    animationDelay: `${i * 0.12}s`,
                    animationDuration: "0.7s",
                  }}
                />
              ))}
            </div>
          )}
          {state === "idle" && (
            <svg className="w-8 h-8 text-cyan-300 group-hover:text-cyan-100 transition-colors" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          )}
        </button>

        {/* Rotating dashes */}
        <div
          className={`absolute inset-0 rounded-full border border-dashed border-cyan-500/20 ${
            isActive ? "animate-spin" : ""
          }`}
          style={{ animationDuration: "8s" }}
        />
      </div>

      {/* State label */}
      <div className="text-center">
        <div className={`font-orbitron text-sm font-bold tracking-widest ${cfg.labelColor}`}>
          {cfg.label}
        </div>
        <div className="text-cyan-800 text-[10px] font-share-tech mt-1">
          {voiceEnabled ? 'Say "Hey Buddy" to activate' : "Voice disabled"}
        </div>
      </div>

      {/* Voice bars visualization */}
      <div className="w-full flex items-center justify-center gap-1 h-8">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-all duration-150 ${
              isActive
                ? state === "listening"
                  ? "bg-green-400"
                  : state === "speaking"
                  ? "bg-purple-400"
                  : "bg-amber-400"
                : "bg-cyan-900/50"
            }`}
            style={{
              height: isActive
                ? `${Math.random() * 24 + 4}px`
                : `${Math.sin(i * 0.8) * 4 + 6}px`,
            }}
          />
        ))}
      </div>

      {/* Wake word hint */}
      <div className="w-full glass-panel border border-cyan-900/30 rounded-lg p-2 text-center">
        <span className="text-cyan-800 text-[10px] font-orbitron tracking-wider">WAKE WORD</span>
        <div className="text-cyan-400 text-xs font-share-tech mt-0.5">"Hey Buddy"</div>
      </div>
    </div>
  );
}
