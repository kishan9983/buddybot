import { useEffect, useState } from "react";

const bootLines = [
  "INITIALIZING BUDDYBOT CORE SYSTEMS...",
  "LOADING NEURAL NETWORK MODULES... [OK]",
  "VOICE RECOGNITION ENGINE... [ACTIVE]",
  "NATURAL LANGUAGE PROCESSOR... [ONLINE]",
  "COMMAND EXECUTION LAYER... [READY]",
  "SECURITY PROTOCOLS... [ENGAGED]",
  "GLASSMORPHIC UI RENDERER... [LOADED]",
  "ALL SYSTEMS NOMINAL — WELCOME, COMMANDER.",
];

export default function WakeScreen() {
  const [lines, setLines] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    bootLines.forEach((line, i) => {
      setTimeout(() => {
        setLines((prev) => [...prev, line]);
        setProgress(Math.round(((i + 1) / bootLines.length) * 100));
      }, i * 360);
    });
  }, []);

  return (
    <div className="fixed inset-0 bg-[#020b18] flex flex-col items-center justify-center overflow-hidden font-orbitron">
      {/* Animated rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="absolute rounded-full border border-cyan-500/20 animate-ping"
            style={{
              width: `${i * 120}px`,
              height: `${i * 120}px`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${2 + i * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Logo */}
      <div className="relative mb-8 z-10">
        <div className="w-24 h-24 rounded-full border-2 border-cyan-400 flex items-center justify-center relative shadow-[0_0_40px_rgba(0,255,255,0.4)]">
          <div className="w-20 h-20 rounded-full border border-cyan-500/50 flex items-center justify-center animate-spin" style={{ animationDuration: "8s" }}>
            <div className="absolute w-1 h-8 bg-cyan-400 top-1 left-1/2 -translate-x-1/2 origin-bottom rounded-full" />
          </div>
          <span className="absolute text-cyan-300 text-xl font-black tracking-wider">BB</span>
        </div>
      </div>

      <h1 className="text-3xl font-black tracking-[0.3em] mb-2 z-10 holo-text">
        BUDDYBOT
      </h1>
      <p className="text-cyan-600 text-xs tracking-[0.4em] mb-10 z-10">
        JARVIS-CLASS AI ASSISTANT v2.0
      </p>

      {/* Boot log */}
      <div className="w-full max-w-lg bg-black/40 border border-cyan-900/60 rounded-lg p-4 font-share-tech text-xs space-y-1 z-10">
        {lines.map((line, i) => (
          <div
            key={i}
            className={`flex gap-3 animate-fadeIn ${
              line.includes("WELCOME") ? "text-cyan-300" : "text-cyan-600"
            }`}
          >
            <span className="text-cyan-800 select-none">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>{line}</span>
          </div>
        ))}
        {lines.length < bootLines.length && (
          <div className="flex gap-3 text-cyan-500">
            <span className="text-cyan-800">
              {String(lines.length + 1).padStart(2, "0")}
            </span>
            <span className="animate-pulse">█</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-lg mt-4 z-10">
        <div className="flex justify-between text-cyan-700 text-xs font-orbitron mb-1">
          <span>BOOT PROGRESS</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1 bg-cyan-950 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-600 to-cyan-300 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(0,255,255,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
