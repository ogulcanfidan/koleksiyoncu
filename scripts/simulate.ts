// Denge simülasyonu: ortalama bir oyuncunun 40 günlük ilerlemesi (para, alet, rütbe, koleksiyon).
// Kullanım: node --experimental-strip-types scripts/simulate.ts [isabet=0.85] [oyuncu sayısı=200]
import { generateDay } from "../src/game/generate.ts";
import { ARTISTS, CATALOGS, RANKS, RULERS, TOOLS, WATCH_MAKERS, rankIndex } from "../src/game/catalog.ts";
import { createRng } from "../shared/src/random.ts";
import type { Category, Item, ToolId } from "../src/game/types.ts";

const ACC = Number(process.argv[2] ?? 0.85);
const PLAYERS = Number(process.argv[3] ?? 200);
const DAYS = 40;
const VITRINE_RATE = 0.03;
const START_MONEY = 2500; // 2000 + öğretici kârı
const key = (it: Item) => `${it.cat}:${it.cat === "watch" ? it.makerId : it.cat === "coin" ? it.rulerId : it.artistId}`;

// Alışveriş sırası: saat aletleri → sikke kataloğu → sikke aletleri → tablo kataloğu → tablo aletleri
const PLAN: ({ tool: ToolId } | { cat: Category })[] = [
  { tool: "scale" }, { cat: "coin" }, { tool: "caliper" }, { tool: "touchstone" }, { cat: "painting" }, { tool: "uv" }, { tool: "pigment" },
];

type Row = { money: number; rank: number; coll: number; items: number; tools: number; cats: number; dayProfit: number };
const table: Row[][] = Array.from({ length: DAYS }, () => []);
const firstBuy: Record<string, number[]> = {};

for (let pl = 0; pl < PLAYERS; pl++) {
  const r = createRng(1000 + pl);
  let money = START_MONEY, rep = 20, correct = 0, perfect = 0, treasures = 0;
  const tools: ToolId[] = ["loupe"], cats: Category[] = ["watch"];
  const coll = new Map<string, number>();
  let planIdx = 0;
  for (let day = 1; day <= DAYS; day++) {
    const xp = correct * 10 + perfect * 40 + treasures * 25;
    const tier = rankIndex(xp);
    const plan = generateDay({ seed: pl * 1000 + day, dayNo: day, cats, tools, reputation: rep, tier, cash: money });
    let spent = 0, earned = 0, dayCorrect = 0, judged = 0;
    const keepCandidates: { k: string; value: number; sale: number }[] = [];
    for (const c of plan.customers) {
      const right = r.chance(ACC);
      const saysGenuine = right ? c.genuine : !c.genuine;
      if (!saysGenuine) {
        if (c.genuine && money < c.minAccept) continue; // tarafsız: parası yetmedi
        judged++; if (right) dayCorrect++;
        rep += right ? 2 : -1;
        continue;
      }
      // Pazarlık: ortalama bir oyuncu istenenin %85'ine yakın ödüyor ama satıcının alt sınırının altına inemez.
      const price = Math.max(c.minAccept, Math.round(c.ask * (0.75 + r.next() * 0.2) / 10) * 10);
      if (money < price) { if (c.genuine) continue; judged++; continue; }
      money -= price; spent += price; judged++;
      if (right) { dayCorrect++; rep += 2; } else rep -= 6;
      if (c.genuine) {
        const sale = Math.round(c.trueValue * (1.0 + r.next() * 0.4));
        if (price <= c.trueValue * 0.4) treasures++;
        const k = key(c.item);
        if (!coll.has(k) && !keepCandidates.some(x => x.k === k)) keepCandidates.push({ k, value: c.trueValue, sale });
        else earned += sale;
      }
    }
    // Vitrine koyma kararı: kasa rahatsa (alet planı bittiyse ya da 3000 üstü) koy, değilse sat.
    for (const kc of keepCandidates) {
      if (planIdx >= PLAN.length || money > 3000) coll.set(kc.k, kc.value); else earned += kc.sale;
    }
    const vitrine = Math.round([...coll.values()].reduce((a, v) => a + v, 0) * VITRINE_RATE);
    earned += vitrine;
    money += earned; if (money < 400) money = 400;
    rep = Math.max(0, Math.min(100, rep));
    correct += dayCorrect; if (judged > 0 && dayCorrect === judged) perfect++;
    // Alışveriş
    while (planIdx < PLAN.length) {
      const step = PLAN[planIdx];
      const price = "tool" in step ? TOOLS.find(x => x.id === step.tool)!.price : CATALOGS.find(x => x.cat === step.cat)!.price;
      if (money - price < 800) break; // biraz nakit tut
      money -= price;
      if ("tool" in step) tools.push(step.tool); else cats.push(step.cat);
      const name = "tool" in step ? step.tool : `katalog:${step.cat}`;
      (firstBuy[name] ||= []).push(day);
      planIdx++;
    }
    table[day - 1].push({ money, rank: rankIndex(correct * 10 + perfect * 40 + treasures * 25), coll: coll.size, items: plan.customers.length, tools: tools.length, cats: cats.length, dayProfit: earned - spent });
  }
}

const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
console.log(`İsabet %${ACC * 100}, ${PLAYERS} oyuncu (medyan değerler)`);
console.log("Gün | Kasa    | Günlük kâr | Rütbe          | Koleksiyon | Alet | Katalog");
for (const d of [1, 2, 3, 5, 7, 10, 14, 20, 25, 30, 35, 40]) {
  const rows = table[d - 1];
  const rk = med(rows.map(x => x.rank));
  console.log(`${String(d).padStart(3)} | ${String(med(rows.map(x => x.money))).padStart(7)} | ${String(med(rows.map(x => x.dayProfit))).padStart(10)} | ${RANKS[rk].id.padEnd(14)} | ${String(med(rows.map(x => x.coll))).padStart(5)}/18   | ${med(rows.map(x => x.tools))}/6  | ${med(rows.map(x => x.cats))}/3`);
}
console.log("\nİlk satın alma günü (medyan):", Object.fromEntries(Object.entries(firstBuy).map(([k, v]) => [k, `${med(v)} (${Math.round(v.length / PLAYERS * 100)}%)`])));
const done18 = table[DAYS - 1].filter(x => x.coll === 18).length;
console.log(`40. günde koleksiyonu tamamlayan: %${Math.round(done18 / PLAYERS * 100)}`);
void WATCH_MAKERS; void RULERS; void ARTISTS;
