interface Props {
  onCommand: (cmd: string) => void;
}

const cmds = [
  { icon: "🕐", label: "Time", cmd: "what is the time" },
  { icon: "🔊", label: "Vol+", cmd: "volume up" },
  { icon: "🔉", label: "Vol-", cmd: "volume down" },
  { icon: "🌐", label: "Browser", cmd: "open chrome" },
  { icon: "🆘", label: "Help", cmd: "help" },
];

export default function MobileBar({ onCommand }: Props) {
  return (
    <div className="xl:hidden flex gap-2 overflow-x-auto pb-1 flex-shrink-0">
      {cmds.map((c) => (
        <button
          key={c.cmd}
          onClick={() => onCommand(c.cmd)}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 glass-panel border border-cyan-900/30 rounded-lg text-xs font-orbitron text-cyan-600 hover:text-cyan-300 hover:border-cyan-500/40 transition-all"
        >
          <span>{c.icon}</span>
          <span>{c.label}</span>
        </button>
      ))}
    </div>
  );
}
