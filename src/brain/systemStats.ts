import { SystemStats } from "../types";

let startTime = Date.now();
let cpuSeed = Math.random() * 30 + 15;
let memSeed = Math.random() * 20 + 40;
let processSeed = Math.floor(Math.random() * 30 + 120);
let batteryLevel = 87;
let batteryDirection = -1;

export function getSystemStats(): SystemStats {
  // Simulate realistic CPU fluctuations
  cpuSeed += (Math.random() - 0.5) * 8;
  cpuSeed = Math.max(5, Math.min(95, cpuSeed));

  memSeed += (Math.random() - 0.5) * 2;
  memSeed = Math.max(25, Math.min(85, memSeed));

  processSeed += Math.floor((Math.random() - 0.5) * 4);
  processSeed = Math.max(80, Math.min(300, processSeed));

  // Battery simulation
  if (Math.random() < 0.1) {
    batteryLevel += batteryDirection;
    if (batteryLevel <= 20) batteryDirection = 1;
    if (batteryLevel >= 99) batteryDirection = -1;
  }

  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const hours = Math.floor(elapsed / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((elapsed % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (elapsed % 60).toString().padStart(2, "0");

  return {
    cpuUsage: Math.round(cpuSeed),
    memUsage: Math.round(memSeed),
    uptime: `${hours}:${minutes}:${seconds}`,
    processes: processSeed,
    batteryLevel: Math.round(batteryLevel),
    networkStatus: Math.random() > 0.02 ? "Connected" : "Unstable",
  };
}

export function getTimeString(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function getDateString(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
