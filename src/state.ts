// Ekspertiz oyun durumu: kalıcı kayıt + gün akışı.
import { useSyncExternalStore } from "react";
import { load, save, remove, dayKey } from "@shared/src/storage";
import { createRng, hashString } from "@shared/src/random";
import { Energy } from "@shared/src/energy";
import { Progress } from "@shared/src/progress";
import { scheduleReminder } from "@shared/src/notify";
import { t } from "@shared/src/i18n";
import { ARTISTS, CATALOGS, RANKS, RULERS, TOOLS, WATCH_MAKERS, rankIndex } from "./game/catalog";
import { DailyQuests, type QuestDef, type Reward } from "@shared/src/quests";
import { generateDay, tutorialDay } from "./game/generate";
import type { Category, Customer, DayPlan, Item, ToolId } from "./game/types";
import { setAdFree, isAdFree } from "@shared/src/ads";
import type { ProductDef } from "@shared/src/store";
import { ACHIEVEMENTS } from "./achievements";

export const SHOP_OPEN = 9 * 60;   // 09:00
export const SHOP_CLOSE = 18 * 60; // 18:00
export const GREETING_MINUTES = 15; // her müşteriyle konuşma süresi

export type Decision = {
  customerId: string;
  action: "buy" | "reject" | "walked";   // walked: pazarlıkta anlaşılamadı, satıcı gitti
  price: number;
  correct: boolean;
  /** Kasası satıcının en düşük fiyatına bile yetmediği için gerçek bir eseri geçti: ne doğru ne yanlış sayılır. */
  neutral?: boolean;
  seconds: number;
  tools: ToolId[];
};

export type DayRun = {
  plan: DayPlan;
  tutorial: boolean;
  idx: number;
  clock: number;              // dakika
  decisions: Decision[];
  customerStartedAt: number;  // gerçek zaman (ms)
  usedTools: ToolId[];        // mevcut müşteri için
  dayStartedAt: number;
};

export type DaySummary = {
  dayNo: number;
  tutorial: boolean;
  rows: { customer: Customer; decision: Decision | null; sale: number; collectKey: string | null; kept?: boolean }[];
  spent: number;
  earned: number;
  repDelta: number;
  correct: number;
  total: number;
  seconds: number;
  score: number;
  vitrine: number;             // koleksiyonun bugün getirdiği gelir
  kept?: number;               // bugün vitrine konan eserlerin değeri (kâra dahil edilir)
  rankUp: number | null;       // yeni rütbe indeksi
};

/** Koleksiyondaki bir parça: her ustadan/hükümdardan/ressamdan bir gerçek eser. */
export type CollectionEntry = { item: Item; day: number; paid: number; value: number };

type Save = {
  installId: number;
  money: number;
  reputation: number;
  tools: ToolId[];
  cats: Category[];
  dayNo: number;
  tutorialDone: boolean;
  run: DayRun | null;
  lastSummary: DaySummary | null;
  collection: Record<string, CollectionEntry>;   // anahtar: "watch:halden"
  setsDone: Category[];
  introSeen: boolean;
  premiumDay: string;          // reklamsız paketin günlük anahtarlarının son verildiği gün
};

const KEY = "eks-save-v1";
const initial = (): Save => ({
  installId: Math.floor(Math.random() * 1e9),
  money: 2000, reputation: 20, tools: ["loupe"], cats: ["watch"], dayNo: 0,
  tutorialDone: false, run: null, lastSummary: null, collection: {}, setsDone: [], introSeen: false, premiumDay: "",
});

let s: Save = load<Save>(KEY, initial());
let snap = 0;
const listeners = new Set<() => void>();
function emit() { save(KEY, s); snap++; listeners.forEach(l => l()); }
export function useGame() {
  useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => snap);
  return s;
}
export const game = () => s;

// ---------- Paylaşılan sistemler ----------
export const keys = new Energy({ key: "eks-keys", max: 3, mode: "regen", regenMinutes: 120, adMaxPerDay: 3, adAmount: 1 });
export const progress = new Progress("eks-progress", ACHIEVEMENTS, { parSeconds: 45 });

// ---------- Rütbe ----------
/** Deneyim: doğru kararlar, kusursuz günler ve hazineler. */
export function xp(): number {
  return progress.stat("correct") * 10 + progress.stat("perfectDays") * 40 + progress.stat("treasures") * 25 + progress.stat("questsDone") * 15;
}
export function rank(): number { return rankIndex(xp()); }
export function rankProgress(): { cur: number; next: number | null; value: number } {
  const i = rank(), v = xp();
  const next = RANKS[i + 1]?.xp ?? null;
  return { cur: RANKS[i].xp, next, value: v };
}
// ---------- Koleksiyon ----------
export const SET_REWARD = { money: 2000, rep: 5 };
/** Vitrindeki her parça, açılan her gün değerinin bu oranı kadar gelir getirir (müze ziyaretçileri). */
export const VITRINE_RATE = 0.03;
export const COLLECTION_SIZE = 18;

