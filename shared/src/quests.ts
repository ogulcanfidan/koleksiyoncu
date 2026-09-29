// Günlük görevler: her gün havuzdan 3 görev seçilir; ilerleme, gün başındaki istatistiklere göre ölçülür.
// Üçü de tamamlanınca bonus ödül verilir. Görev seçimi cihaza ve güne göre sabittir.
import { useSyncExternalStore } from "react";
import { createRng } from "./random";
import { dayKey, load, save } from "./storage";
import type { Progress } from "./progress";

export type Reward = { kind: string; amount: number; icon: string };

export type QuestDef = {
  id: string;          // i18n: quest.<id> ({n} = hedef)
  icon: string;
  stat: string;        // progress.stats anahtarı
  goal: number;
  reward: Reward;
};

type State = { day: string; ids: string[]; base: Record<string, number>; claimed: string[]; bonusClaimed: boolean };

export class DailyQuests {
  private s: State;
  private listeners = new Set<() => void>();
  private snap = 0;

  constructor(
    private key: string,
    private pool: QuestDef[],
    private progress: Progress,
    public bonus: Reward,
    private grant: (r: Reward) => void,
  ) {
    this.s = load<State>(key, { day: "", ids: [], base: {}, claimed: [], bonusClaimed: false });
    this.roll();
    progress.subscribe(() => this.emitOnly());
  }

  private emitOnly() { this.snap++; this.listeners.forEach(l => l()); }
  private emit() { save(this.key, this.s); this.emitOnly(); }

  /** Gün değiştiyse yeni görevleri seç ve başlangıç değerlerini kaydet. */
  roll() {
    const today = dayKey();
    if (this.s.day === today && this.s.ids.length) return;
    const r = createRng(`${this.key}:${today}`);
    const ids = r.shuffle(this.pool).slice(0, 3).map(q => q.id);
    const base: Record<string, number> = {};
    for (const id of ids) { const q = this.def(id)!; base[q.stat] = this.progress.stat(q.stat); }
    this.s = { day: today, ids, base, claimed: [], bonusClaimed: false };
    this.emit();
  }

  def(id: string) { return this.pool.find(q => q.id === id); }
  get today(): QuestDef[] { this.roll(); return this.s.ids.map(id => this.def(id)!).filter(Boolean); }
  value(q: QuestDef) { return Math.max(0, this.progress.stat(q.stat) - (this.s.base[q.stat] ?? 0)); }
  done(q: QuestDef) { return this.value(q) >= q.goal; }
  claimed(q: QuestDef) { return this.s.claimed.includes(q.id); }
  get allClaimed() { return this.today.every(q => this.claimed(q)); }
  get bonusClaimed() { return this.s.bonusClaimed; }
  get claimable() { return this.today.filter(q => this.done(q) && !this.claimed(q)).length + (this.allClaimed && !this.s.bonusClaimed ? 1 : 0); }

  claim(q: QuestDef): boolean {
    if (!this.done(q) || this.claimed(q)) return false;
    this.s.claimed.push(q.id); this.grant(q.reward);
    this.progress.add("questsDone"); this.progress.commit();
    this.emit(); return true;
  }
  claimBonus(): boolean {
    if (!this.allClaimed || this.s.bonusClaimed) return false;
    this.s.bonusClaimed = true; this.grant(this.bonus);
    this.progress.add("questDaysComplete"); this.progress.commit();
    this.emit(); return true;
  }
  reset() { this.s = { day: "", ids: [], base: {}, claimed: [], bonusClaimed: false }; this.roll(); }

  subscribe = (cb: () => void) => { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; };
  getSnapshot = () => this.snap;
}

export function useQuests(q: DailyQuests) { useSyncExternalStore(q.subscribe, q.getSnapshot); return q; }
