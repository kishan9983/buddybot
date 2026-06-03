import { useEffect, useRef } from "react";
import { AssistantState, Message } from "../types";

interface Props {
  messages: Message[];
  state: AssistantState;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  const bubbleClass = isUser
    ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-100 ml-auto rounded-tl-2xl rounded-bl-2xl rounded-tr-sm"
    : msg.type === "error"
    ? "bg-red-500/10 border border-red-500/30 text-red-200 rounded-tr-2xl rounded-br-2xl rounded-tl-sm"
    : msg.type === "success"
    ? "bg-green-500/10 border border-green-500/30 text-green-200 rounded-tr-2xl rounded-br-2xl rounded-tl-sm"
    : msg.type === "command"
    ? "bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-tr-2xl rounded-br-2xl rounded-tl-sm"
    : msg.type === "system"
    ? "bg-blue-500/10 border border-blue-500/40 text-blue-200 rounded-tr-2xl rounded-br-2xl rounded-tl-sm"
    : "bg-[#0a1628]/80 border border-cyan-900/40 text-cyan-100 rounded-tr-2xl rounded-br-2xl rounded-tl-sm";

  const iconClass = isUser
    ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300"
    : msg.type === "error"
    ? "bg-red-500/20 border border-red-500/40 text-red-400"
    : msg.type === "success"
    ? "bg-green-500/20 border border-green-500/40 text-green-400"
    : msg.type === "command"
    ? "bg-amber-500/20 border border-amber-500/40 text-amber-400"
    : "bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-600/40 text-cyan-300";

  const icon = isUser
    ? "👤"
    : msg.type === "error"
    ? "⚠️"
    : msg.type === "success"
    ? "✅"
    : msg.type === "command"
    ? "⚡"
    : msg.type === "system"
    ? "🖥️"
    : "🤖";

  // Parse bold markdown **text**
  const renderText = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <strong key={i} className="font-bold text-white">
          {part}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div
      className={`flex gap-3 animate-slideIn ${isUser ? "flex-row-reverse" : "flex-row"} max-w-full`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-sm ${iconClass}`}
      >
        <span>{icon}</span>
      </div>

      {/* Bubble */}
      <div className={`relative max-w-[75%] px-4 py-3 ${bubbleClass} backdrop-blur-sm`}>
        {/* Sender label */}
        <div className={`text-[10px] font-orbitron tracking-widest mb-1.5 ${isUser ? "text-cyan-600 text-right" : "text-cyan-700"}`}>
          {isUser ? "YOU" : "BUDDYBOT"}
        </div>

        {/* Text */}
        <p className="text-sm leading-relaxed font-rajdhani whitespace-pre-wrap break-words">
          {renderText(msg.text)}
        </p>

        {/* Timestamp */}
        <div className={`text-[10px] font-share-tech mt-1.5 ${isUser ? "text-right text-cyan-700" : "text-cyan-800"}`}>
          {formatTime(msg.timestamp)}
        </div>

        {/* Corner decoration */}
        {!isUser && (
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500/40" />
        )}
        {isUser && (
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-500/40" />
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-slideIn">
      <div className="flex-shrink-0 w-8 h-8 rounded-full border border-cyan-600/40 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center text-sm">
        🤖
      </div>
      <div className="bg-[#0a1628]/80 border border-cyan-900/40 rounded-tr-2xl rounded-br-2xl rounded-tl-sm px-4 py-3 backdrop-blur-sm">
        <div className="text-[10px] font-orbitron tracking-widest text-cyan-700 mb-2">BUDDYBOT</div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
          <span className="text-cyan-600 text-xs font-share-tech">Processing neural pathways...</span>
        </div>
      </div>
    </div>
  );
}

export default function ChatInterface({ messages, state }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, state]);

  return (
    <div className="flex-1 glass-panel border border-cyan-900/30 rounded-xl overflow-hidden flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-cyan-900/30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-orbitron text-xs text-cyan-500 tracking-widest">
            NEURAL CHAT INTERFACE
          </span>
        </div>
        <div className="flex items-center gap-3 text-cyan-800 text-xs font-share-tech">
          <span>{messages.length} messages</span>
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 opacity-70" />
            <div className="w-2 h-2 rounded-full bg-amber-500 opacity-70" />
            <div className="w-2 h-2 rounded-full bg-red-500 opacity-70" />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {/* Welcome header */}
        <div className="text-center py-2">
          <div className="inline-flex items-center gap-2 text-cyan-800 text-xs font-orbitron tracking-widest border border-cyan-900/30 rounded-full px-4 py-1">
            <div className="w-1 h-1 rounded-full bg-cyan-600" />
            SESSION STARTED
            <div className="w-1 h-1 rounded-full bg-cyan-600" />
          </div>
        </div>

        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {state === "thinking" && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
