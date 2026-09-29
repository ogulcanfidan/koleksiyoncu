// Kural tabanlı eşya ve müşteri üretici. Her sahte eşya, oyuncunun sahip olduğu aletlerle
// görülebilecek en az bir kural ihlali taşır; gerçek eşyalar hiçbir kuralı çiğnemez.
import { createRng, type Rng } from "../../shared/src/random.ts";
import {
  ARTISTS, PIGMENTS, RULERS, RULES, TELLS_BY_CAT, WATCH_MAKERS, WATCH_WEIGHT,
} from "./catalog.ts";
import { detectable, violations } from "./rules.ts";
import type {
  Category, CoinItem, Customer, DayPlan, Edge, Hallmark, Item, Material, PaintingItem, Personality,
  PigmentId, TellId, ToolId, WatchItem,
} from "./types.ts";

const HALLMARKS: Hallmark[] = ["shield", "anchor", "star", "gear", "lily", "crown", "key", "sun"];
const EDGES: Edge[] = ["reeded", "plain", "lettered"];
const ALL_PIGMENTS = Object.keys(PIGMENTS) as PigmentId[];

const FIRST_F = ["Ada", "Elif", "Maria", "Sofia", "Leyla", "Nora", "Irina", "Yuki", "Amara", "Clara", "Lucía", "Hana", "Zeynep", "Ines", "Mira", "Aylin"];
const FIRST_M = ["Emir", "Luca", "Mateo", "Karim", "Omar", "Jonas", "Arjun", "Kenji", "Tomás", "Viktor", "Selim", "Pavel", "Rafael", "Idris", "Leon", "Can"];
const LAST = ["Demir", "Novak", "Rossi", "Haddad", "Silva", "Kaya", "Moreau", "Ivanova", "Tanaka", "Okafor", "García", "Weber", "Aksoy", "Costa", "Lindgren", "Petrov"];

export type GenContext = {
  seed: number;
  dayNo: number;
  cats: Category[];          // açılmış katalog ciltleri
  tools: ToolId[];           // sahip olunan aletler
  reputation: number;        // 0-100, daha iyi müşteri ve daha değerli eşya
  tier?: number;             // rütbe: hangi ustaların eşyaları gelebilir (varsayılan: hepsi)
  cash?: number;             // oyuncunun kasası: eşyaların çoğu buna uygun fiyatta gelir
};

const between = (r: Rng, a: number, b: number) => a + r.next() * (b - a);
const round1 = (n: number) => Math.round(n * 10) / 10;

// ---------- Gerçek eşya üretimi ----------
function genuineWatch(r: Rng, tier = 9): WatchItem {
  const m = r.pick(WATCH_MAKERS.filter(x => x.tier <= tier));
  let year = r.int(m.from, m.to);
  let material = r.pick(m.materials);
  if (material === "steel" && year < RULES.steelFrom) year = r.int(Math.max(RULES.steelFrom, m.from), m.to);
  const lume = year >= RULES.lumeFrom && r.chance(0.5);
  const [wMin, wMax] = WATCH_WEIGHT[material];
  return {
    cat: "watch", makerId: m.id, year, hallmark: m.hallmark,
    serial: `${m.serialPrefix}-${r.int(10000, 99999)}`, jewels: r.int(m.jewels[0], m.jewels[1]),
    material, looksLike: material, lume, weight: r.int(wMin, wMax), numerals: m.numerals, dialHue: r.int(0, 3),
  };
}

function genuineCoin(r: Rng, tier = 9): CoinItem {
  const k = r.pick(RULERS.filter(x => x.tier <= tier));
  return {
    cat: "coin", rulerId: k.id, year: r.int(k.from, k.to), mint: k.mint, edge: k.edge,
    diameter: round1(k.diameter + between(r, -0.2, 0.2)), weight: round1(k.weight + between(r, -0.2, 0.2)),
    metal: k.metal, looksLike: k.metal,
  };
}