export function collectionKey(it: Item): string {
  return `${it.cat}:${it.cat === "watch" ? it.makerId : it.cat === "coin" ? it.rulerId : it.artistId}`;
}
export function collectionValue(): number {
  return Object.values(s.collection).reduce((a, e) => a + e.value, 0);
}
export function vitrineIncome(): number {
  return Math.round((collectionValue() * VITRINE_RATE) / 10) * 10;
}

/**
 * Gün sonu raporunda gerçek bir eseri müzayedeye göndermek yerine vitrine koyar.
 * Müzayede geliri geri alınır. Bir kategori tamamlanırsa ödül verilir; tamamlanan kategori döner.
 */
export function keepInCollection(customerId: string): { ok: boolean; setDone: Category | null } {
  const sum = s.lastSummary;
  const row = sum?.rows.find(r => r.customer.id === customerId);
  if (!sum || !row || !row.collectKey || row.kept || s.collection[row.collectKey]) return { ok: false, setDone: null };
  s.money -= row.sale; sum.earned -= row.sale;
  s.collection = { ...s.collection, [row.collectKey]: { item: row.customer.item, day: Math.max(1, sum.dayNo), paid: row.decision?.price ?? 0, value: row.customer.trueValue } };
  row.kept = true; row.sale = 0; sum.kept = (sum.kept ?? 0) + row.customer.trueValue;
  // Aynı ustadan ikinci bir eser aynı gün geldiyse artık vitrine konamaz.
  for (const r of sum.rows) if (r !== row && r.collectKey === row.collectKey) r.collectKey = null;
  let setDone: Category | null = null;
  const sets: [Category, { id: string }[]][] = [["watch", WATCH_MAKERS], ["coin", RULERS], ["painting", ARTISTS]];
  for (const [cat, list] of sets) {
    if (!s.setsDone.includes(cat) && list.every(x => s.collection[`${cat}:${x.id}`])) {
      s.setsDone = [...s.setsDone, cat]; setDone = cat;
      s.money += SET_REWARD.money; s.reputation = Math.min(100, s.reputation + SET_REWARD.rep);
    }
  }
  progress.max("stamps", Object.keys(s.collection).length);
  progress.max("setsDone", s.setsDone.length);
  progress.max("collectionValue", collectionValue());
  progress.commit();
  emit();
  return { ok: true, setDone };
}

export function markIntroSeen() { s.introSeen = true; emit(); }

// ---------- Mağaza (uygulama içi satın alma) ----------
export const PRODUCTS: ProductDef[] = [
  // Gerçek fiyatlar Play Console'da ayarlanır (TR: 184 TL / 28,90 TL / 68,90 TL). Bunlar yalnızca test modunda görünür.
  { id: "collector_ad_free", consumable: false, fallbackPrice: "₺184,00" },
  { id: "keys_5", consumable: true, fallbackPrice: "₺28,90" },
  { id: "keys_15", consumable: true, fallbackPrice: "₺68,90" },
];
/** Reklamsız pakette her gün kendiliğinden verilen anahtar. */
export const PREMIUM_DAILY_KEYS = 3;
/** Reklamsız paket sahibine günün 3 anahtarını (günde bir kez) verir. Verildiyse true. */
export function claimPremiumDaily(): boolean {
  if (!isAdFree() || s.premiumDay === dayKey()) return false;
  s.premiumDay = dayKey(); keys.bonus(PREMIUM_DAILY_KEYS); emit();
  return true;
}
/** Satın alma ya da geri yükleme sonrası ürünü teslim eder. */
export function deliverProduct(id: string) {
  if (id === "collector_ad_free") { setAdFree(true); emit(); claimPremiumDaily(); }
  if (id === "keys_5") keys.bonus(5);
  if (id === "keys_15") keys.bonus(15);
}
export const adFree = () => isAdFree();

