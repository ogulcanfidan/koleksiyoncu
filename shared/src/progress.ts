// İstatistikler, başarımlar ve sıralama puanı.
import { useSyncExternalStore } from "react";
import { dayKey, load, save } from "./storage";

export type AchievementDef = {
  id: string;
  icon: string;
  /** i18n anahtarları: ach.<id>.title / ach.<id>.desc */
  goal: number;
  /** stats üzerinden mevcut ilerleme */
  value: (s: Stats) => number;
  hidden?: boolean;
};

export type Stats = Record<string, number>;

export type SessionRecord = {
  day: string;
  correct: number;
  wrong: number;
  seconds: number;
  score: number;
};

type State = {
  stats: Stats;
  unlocked: Record<string, number>;
  history: SessionRecord[];
  streak: { current: number; best: number; lastDay: string };
};

export type LeaderboardConfig = {
  /** Bir doğru kararın hedef süresi (saniye). Bundan hızlı olan puan çarpanı kazanır. */
  parSeconds: number;
};

export class Progress {
  private s: State;
  private listeners = new Set<() => void>();
  private snap = 0;
  onUnlock: (a: AchievementDef) => void = () => {};

  constructor(private key: string, public achievements: AchievementDef[], public lb: LeaderboardConfig) {
    this.s = load<State>(key, { stats: {}, unlocked: {}, history: [], streak: { current: 0, best: 0, lastDay: "" } });
  }
  private emit() { save(this.key, this.s); this.snap++; this.listeners.forEach(l => l()); }

  get stats(): Readonly<Stats> { return this.s.stats; }
  get history(): readonly SessionRecord[] { return this.s.history; }
  get streak() { return this.s.streak; }
  stat(k: string) { return this.s.stats[k] || 0; }
  isUnlocked(id: string) { return !!this.s.unlocked[id]; }
  unlockedAt(id: string) { return this.s.unlocked[id]; }

  add(k: string, n = 1) { this.s.stats[k] = (this.s.stats[k] || 0) + n; }
  max(k: string, n: number) { this.s.stats[k] = Math.max(this.s.stats[k] || 0, n); }
  min(k: string, n: number) { const c = this.s.stats[k]; this.s.stats[k] = c ? Math.min(c, n) : n; }

  /** Oynanan her gün seriye eklenir. */
  touchStreak() {
    const today = dayKey();
    const st = this.s.streak;
    if (st.lastDay === today) return;
    const y = new Date(); y.setDate(y.getDate() - 1);
    st.current = st.lastDay === dayKey(y) ? st.current + 1 : 1;
    st.best = Math.max(st.best, st.current);
    st.lastDay = today;
    this.s.stats.streakBest = st.best;
    this.s.stats.streakCurrent = st.current;
  }

  recordSession(r: SessionRecord) {
    this.s.history.push(r);
    if (this.s.history.length > 120) this.s.history.splice(0, this.s.history.length - 120);
  }

  /** Değişiklikleri kaydeder ve yeni açılan başarımları döndürür. */
  commit(): AchievementDef[] {
    const fresh: AchievementDef[] = [];
    for (const a of this.achievements) {
      if (!this.s.unlocked[a.id] && a.value(this.s.stats) >= a.goal) {
        this.s.unlocked[a.id] = Date.now(); fresh.push(a);
      }
    }
    this.emit();
    fresh.forEach(a => this.onUnlock(a));
    return fresh;
  }

  /**
   * Sıralama puanı = doğru karar sayısı × 100 × hız çarpanı.
   * Hız çarpanı = hedef süre / ortalama süre (0,5 ile 2 arasında sınırlı).
   * Yani hem çok iş çözen hem de hızlı çözen öne geçer; rastgele hızlı basmak ise
   * yanlış kararlar puan getirmediği için işe yaramaz.
   */
  leaderboardScore(): number {
    const correct = this.stat("correct");
    if (!correct) return 0;
    const avg = this.stat("secondsOnCorrect") / correct;
    const speed = Math.max(0.5, Math.min(2, this.lb.parSeconds / Math.max(1, avg)));
    return Math.round(correct * 100 * speed);
  }

  resetAll() { this.s = { stats: {}, unlocked: {}, history: [], streak: { current: 0, best: 0, lastDay: "" } }; this.emit(); }

  subscribe = (cb: () => void) => { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; };
  getSnapshot = () => this.snap;
}

export function useProgress(p: Progress) { useSyncExternalStore(p.subscribe, p.getSnapshot); return p; }
