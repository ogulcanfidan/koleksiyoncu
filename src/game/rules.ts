// Bir eşyanın hangi kuralları çiğnediğini hesaplayan "gerçeklik" fonksiyonu.
// Üretici bu fonksiyonla kendini denetler; gün sonu raporu da açıklamaları buradan alır.
import {
  COIN_TOLERANCE, PIGMENTS, RULES, TELL_TOOLS, WATCH_WEIGHT,
  artistById, makerById, rulerById,
} from "./catalog.ts";
import type { CoinItem, Item, PaintingItem, TellId, ToolId, WatchItem } from "./types.ts";

export function violations(item: Item): TellId[] {
  switch (item.cat) {
    case "watch": return watchViolations(item);
    case "coin": return coinViolations(item);
    case "painting": return paintingViolations(item);
  }
}

function watchViolations(w: WatchItem): TellId[] {
  const m = makerById(w.makerId);
  const out: TellId[] = [];
  if (w.year < m.from || w.year > m.to) out.push("w.year");
  if (w.hallmark !== m.hallmark) out.push("w.hallmark");
  if (!w.serial.startsWith(m.serialPrefix + "-")) out.push("w.serial");
  if (w.jewels < m.jewels[0] || w.jewels > m.jewels[1]) out.push("w.jewels");
  if (w.material !== w.looksLike) out.push("w.plated");
  else if (!m.materials.includes(w.material)) out.push("w.material");
  if (w.material === "steel" && w.year < RULES.steelFrom) out.push("w.steelEra");
  if (w.lume && w.year < RULES.lumeFrom) out.push("w.lumeEra");
  return out;
}

function coinViolations(c: CoinItem): TellId[] {
  const r = rulerById(c.rulerId);
  const out: TellId[] = [];
  if (c.year < r.from || c.year > r.to) out.push("c.year");
  if (c.mint !== r.mint) out.push("c.mint");
  if (c.edge !== r.edge) out.push("c.edge");
  if (Math.abs(c.diameter - r.diameter) > COIN_TOLERANCE.diameter) out.push("c.diameter");
  if (Math.abs(c.weight - r.weight) > COIN_TOLERANCE.weight) out.push("c.weight");
  if (c.metal !== r.metal) out.push("c.metal");
  return out;
}

function paintingViolations(p: PaintingItem): TellId[] {
  const a = artistById(p.artistId);
  const out: TellId[] = [];
  if (p.year < a.activeFrom || p.year > a.activeTo) out.push("p.year");
  if (p.corner !== a.corner) out.push("p.corner");
  if (p.canvas !== a.canvas || (p.canvas === "synthetic" && p.year < RULES.syntheticCanvasFrom)) out.push("p.canvas");
  if (p.pigments.some(id => PIGMENTS[id].from > p.year)) out.push("p.pigment");
  if (p.uvSignature) out.push("p.uvSignature");
  return out;
}

/** Oyuncunun elindeki aletlerle bu ihlal görülebilir mi? */
export function detectable(tell: TellId, owned: readonly ToolId[]): boolean {
  return TELL_TOOLS[tell].some(t => t === "eye" || owned.includes(t));
}

/** Bir sahte eşyanın en az bir ihlali mevcut aletlerle görülebiliyor mu? */
export function isFair(item: Item, owned: readonly ToolId[]): boolean {
  const v = violations(item);
  return v.length === 0 || v.some(t => detectable(t, owned));
}

/** Ağırlık aralığı yardımcı (UI'da terazinin "normal mi" göstergesi için değil, sadece üretim için). */
export function watchWeightRange(m: WatchItem["material"]) { return WATCH_WEIGHT[m]; }