function genuinePainting(r: Rng, tier = 9): PaintingItem {
  const a = r.pick(ARTISTS.filter(x => x.tier <= tier));
  const year = r.int(a.activeFrom, a.activeTo);
  const allowed = ALL_PIGMENTS.filter(p => PIGMENTS[p].from <= year);
  const pigments = r.shuffle(allowed).slice(0, r.int(4, 5));
  return {
    cat: "painting", artistId: a.id, year, corner: a.corner, canvas: a.canvas, pigments,
    uvSignature: false, scene: r.int(0, 999999), palette: r.int(0, 4),
  };
}

// ---------- Sahtelik uygulama ----------
function applyTell(item: Item, tell: TellId, r: Rng): Item {
  const it = structuredClone(item);
  if (it.cat === "watch") {
    const m = WATCH_MAKERS.find(x => x.id === it.makerId)!;
    switch (tell) {
      case "w.year": it.year = r.chance(0.5) ? m.to + r.int(3, 25) : m.from - r.int(3, 30); break;
      case "w.hallmark": it.hallmark = r.pick(HALLMARKS.filter(h => h !== m.hallmark)); break;
      case "w.serial": {
        const other = r.pick(WATCH_MAKERS.filter(x => x.id !== m.id));
        it.serial = `${other.serialPrefix}-${r.int(10000, 99999)}`; break;
      }
      case "w.jewels": it.jewels = r.chance(0.5) ? m.jewels[1] + r.int(2, 6) : Math.max(1, m.jewels[0] - r.int(2, 6)); break;
      case "w.material": {
        const opts = (["gold", "silver", "nickel", "steel"] as Material[]).filter(x => !m.materials.includes(x) && !(x === "steel" && it.year < RULES.steelFrom));
        const mat = r.pick(opts.length ? opts : ["nickel"] as Material[]);
        it.material = mat; it.looksLike = mat; it.weight = r.int(...WATCH_WEIGHT[mat]); break;
      }
      case "w.plated": {
        const look = m.materials.includes("gold") ? "gold" : "silver";
        it.looksLike = look; it.material = "brass"; it.weight = r.int(...WATCH_WEIGHT.brass); break;
      }
      case "w.steelEra": {
        it.material = "steel"; it.looksLike = "steel"; it.weight = r.int(...WATCH_WEIGHT.steel);
        if (it.year >= RULES.steelFrom) it.year = r.int(Math.max(m.from, 1880), RULES.steelFrom - 1);
        break;
      }
      case "w.lumeEra": {
        it.lume = true;
        if (it.year >= RULES.lumeFrom) it.year = r.int(m.from, Math.min(m.to, RULES.lumeFrom - 1));
        break;
      }
    }
    return it;
  }
  if (it.cat === "coin") {
    const k = RULERS.find(x => x.id === it.rulerId)!;
    switch (tell) {
      case "c.year": it.year = r.chance(0.5) ? k.to + r.int(2, 20) : k.from - r.int(2, 20); break;
      case "c.mint": it.mint = r.pick(["V", "T", "L", "N", "A", "K", "M"].filter(x => x !== k.mint)); break;
      case "c.edge": it.edge = r.pick(EDGES.filter(e => e !== k.edge)); break;
      case "c.diameter": it.diameter = round1(k.diameter + (r.chance(0.5) ? 1 : -1) * between(r, 1.2, 3)); break;
      case "c.weight": it.weight = round1(k.weight * between(r, 0.78, 0.9)); break;
      case "c.metal": {
        it.metal = "brass"; it.looksLike = k.metal;
        it.weight = round1(k.weight * between(r, 0.72, 0.86)); break;
      }
    }
    return it;
  }
  const a = ARTISTS.find(x => x.id === it.artistId)!;
  switch (tell) {
    case "p.year": it.year = r.chance(0.6) ? a.activeTo + r.int(4, 40) : a.activeFrom - r.int(3, 15); break;
    case "p.corner": it.corner = a.corner === "bl" ? "br" : "bl"; break;
    case "p.canvas": it.canvas = r.chance(0.6) ? "synthetic" : (a.canvas === "linen" ? "jute" : "linen"); break;
    case "p.pigment": {
      const late = ALL_PIGMENTS.filter(p => PIGMENTS[p].from > it.year);
      if (late.length === 0) { it.year = Math.max(a.activeFrom, 1830); return applyTell(it, tell, r); }
      it.pigments = r.shuffle([...it.pigments.slice(0, 3), r.pick(late)]);
      break;
    }
    case "p.uvSignature": it.uvSignature = true; break;
  }
  // Pigment ihlali dışındaki durumlarda yıl değiştiyse, paletteki pigmentler yeni yıla uysun.
  if (tell !== "p.pigment") it.pigments = it.pigments.filter(p => PIGMENTS[p].from <= it.year).concat(it.pigments.length < 3 ? ["leadWhite", "ochre"] as PigmentId[] : []).slice(0, 5);
  return it;
}

