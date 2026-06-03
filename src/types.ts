export type AssistantState = "idle" | "listening" | "thinking" | "speaking";

export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
  type?: "text" | "system" | "error" | "success" | "command";
}

export interface SystemStats {
  cpuUsage: number;
  memUsage: number;
  uptime: string;
  processes: number;
  batteryLevel: number;
  networkStatus: string;
}

export interface CommandContext {
  volume: number;
  brightness: number;
  setVolume: (v: number) => void;
  setBrightness: (v: number) => void;
  askConfirmation: (action: string, label: string) => Promise<boolean>;
}

export interface CommandResult {
  response: string;
  type?: Message["type"];
  requiresConfirmation?: boolean;
  confirmed?: boolean;
}
