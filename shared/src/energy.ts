// Hak / enerji sistemi. Her oyun kendi kuralını verir:
//  - regen: belirli dakikada bir 1 hak dolar (üst sınıra kadar)
//  - daily: her gün yerel gece yarısında belirli sayıda hak verilir
// Reklamla kazanılan hakların günlük bir üst sınırı vardır.
import { useSyncExternalStore } from "react";
import { dayKey, load, save } from "./storage";

export type EnergyConfig = {
  key: string;
  max: number;
  mode: "regen" | "daily";
  regenMinutes?: number;   // regen modunda
  adMaxPerDay: number;     // günde en fazla kaç reklam hak verir
  adAmount: number;        // reklam başına hak
};

type State = { value: number; last: number; adsDay: string; adsUsed: number; grantDay: string };

export class Energy {
  private s: State;
  private listeners = new Set<() => void>();
  private snapshot = 0;
  constructor(public cfg: EnergyConfig) {
    this.s = load<State>(cfg.key, { value: cfg.max, last: Date.now(), adsDay: dayKey(), adsUsed: 0, grantDay: dayKey() });
    this.tick();
    setInterval(() => this.tick(), 15_000);
  }
  private emit() { save(this.cfg.key, this.s); this.snapshot++; this.listeners.forEach(l => l()); }

  tick() {
    const today = dayKey();
    let changed = false;
    if (this.s.adsDay !== today) { this.s.adsDay = today; this.s.adsUsed = 0; changed = true; }
    if (this.cfg.mode === "daily" && this.s.grantDay !== today) {
      this.s.grantDay = today; this.s.value = Math.max(this.s.value, this.cfg.max); changed = true;
    }
    if (this.cfg.mode === "regen" && this.cfg.regenMinutes) {
      const step = this.cfg.regenMinutes * 60_000;
      if (this.s.value >= this.cfg.max) { this.s.last = Date.now(); }
      else {
        const gained = Math.floor((Date.now() - this.s.last) / step);
        if (gained > 0) {
          this.s.value = Math.min(this.cfg.max, this.s.value + gained);
          this.s.last = this.s.value >= this.cfg.max ? Date.now() : this.s.last + gained * step;
          changed = true;
        }
      }
    }
    if (changed) this.emit(); else { this.snapshot++; this.listeners.forEach(l => l()); }
  }

  get value() { return this.s.value; }
  get adsLeft() { return Math.max(0, this.cfg.adMaxPerDay - this.s.adsUsed); }
  /** Bir sonraki hakka kalan milisaniye (regen) ya da gece yarısına kalan süre (daily). */
  msToNext(): number | null {
    if (this.cfg.mode === "regen") {
      if (this.s.value >= this.cfg.max || !this.cfg.regenMinutes) return null;
      return Math.max(0, this.s.last + this.cfg.regenMinutes * 60_000 - Date.now());
    }
    const d = new Date(); d.setHours(24, 0, 0, 0);
    return d.getTime() - Date.now();
  }
  /** Tüm haklar dolduğunda (bildirim için) tarih. */
  fullAt(): Date | null {
    if (this.cfg.mode === "daily") { const d = new Date(); d.setHours(24, 0, 5, 0); return d; }
    const next = this.msToNext();
    if (next == null) return null;
    const missing = this.cfg.max - this.s.value - 1;
    return new Date(Date.now() + next + missing * (this.cfg.regenMinutes! * 60_000));
  }
  spend(n = 1): boolean {
    this.tick();
    if (this.s.value < n) return false;
    if (this.s.value >= this.cfg.max) this.s.last = Date.now();
    this.s.value -= n; this.emit(); return true;
  }
  grantFromAd(): boolean {
    this.tick();
    if (this.adsLeft <= 0) return false;
    this.s.adsUsed++; this.s.value += this.cfg.adAmount; this.emit(); return true;
  }
  /** Görev ödülü gibi reklamsız ek hak (üst sınırı aşabilir). */
  bonus(n = 1) { this.tick(); this.s.value += n; this.emit(); }
  reset() { this.s = { value: this.cfg.max, last: Date.now(), adsDay: dayKey(), adsUsed: 0, grantDay: dayKey() }; this.emit(); }

  subscribe = (cb: () => void) => { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; };
  getSnapshot = () => this.snapshot;
}

export function useEnergy(e: Energy) {
  useSyncExternalStore(e.subscribe, e.getSnapshot);
  return e;
}
