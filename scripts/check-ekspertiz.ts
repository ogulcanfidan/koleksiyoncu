// Ekspertiz üreticisini binlerce günle dener:
//  - gerçek eşyalar hiçbir kuralı çiğnememeli
//  - sahte eşyaların en az bir ihlali oyuncunun aletleriyle görülebilmeli
//  - her günde en az bir gerçek ve bir sahte olmalı
import { generateDay } from "../src/game/generate.ts";
import { detectable, violations } from "../src/game/rules.ts";
import { ARTISTS, RULERS, WATCH_MAKERS } from "../src/game/catalog.ts";
import type { Category, TellId, ToolId } from "../src/game/types.ts";

const toolSets: ToolId[][] = [["loupe"], ["loupe", "scale"], ["loupe", "scale", "caliper", "touchstone"], ["loupe", "scale", "caliper", "touchstone", "uv", "pigment"]];
const catSets: Category[][] = [["watch"], ["watch", "coin"], ["watch", "coin", "painting"]];

let items = 0, fakes = 0, fails = 0;
const tellCount = new Map<TellId, number>();
for (let seed = 1; seed <= 3000; seed++) {
  const tools = toolSets[seed % toolSets.length];
  const cats = catSets[seed % catSets.length];
  const tier = seed % 5;
  const day = generateDay({ seed, dayNo: (seed % 20) + 1, cats, tools, reputation: seed % 100, tier });
  for (const c of day.customers) {
    const it = c.item;
    const id = it.cat === "watch" ? it.makerId : it.cat === "coin" ? it.rulerId : it.artistId;
    const ent = [...WATCH_MAKERS, ...RULERS, ...ARTISTS].find(x => x.id === id)!;
    if (ent.tier > tier) { fails++; console.error("kilitli usta geldi", seed, id, tier); }
  }
  if (!day.customers.some(c => c.genuine) || !day.customers.some(c => !c.genuine)) { fails++; console.error("gün dengesiz", seed); }
  for (const c of day.customers) {
    items++;
    const v = violations(c.item);
    if (!cats.includes(c.item.cat)) { fails++; console.error("kilitli kategori", seed, c.item.cat); }
    if (c.genuine && v.length) { fails++; console.error("gerçek eşyada ihlal", seed, v, c.item); }
    if (!c.genuine) {
      fakes++;
      v.forEach(t => tellCount.set(t, (tellCount.get(t) || 0) + 1));
      if (!v.some(t => detectable(t, tools))) { fails++; console.error("görünmez sahte", seed, v, tools, c.item); }
    }
    if (c.minAccept > c.ask || c.ask <= 0) { fails++; console.error("fiyat hatası", seed, c.ask, c.minAccept); }
  }
}
console.log(`${items} eşya, ${fakes} sahte denendi. Hata: ${fails}`);
console.log("İhlal dağılımı:", Object.fromEntries([...tellCount].sort((a, b) => b[1] - a[1])));
if (fails) process.exit(1);
