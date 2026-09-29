import type { AchievementDef } from "@shared/src/progress";

const s = (k: string) => (st: Record<string, number>) => st[k] || 0;

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "firstDay", icon: "🗝️", goal: 1, value: s("days") },
  { id: "fakes10", icon: "🕵️", goal: 10, value: s("fakesCaught") },
  { id: "fakes50", icon: "🦅", goal: 50, value: s("fakesCaught") },
  { id: "perfectDay", icon: "💎", goal: 1, value: s("perfectDays") },
  { id: "perfect5", icon: "👑", goal: 5, value: s("perfectDays") },
  { id: "treasure", icon: "🏺", goal: 1, value: s("treasures") },
  { id: "haggler", icon: "🤝", goal: 10, value: s("bargains") },
  { id: "sharpEye", icon: "⚡", goal: 10, value: s("fastCorrect") },
  { id: "profit10k", icon: "💰", goal: 10000, value: s("profitTotal") },
  { id: "profit100k", icon: "🏦", goal: 100000, value: s("profitTotal") },
  { id: "allTools", icon: "🧰", goal: 5, value: s("toolsOwned") },
  { id: "allCatalogs", icon: "📚", goal: 2, value: s("catalogs") },
  { id: "streak7", icon: "🔥", goal: 7, value: s("streakBest") },
  { id: "days30", icon: "🏛️", goal: 30, value: s("days") },
  { id: "reputation", icon: "⭐", goal: 90, value: s("reputationMax") },
  { id: "stamps10", icon: "📜", goal: 10, value: s("stamps") },
  { id: "stampsAll", icon: "🏛️", goal: 18, value: s("stamps") },
  { id: "rankMaster", icon: "🎖️", goal: 2, value: s("rankReached") },
  { id: "rankLegend", icon: "🌟", goal: 4, value: s("rankReached") },
  { id: "quests10", icon: "📋", goal: 10, value: s("questsDone") },
  { id: "bareEye", icon: "👁️", goal: 1, value: s("fakeNoTool"), hidden: true },
  { id: "fooled", icon: "🤡", goal: 1, value: s("fakesBought"), hidden: true },
];