// ---------- Değer ----------
const BASE: Record<Category, number> = { watch: 1400, coin: 500, painting: 7000 };

function prestigeOf(item: Item): number {
  if (item.cat === "watch") return WATCH_MAKERS.find(m => m.id === item.makerId)!.prestige * (item.material === "gold" ? 1.6 : 1);
  if (item.cat === "coin") { const k = RULERS.find(x => x.id === item.rulerId)!; return k.prestige * (k.metal === "gold" ? 2.4 : 1); }
  return ARTISTS.find(a => a.id === item.artistId)!.prestige;
}

function marketValue(item: Item, r: Rng, rep: number, dayNo: number): number {
  const repBoost = 1 + rep / 200; // itibar arttıkça daha değerli eşyalar gelir
  // İlk günlerde eşyalar daha ucuz: başlangıç kasasıyla alınabilsin, oyuncu erken tıkanmasın.
  const early = 0.5 + Math.min(0.5, Math.max(0, dayNo - 1) * 0.05);
  const v = BASE[item.cat] * prestigeOf(item) * between(r, 0.8, 1.3) * repBoost * early;
  return Math.round(v / 10) * 10;
}

// ---------- Müşteri ----------
const PERSONALITY_WEIGHTS: [Personality, number][] = [["normal", 5], ["greedy", 2], ["desperate", 2], ["clueless", 1.2]];
function pickPersonality(r: Rng): Personality {
  const total = PERSONALITY_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let x = r.next() * total;
  for (const [p, w] of PERSONALITY_WEIGHTS) { if ((x -= w) < 0) return p; }
  return "normal";
}

const ASK_MID: Record<Personality, number> = { normal: 0.82, greedy: 1.05, desperate: 0.6, clueless: 0.3 };

