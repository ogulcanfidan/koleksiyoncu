// Google Play Oyun Hizmetleri: genel sıralama ve başarımlar.
// Yerel köprü: plugins/play-games (PlayGames eklentisi). Tarayıcıda ve köprü yoksa her şey sessizce devre dışı.
// Senkron: oyun açılınca Play Games sessizce giriş yapar; girişliyse puan ve açılmış başarımlar gönderilir,
// sonra ilerleme her değiştiğinde yeni puan ve yeni başarımlar otomatik gider. Başarım açmak tekrarlanabilir
// (zaten açıksa Play Games bir şey yapmaz), bu yüzden eski kayıtlar da güvenle yeniden gönderilir.
import { Capacitor, registerPlugin } from "@capacitor/core";
import type { Progress } from "./progress";

type GamesPlugin = {
  isAuthenticated(): Promise<{ isAuthenticated: boolean }>;
  signIn(): Promise<{ isAuthenticated: boolean; player_id?: string; player_name?: string }>;
  submitScore(o: { leaderboardID: string; totalScoreAmount: number }): Promise<{ sent: boolean }>;
  unlockAchievement(o: { achievementID: string }): Promise<{ sent: boolean }>;
  showLeaderboard(o: { leaderboardID: string }): Promise<void>;
  showAchievements(): Promise<void>;
};

const Games = registerPlugin<GamesPlugin>("PlayGames");

export type LeaderboardIds = { android?: string; ios?: string };
export type PlayGamesConfig = {
  leaderboard: LeaderboardIds;
  /** Oyundaki başarım kimliği → Play Games başarım kimliği */
  achievements: Record<string, string>;
};

let cfg: PlayGamesConfig | null = null;
let signedIn = false;
let lastScore = -1;
const sentAchievements = new Set<string>();

function idFor(ids: LeaderboardIds): string | undefined {
  return Capacitor.getPlatform() === "ios" ? ids.ios : ids.android;
}

/** Bu cihazda Play Games kullanılabilir mi (telefon, köprü var, kimlik girilmiş). */
export function playGamesAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("PlayGames") && !!cfg && !!idFor(cfg.leaderboard);
}
/** Eski adla uyumluluk. */
export function nativeLeaderboardAvailable(ids: LeaderboardIds): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("PlayGames") && !!idFor(ids);
}

async function sync(progress: Progress) {
  if (!signedIn || !cfg) return;
  const lb = idFor(cfg.leaderboard);
  const score = progress.leaderboardScore();
  if (lb && score > 0 && score !== lastScore) {
    lastScore = score;
    try { await Games.submitScore({ leaderboardID: lb, totalScoreAmount: score }); } catch (e) { console.warn(e); }
  }
  for (const a of progress.achievements) {
    const pgs = cfg.achievements[a.id];
    if (!pgs || sentAchievements.has(a.id) || !progress.isUnlocked(a.id)) continue;
    sentAchievements.add(a.id);
    try { await Games.unlockAchievement({ achievementID: pgs }); } catch (e) { sentAchievements.delete(a.id); console.warn(e); }
  }
}

/** Uygulama açılışında bir kez çağrılır. */
export async function initPlayGames(config: PlayGamesConfig, progress: Progress) {
  cfg = config;
  if (!playGamesAvailable()) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  progress.subscribe(() => { clearTimeout(timer); timer = setTimeout(() => void sync(progress), 1500); });
  try {
    signedIn = (await Games.isAuthenticated()).isAuthenticated;
    await sync(progress);
  } catch (e) { console.warn("Play Games", e); }
}

/** Oyuncu girmemişse izin ekranını açar; sonra her şeyi gönderir. */
async function ensureSignedIn(progress?: Progress): Promise<boolean> {
  if (signedIn) return true;
  try {
    signedIn = (await Games.signIn()).isAuthenticated;
    if (signedIn && progress) await sync(progress);
  } catch { signedIn = false; }
  return signedIn;
}

export async function showNativeLeaderboard(ids: LeaderboardIds, progress?: Progress): Promise<boolean> {
  const id = idFor(ids);
  if (!nativeLeaderboardAvailable(ids) || !id) return false;
  if (!(await ensureSignedIn(progress))) return false;
  try { await Games.showLeaderboard({ leaderboardID: id }); return true; } catch { return false; }
}

export async function showNativeAchievements(progress?: Progress): Promise<boolean> {
  if (!playGamesAvailable()) return false;
  if (!(await ensureSignedIn(progress))) return false;
  try { await Games.showAchievements(); return true; } catch { return false; }
}

/** Eski arayüz: tek puan gönderimi (initPlayGames zaten otomatik gönderiyor). */
export async function submitScore(ids: LeaderboardIds, score: number) {
  const id = idFor(ids);
  if (!signedIn || !id) return;
  try { await Games.submitScore({ leaderboardID: id, totalScoreAmount: score }); } catch (e) { console.warn(e); }
}
