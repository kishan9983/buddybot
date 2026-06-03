interface Props {
  onCommand: (cmd: string) => void;
}

const quickCommands = [
  { icon: "🕐", label: "Time", cmd: "what is the time", color: "cyan" },
  { icon: "📅", label: "Date", cmd: "what is the date", color: "blue" },
  { icon: "🔊", label: "Vol +", cmd: "volume up", color: "green" },
  { icon: "🔉", label: "Vol -", cmd: "volume down", color: "green" },
  { icon: "☀️", label: "Bright +", cmd: "brightness up", color: "amber" },
  { icon: "🌙", label: "Bright -", cmd: "brightness down", color: "amber" },
  { icon: "🌐", label: "Browser", cmd: "open chrome", color: "purple" },
  { icon: "▶️", label: "YouTube", cmd: "open youtube", color: "red" },
  { icon: "🔍", label: "Google", cmd: "open google", color: "blue" },
  { icon: "😄", label: "Joke", cmd: "tell me a joke", color: "pink" },
  { icon: "🖥️", label: "Status", cmd: "system status", color: "cyan" },
  { icon: "🆘", label: "Help", cmd: "help", color: "purple" },
];

const colorMap: Record<string, string> = {
  cyan: "border-cyan-500/30 hover:border-cyan-400/60 hover:bg-cyan-500/10 text-cyan-400",
  blue: "border-blue-500/30 hover:border-blue-400/60 hover:bg-blue-500/10 text-blue-400",
  green: "border-green-500/30 hover:border-green-400/60 hover:bg-green-500/10 text-green-400",
  amber: "border-amber-500/30 hover:border-amber-400/60 hover:bg-amber-500/10 text-amber-400",
  purple: "border-purple-500/30 hover:border-purple-400/60 hover:bg-purple-500/10 text-purple-400",
  red: "border-red-500/30 hover:border-red-400/60 hover:bg-red-500/10 text-red-400",
  pink: "border-pink-500/30 hover:border-pink-400/60 hover:bg-pink-500/10 text-pink-400",
};

export default function CommandPanel({ onCommand }: Props) {
  return (
    <div className="glass-panel border border-cyan-900/30 rounded-xl p-4 flex flex-col gap-3 flex-1 overflow-hidden">
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
        <span className="font-orbitron text-xs text-cyan-600 tracking-widest">QUICK COMMANDS</span>
      </div>

      <div className="grid grid-cols-3 gap-2 overflow-y-auto">
        {quickCommands.map((qc) => (
          <button
            key={qc.cmd}
            onClick={() => onCommand(qc.cmd)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border bg-transparent transition-all duration-200 active:scale-95 ${
              colorMap[qc.color] || colorMap.cyan
            }`}
          >
            <span className="text-base">{qc.icon}</span>
            <span className="text-[10px] font-orbitron tracking-wider leading-tight text-center">
              {qc.label}
            </span>
          </button>
        ))}
      </div>

      {/* System actions */}
      <div className="border-t border-cyan-900/30 pt-3 flex-shrink-0">
        <div className="text-[10px] font-orbitron text-cyan-800 tracking-widest mb-2">
          SYSTEM ACTIONS
        </div>
        <div className="flex flex-col gap-1.5">
          {[
            { icon: "🔒", label: "Lock Screen", cmd: "lock the screen" },
            { icon: "💤", label: "Sleep Mode", cmd: "sleep" },
            { icon: "🔄", label: "Restart", cmd: "restart" },
            { icon: "⚡", label: "Shutdown", cmd: "shutdown" },
          ].map((act) => (
            <button
              key={act.cmd}
              onClick={() => onCommand(act.cmd)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-cyan-900/30 hover:border-red-500/40 hover:bg-red-500/5 text-cyan-700 hover:text-red-400 transition-all text-xs font-rajdhani"
            >
              <span>{act.icon}</span>
              <span>{act.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