// ---------- Günlük görevler ----------
const QUESTS: QuestDef[] = [
  { id: "fakes2", icon: "🕵️", stat: "fakesCaught", goal: 2, reward: { kind: "money", amount: 300, icon: "🪙" } },
  { id: "genuine2", icon: "🏺", stat: "genuineBought", goal: 2, reward: { kind: "money", amount: 300, icon: "🪙" } },
  { id: "bargain1", icon: "🤝", stat: "bargains", goal: 1, reward: { kind: "money", amount: 400, icon: "🪙" } },
  { id: "fast3", icon: "⚡", stat: "fastCorrect", goal: 3, reward: { kind: "money", amount: 300, icon: "🪙" } },
  { id: "tools6", icon: "🔧", stat: "toolUses", goal: 6, reward: { kind: "money", amount: 200, icon: "🪙" } },
  { id: "days2", icon: "🗝️", stat: "days", goal: 2, reward: { kind: "keys", amount: 1, icon: "🗝️" } },
  { id: "perfect1", icon: "💎", stat: "perfectDays", goal: 1, reward: { kind: "keys", amount: 1, icon: "🗝️" } },
  { id: "profit1500", icon: "💰", stat: "profitTotal", goal: 1500, reward: { kind: "money", amount: 500, icon: "🪙" } },
  { id: "correct8", icon: "✅", stat: "correct", goal: 8, reward: { kind: "money", amount: 400, icon: "🪙" } },
];
function grant(r: Reward) {
  if (r.kind === "money") { s.money += r.amount; emit(); }
  if (r.kind === "keys") { for (let i = 0; i < r.amount; i++) keys.bonus(); }
}
export const quests = new DailyQuests("eks-quests", QUESTS, progress, { kind: "keys", amount: 1, icon: "🗝️" }, grant);

export function refreshReminder() {
  scheduleReminder(1001, keys.value < keys.cfg.max ? keys.fullAt() : null, t("notif.title"), t("notif.body"));
}

// ---------- Dükkân ----------
export function buyTool(id: ToolId): boolean {
  const tool = TOOLS.find(x => x.id === id)!;
  if (s.tools.includes(id) || s.money < tool.price) return false;
  s.money -= tool.price; s.tools = [...s.tools, id];
  progress.max("toolsOwned", s.tools.length - 1); progress.commit();
  emit(); return true;
}
export function buyCatalog(cat: Category): boolean {
  const c = CATALOGS.find(x => x.cat === cat)!;
  if (s.cats.includes(cat) || s.money < c.price) return false;
  s.money -= c.price; s.cats = [...s.cats, cat];
  progress.max("catalogs", s.cats.length - 1); progress.commit();
  emit(); return true;
}

// ---------- Gün akışı ----------
export function startTutorial() {
  s.run = { plan: tutorialDay(), tutorial: true, idx: 0, clock: SHOP_OPEN, decisions: [], customerStartedAt: Date.now(), usedTools: [], dayStartedAt: Date.now() };
  emit();
}

export function startDay(): boolean {
  if (s.run) return true;
  if (!keys.spend()) return false;
  const dayNo = s.dayNo + 1;
  const seed = hashString(`${s.installId}:${dayNo}`);
  const plan = generateDay({ seed, dayNo, cats: s.cats, tools: s.tools, reputation: s.reputation, tier: rank(), cash: s.money });
  s.run = { plan, tutorial: false, idx: 0, clock: SHOP_OPEN, decisions: [], customerStartedAt: Date.now(), usedTools: [], dayStartedAt: Date.now() };
  refreshReminder();
  emit(); return true;
}

export function currentCustomer(): Customer | null {
  const r = s.run; if (!r) return null;
  return r.plan.customers[r.idx] ?? null;
}

/** Alet kullanımı dükkân saatinden dakika harcar. */
export function applyTool(id: ToolId) {
  const r = s.run; if (!r) return;
  const tool = TOOLS.find(x => x.id === id)!;
  if (!r.usedTools.includes(id)) {
    r.usedTools = [...r.usedTools, id];
    r.clock += tool.minutes;
    progress.add("toolUses");
    emit();
  }
}

function finishCustomer(action: Decision["action"], price: number) {
  const r = s.run!; const c = currentCustomer()!;
  const seconds = Math.min(600, (Date.now() - r.customerStartedAt) / 1000);
  const saidGenuine = action !== "reject";
  const correct = saidGenuine === c.genuine;
  const neutral = action === "reject" && c.genuine && s.money < c.minAccept;
  r.decisions.push({ customerId: c.id, action, price, correct, neutral, seconds, tools: r.usedTools });
  if (action === "buy") s.money -= price;
  r.clock += GREETING_MINUTES;
  r.idx++;
  r.usedTools = [];
  r.customerStartedAt = Date.now();
  emit();
}

export function decideReject() { finishCustomer("reject", 0); }
export function decideBuy(price: number) { finishCustomer("buy", price); }
export function decideWalked() { finishCustomer("walked", 0); }

/** Kapanış saati geçtiyse ya da müşteri kalmadıysa gün biter. */
export function dayIsOver(): boolean {
  const r = s.run; if (!r) return false;
  return r.idx >= r.plan.customers.length || r.clock >= SHOP_CLOSE;
}

