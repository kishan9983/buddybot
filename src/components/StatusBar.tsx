import { useEffect, useState } from "react";
import { AssistantState, SystemStats } from "../types";
import { getTimeString } from "../brain/systemStats";

interface Props {
  state: AssistantState;
  stats: SystemStats;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  onToggleSidebar: () => void;
}

const stateConfig = {
  idle: { label: "STANDBY", color: "text-cyan-500", dot: "bg-cyan-500", pulse: false },
  listening: { label: "LISTENING", color: "text-green-400", dot: "bg-green-400", pulse: true },
  thinking: { label: "PROCESSING", color: "text-amber-400", dot: "bg-amber-400", pulse: true },
  speaking: { label: "SPEAKING", color: "text-purple-400", dot: "bg-purple-400", pulse: true },
};

export default function StatusBar({ state, stats, voiceEnabled, onToggleVoice, onToggleSidebar }: Props) {
  const [time, setTime] = useState(getTimeString());
  const cfg = stateConfig[state];

  useEffect(() => {
    const t = setInterval(() => setTime(getTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-cyan-900/40 bg-black/30 backdrop-blur-sm flex-shrink-0">
      {/* Left: Logo + sidebar toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg border border-cyan-900/50 hover:border-cyan-500/50 text-cyan-600 hover:text-cyan-300 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_10px_rgba(0,255,255,0.5)]">
            <span className="text-[8px] font-black text-white font-orbitron">BB</span>
          </div>
          <span className="font-orbitron text-sm font-bold text-cyan-300 tracking-widest hidden sm:block">
            BUDDYBOT
          </span>
          <span className="text-cyan-800 text-xs hidden sm:block font-share-tech">v2.0</span>
        </div>
      </div>

      {/* Center: State indicator */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 glass-panel px-3 py-1 rounded-full border border-cyan-900/40">
          <div
            className={`w-2 h-2 rounded-full ${cfg.dot} ${cfg.pulse ? "animate-pulse" : ""}`}
          />
          <span className={`font-orbitron text-xs ${cfg.color} tracking-widest`}>
            {cfg.label}
          </span>
        </div>

        {/* Waveform when speaking/listening */}
        {(state === "listening" || state === "speaking" || state === "thinking") && (
          <div className="hidden sm:flex items-center gap-0.5 h-5">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className={`w-0.5 rounded-full animate-bounce ${
                  state === "listening" ? "bg-green-400" :
                  state === "speaking" ? "bg-purple-400" : "bg-amber-400"
                }`}
                style={{
                  height: `${(i % 3 === 0 ? 14 : i % 3 === 1 ? 8 : 11)}px`,
                  animationDelay: `${i * 0.08}s`,
                  animationDuration: state === "thinking" ? "0.4s" : "0.6s",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right: Stats + time + controls */}
      <div className="flex items-center gap-3">
        {/* CPU */}
        <div className="hidden md:flex items-center gap-1.5 text-xs">
          <span className="text-cyan-700 font-orbitron">CPU</span>
          <div className="w-12 h-1.5 bg-cyan-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-600 to-cyan-300 rounded-full transition-all duration-1000"
              style={{ width: `${stats.cpuUsage}%` }}
            />
          </div>
          <span className="text-cyan-500 font-share-tech w-8">{stats.cpuUsage}%</span>
        </div>

        {/* RAM */}
        <div className="hidden md:flex items-center gap-1.5 text-xs">
          <span className="text-cyan-700 font-orbitron">MEM</span>
          <div className="w-12 h-1.5 bg-cyan-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-purple-300 rounded-full transition-all duration-1000"
              style={{ width: `${stats.memUsage}%` }}
            />
          </div>
          <span className="text-cyan-500 font-share-tech w-8">{stats.memUsage}%</span>
        </div>

        {/* Network */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs">
          <div className={`w-1.5 h-1.5 rounded-full ${stats.networkStatus === "Connected" ? "bg-green-400" : "bg-amber-400"}`} />
          <span className="text-cyan-600 font-share-tech">{stats.networkStatus}</span>
        </div>

        {/* Voice toggle */}
        <button
          onClick={onToggleVoice}
          title={voiceEnabled ? "Disable Voice" : "Enable Voice"}
          className={`p-1.5 rounded-lg border transition-all text-xs font-orbitron ${
            voiceEnabled
              ? "border-cyan-500/60 text-cyan-300 bg-cyan-500/10 shadow-[0_0_8px_rgba(0,255,255,0.2)]"
              : "border-cyan-900/40 text-cyan-700 hover:text-cyan-500"
          }`}
        >
          {voiceEnabled ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
            </svg>
          )}
        </button>

        {/* Time */}
        <div className="font-share-tech text-sm text-cyan-400 tracking-wider border-l border-cyan-900/40 pl-3">
          {time}
        </div>
      </div>
    </div>
  );
}
