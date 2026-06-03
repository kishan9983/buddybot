import { useEffect, useRef } from "react";
import { SystemStats } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  commandHistory: string[];
  stats: SystemStats;
  volume: number;
  brightness: number;
  onVolumeChange: (v: number) => void;
  onBrightnessChange: (v: number) => void;
  onCommand: (cmd: string) => void;
}

function StatGauge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="font-orbitron text-cyan-700 tracking-wider">{label}</span>
        <span className={`font-share-tech ${color}`}>{value}%</span>
      </div>
      <div className="h-1.5 bg-cyan-950 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            value > 80
              ? "bg-gradient-to-r from-red-600 to-red-400"
              : value > 60
              ? "bg-gradient-to-r from-amber-600 to-amber-400"
              : `bg-gradient-to-r ${color.includes("cyan") ? "from-cyan-700 to-cyan-400" : "from-purple-700 to-purple-400"}`
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function Sidebar({
  open,
  onClose,
  commandHistory,
  stats,
  volume,
  brightness,
  onVolumeChange,
  onBrightnessChange,
  onCommand,
}: Props) {
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (open && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar panel */}
      <div
        ref={sidebarRef}
        className={`fixed lg:relative z-50 lg:z-auto top-0 left-0 h-full w-72 flex flex-col glass-panel border-r border-cyan-900/40 transform transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-0"
        }`}
      >
        <div className={`flex flex-col h-full w-72 overflow-hidden ${!open ? "lg:hidden" : ""}`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-900/30 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-orbitron text-xs text-cyan-500 tracking-widest">CONTROL PANEL</span>
            </div>
            <button
              onClick={onClose}
              className="text-cyan-700 hover:text-cyan-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* System Stats */}
            <section>
              <h3 className="font-orbitron text-xs text-cyan-700 tracking-widest mb-3 flex items-center gap-2">
                <span className="w-3 h-px bg-cyan-700" />
                SYSTEM MONITOR
              </h3>
              <div className="space-y-3">
                <StatGauge label="CPU USAGE" value={stats.cpuUsage} color="text-cyan-400" />
                <StatGauge label="MEMORY" value={stats.memUsage} color="text-purple-400" />
                <StatGauge label="BATTERY" value={stats.batteryLevel} color="text-green-400" />

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[
                    { label: "UPTIME", value: stats.uptime },
                    { label: "PROCESSES", value: String(stats.processes) },
                    { label: "NETWORK", value: stats.networkStatus },
                    { label: "STATUS", value: "NOMINAL" },
                  ].map((item) => (
                    <div key={item.label} className="bg-cyan-950/30 border border-cyan-900/30 rounded-lg p-2">
                      <div className="text-[9px] font-orbitron text-cyan-800 tracking-wider">{item.label}</div>
                      <div className="text-xs font-share-tech text-cyan-400 mt-0.5 truncate">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Volume control */}
            <section>
              <h3 className="font-orbitron text-xs text-cyan-700 tracking-widest mb-3 flex items-center gap-2">
                <span className="w-3 h-px bg-cyan-700" />
                VOLUME CONTROL
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cyan-700 font-orbitron">LEVEL</span>
                  <span className="font-share-tech text-cyan-400">{volume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => onVolumeChange(Number(e.target.value))}
                  className="w-full h-1.5 appearance-none bg-cyan-950 rounded-full outline-none slider-cyan"
                />
                <div className="flex gap-2">
                  <button onClick={() => onCommand("mute")} className="flex-1 py-1 text-[10px] font-orbitron border border-cyan-900/40 hover:border-red-500/40 text-cyan-700 hover:text-red-400 rounded transition-all">MUTE</button>
                  <button onClick={() => onCommand("volume up")} className="flex-1 py-1 text-[10px] font-orbitron border border-cyan-900/40 hover:border-cyan-500/50 text-cyan-700 hover:text-cyan-400 rounded transition-all">VOL+</button>
                  <button onClick={() => onCommand("volume down")} className="flex-1 py-1 text-[10px] font-orbitron border border-cyan-900/40 hover:border-cyan-500/50 text-cyan-700 hover:text-cyan-400 rounded transition-all">VOL-</button>
                </div>
              </div>
            </section>

            {/* Brightness control */}
            <section>
              <h3 className="font-orbitron text-xs text-cyan-700 tracking-widest mb-3 flex items-center gap-2">
                <span className="w-3 h-px bg-cyan-700" />
                BRIGHTNESS
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cyan-700 font-orbitron">LEVEL</span>
                  <span className="font-share-tech text-amber-400">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={brightness}
                  onChange={(e) => onBrightnessChange(Number(e.target.value))}
                  className="w-full h-1.5 appearance-none bg-cyan-950 rounded-full outline-none slider-amber"
                />
                <div className="flex gap-2">
                  <button onClick={() => onCommand("brightness up")} className="flex-1 py-1 text-[10px] font-orbitron border border-cyan-900/40 hover:border-amber-500/50 text-cyan-700 hover:text-amber-400 rounded transition-all">BRIGHT+</button>
                  <button onClick={() => onCommand("brightness down")} className="flex-1 py-1 text-[10px] font-orbitron border border-cyan-900/40 hover:border-amber-500/50 text-cyan-700 hover:text-amber-400 rounded transition-all">BRIGHT-</button>
                </div>
              </div>
            </section>

            {/* Command History */}
            <section>
              <h3 className="font-orbitron text-xs text-cyan-700 tracking-widest mb-3 flex items-center gap-2">
                <span className="w-3 h-px bg-cyan-700" />
                COMMAND HISTORY
              </h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {commandHistory.length === 0 ? (
                  <p className="text-cyan-800 text-xs font-share-tech text-center py-4">
                    No commands yet...
                  </p>
                ) : (
                  commandHistory.map((cmd, i) => (
                    <button
                      key={i}
                      onClick={() => onCommand(cmd)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-cyan-950/30 border border-cyan-900/20 hover:border-cyan-700/40 hover:bg-cyan-900/30 transition-all group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-800 text-[10px] font-orbitron w-4 flex-shrink-0">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="text-cyan-500 group-hover:text-cyan-300 text-xs font-share-tech truncate transition-colors">
                          {cmd}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>

            {/* Quick links */}
            <section>
              <h3 className="font-orbitron text-xs text-cyan-700 tracking-widest mb-3 flex items-center gap-2">
                <span className="w-3 h-px bg-cyan-700" />
                QUICK LINKS
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Google", cmd: "open google" },
                  { label: "YouTube", cmd: "open youtube" },
                  { label: "GitHub", cmd: "open github" },
                  { label: "Help", cmd: "help" },
                ].map((link) => (
                  <button
                    key={link.cmd}
                    onClick={() => { onCommand(link.cmd); onClose(); }}
                    className="py-2 text-[10px] font-orbitron border border-cyan-900/30 hover:border-cyan-500/50 text-cyan-700 hover:text-cyan-400 rounded-lg transition-all"
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-cyan-900/30 flex-shrink-0">
            <div className="text-center">
              <div className="text-[10px] font-orbitron text-cyan-800 tracking-widest">
                BUDDYBOT v2.0 — JARVIS CLASS
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-share-tech text-green-600">All systems nominal</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