/** Pazarlık: satıcı teklifi kabul eder mi, karşı teklifi ne olur? */
export function sellerResponse(c: Customer, offer: number, round: number): { accept: boolean; counter: number; leaves: boolean } {
  if (offer >= c.minAccept) return { accept: true, counter: offer, leaves: false };
  const leaves = round + 1 >= c.patience || offer < c.minAccept * 0.45;
  const rnd = createRng(`${c.id}:${round}`);
  const counter = Math.max(c.minAccept, Math.round(((c.ask + offer) / 2 + rnd.int(0, 3) * 10) / 10) * 10);
  return { accept: false, counter, leaves };
}

// ---------- Gün sonu ----------
export function closeDay(): DaySummary {
  const r = s.run!;
  const rng = createRng(r.plan.seed ^ 0x9e3779b9);
  let spent = 0, earned = 0, repDelta = 0, correct = 0, seconds = 0, score = 0;
  const neutralCount = r.decisions.filter(d => d.neutral).length;
  const judged = r.decisions.length - neutralCount;
  const rows = r.plan.customers.map(c => {
    const d = r.decisions.find(x => x.customerId === c.id) ?? null;
    let sale = 0;
    if (d) {
      seconds += d.seconds;
      if (d.correct) { correct++; score += 100 + Math.max(0, Math.round((45 - d.seconds) * 2)); repDelta += 2; }
      if (d.action === "buy") {
        spent += d.price;
        sale = c.genuine ? Math.round(c.trueValue * (1.0 + rng.next() * 0.4) / 10) * 10 : 0;
        earned += sale;
        if (!c.genuine) repDelta -= 6;
      }
      if (d.action === "reject" && c.genuine && !d.neutral) repDelta -= 1;
    }
    // Koleksiyonda henüz olmayan bir ustanın gerçek eseri alındıysa, raporda vitrine konabilir.
    const key = collectionKey(c.item);
    const collectKey = d?.action === "buy" && c.genuine && !s.collection[key] ? key : null;
    return { customer: c, decision: d, sale, collectKey };
  });
  // Aynı günde aynı ustadan iki eser geldiyse yalnızca ilki vitrin adayı olsun.
  const seenKeys = new Set<string>();
  for (const row of rows) {
    if (!row.collectKey) continue;
    if (seenKeys.has(row.collectKey)) row.collectKey = null; else seenKeys.add(row.collectKey);
  }

  // Vitrin geliri: koleksiyon her açılan gün küçük bir gelir getirir.
  const vitrine = r.tutorial ? 0 : vitrineIncome();
  earned += vitrine;

  const rankBefore = rank();
  const summary: DaySummary = {
    dayNo: r.plan.dayNo, tutorial: r.tutorial, rows, spent, earned, repDelta, correct,
    total: judged, seconds, score, vitrine, rankUp: null,
  };

  s.money += earned;
  // Kasa tamamen dibe vurursa oyuncu hiçbir şey alamaz hale gelir; küçük bir taban tutarı koru.
  if (s.money < 400) s.money = 400;
  if (!r.tutorial) {
    s.dayNo = r.plan.dayNo;
    s.reputation = Math.max(0, Math.min(100, s.reputation + repDelta));
    const p = progress;
    p.add("days");
    p.add("correct", correct);
    p.add("wrong", judged - correct);
    p.add("secondsOnCorrect", r.decisions.filter(d => d.correct).reduce((a, d) => a + d.seconds, 0));
    for (const row of rows) {
      const d = row.decision; if (!d) continue;
      const c = row.customer;
      if (!c.genuine && d.action === "reject") { p.add("fakesCaught"); if (d.tools.length === 0) p.add("fakeNoTool"); }
      if (!c.genuine && d.action === "buy") p.add("fakesBought");
      if (c.genuine && d.action === "buy") {
        p.add("genuineBought");
        if (d.price <= c.trueValue * 0.4) p.add("treasures");
        if (d.price <= c.ask * 0.7) p.add("bargains");
      }
      if (d.correct && d.seconds < 20) p.add("fastCorrect");
    }
    if (judged > 0 && correct === judged && r.decisions.length === r.plan.customers.length) p.add("perfectDays");
    const profit = earned - spent;
    if (profit > 0) p.add("profitTotal", profit);
    p.max("bestDayProfit", profit);
    p.max("reputationMax", s.reputation);
    p.max("moneyMax", s.money);
    p.touchStreak();
    p.recordSession({ day: dayKey(), correct, wrong: judged - correct, seconds: Math.round(seconds), score });
    p.commit();
    const rankAfter = rank();
    if (rankAfter > rankBefore) summary.rankUp = rankAfter;
    p.max("rankReached", rankAfter); p.commit();
  } else {
    s.tutorialDone = true;
  }
  s.lastSummary = summary;
  s.run = null;
  emit();
  return summary;
}

export function resetAllProgress() {
  remove(KEY); s = initial(); keys.reset(); progress.resetAll(); quests.reset(); emit();
}