function makeCustomer(ctx: GenContext, r: Rng, idx: number, forceFake: boolean | null): Customer {
  const genuine = forceFake == null ? r.chance(0.55) : !forceFake;
  const personality = pickPersonality(r);
  // Çoğu eşya kasaya uygun gelsin; dörtte biri "hevesle bakılacak" pahalı parça olabilir.
  const limit = ctx.cash == null ? Infinity : Math.max(900, ctx.cash * (r.chance(0.25) ? 2.2 : 0.8));
  let cat: Category = r.pick(ctx.cats);
  let item: Item = genuineWatch(r, ctx.tier);
  let claimed = 0;
  for (let attempt = 0; attempt < 8; attempt++) {
    cat = r.pick(ctx.cats);
    item = cat === "watch" ? genuineWatch(r, ctx.tier) : cat === "coin" ? genuineCoin(r, ctx.tier) : genuinePainting(r, ctx.tier);
    claimed = marketValue(item, r, ctx.reputation, ctx.dayNo);
    if (claimed * ASK_MID[personality] <= limit) break;
  }
  let tells: TellId[] = [];

  if (!genuine) {
    const usable = TELLS_BY_CAT[cat].filter(t => detectable(t, ctx.tools));
    // İlk günlerde sahteler iki kusurla gelir (daha kolay), sonra tek kusur.
    const count = ctx.dayNo <= 3 ? 2 : ctx.dayNo <= 8 && r.chance(0.4) ? 2 : 1;
    const base = item;
    // Kusurlar birbirini bozabilir (ör. yıl iki kez değişir); görülebilir bir ihlal kalana dek yeniden dene.
    for (let attempt = 0; attempt < 20; attempt++) {
      item = base;
      for (const tell of r.shuffle(usable).slice(0, count)) item = applyTell(item, tell, r);
      tells = violations(item);
      if (tells.some(t => detectable(t, ctx.tools))) break;
    }
  }

  const trueValue = genuine ? claimed : Math.round(claimed * between(r, 0.04, 0.12) / 10) * 10;
  // Satıcılar genelde değerin altında ister; kârı pazarlık ve doğru göz getirir.
  const askFactor = { normal: between(r, 0.72, 0.92), greedy: between(r, 0.95, 1.15), desperate: between(r, 0.5, 0.7), clueless: between(r, 0.2, 0.4) }[personality];
  const minFactor = { normal: between(r, 0.72, 0.85), greedy: between(r, 0.86, 0.95), desperate: between(r, 0.55, 0.7), clueless: between(r, 0.6, 0.8) }[personality];
  const ask = Math.max(50, Math.round((claimed * askFactor) / 10) * 10);
  const gender = r.pick(["f", "m"] as const);
  const name = `${r.pick(gender === "f" ? FIRST_F : FIRST_M)} ${r.pick(LAST)}`;
  return {
    id: `${ctx.dayNo}-${idx}`,
    name, gender,
    avatarSeed: r.int(1, 1e9),
    age: r.pick(["young", "adult", "adult", "old", "old"] as const),
    personality,
    item,
    claimsUnknown: personality === "clueless",
    ask,
    minAccept: Math.round((ask * minFactor) / 10) * 10,
    patience: personality === "greedy" ? 2 : personality === "desperate" ? 4 : 3,
    genuine,
    trueValue,
    tells,
    lineKey: `line.${cat}.${personality}.${r.int(1, 3)}`,
  };
}

export function customersPerDay(dayNo: number) { return dayNo <= 2 ? 5 : dayNo <= 10 ? 6 : 7; }

export function generateDay(ctx: GenContext): DayPlan {
  const r = createRng(ctx.seed);
  const n = customersPerDay(ctx.dayNo);
  // Günde en az bir gerçek, en az bir sahte olsun.
  const forced: (boolean | null)[] = Array.from({ length: n }, () => null);
  forced[0] = false; forced[1] = true;
  const order = r.shuffle(forced);
  const customers = order.map((f, i) => makeCustomer(ctx, r, i, f));
  return { seed: ctx.seed, dayNo: ctx.dayNo, customers };
}

/** Öğretici gün: el ile ayarlanmış iki müşteri (bir gerçek, bir sahte saat). */
export function tutorialDay(): DayPlan {
  const r = createRng(424242);
  const real: WatchItem = { cat: "watch", makerId: "halden", year: 1896, hallmark: "anchor", serial: "HB-41207", jewels: 11, material: "silver", looksLike: "silver", lume: false, weight: 82, numerals: "roman", dialHue: 0 };
  const fake: WatchItem = { cat: "watch", makerId: "vermeulen", year: 1924, hallmark: "shield", serial: "VF-73311", jewels: 16, material: "gold", looksLike: "gold", lume: false, weight: 104, numerals: "roman", dialHue: 1 };
  const base = (item: WatchItem, genuine: boolean, i: number): Customer => ({
    id: `tut-${i}`, name: i === 0 ? "Nora Weber" : "Viktor Petrov", gender: i === 0 ? "f" : "m", avatarSeed: 1000 + i,
    age: i === 0 ? "old" : "adult", personality: "normal", item, claimsUnknown: false,
    ask: genuine ? 1200 : 4800, minAccept: genuine ? 950 : 4000, patience: 3, genuine,
    trueValue: genuine ? 1500 : 300, tells: violations(item), lineKey: i === 0 ? "line.tutorial.1" : "line.tutorial.2",
  });
  void r;
  return { seed: 424242, dayNo: 0, customers: [base(real, true, 0), base(fake, false, 1)] };
}
