// Dil dosyalarını yükler ve oyun verisinden metin üretir.
import { registerDicts, t, formatMoney, getLang, type Dict, type Lang } from "@shared/src/i18n";
import { PIGMENTS, RULES, artistById, makerById, rulerById } from "./game/catalog";
import type { Customer, Item, TellId } from "./game/types";
import type { CoinLabels } from "./components/ItemArt";

const shared = import.meta.glob<Dict>("../shared/locales/*.json", { eager: true, import: "default" });
const own = import.meta.glob<Dict>("./locales/*.json", { eager: true, import: "default" });
const all: Partial<Record<Lang, Dict>> = {};
for (const [path, dict] of Object.entries(shared)) { const l = path.match(/(\w+)\.json$/)![1] as Lang; all[l] = { ...(all[l] || {}), ...dict }; }
for (const [path, dict] of Object.entries(own)) { const l = path.match(/(\w+)\.json$/)![1] as Lang; all[l] = { ...(all[l] || {}), ...dict }; }
registerDicts(all);

export function rulerLabel(id: string) {
  const r = rulerById(id);
  const title = t(`title.${r.title}`);
  // Japonca ve Korecede unvan addan sonra gelir: "Aldric 国王"
  return getLang() === "ja" || getLang() === "ko" ? `${r.name} ${title}` : `${title} ${r.name}`;
}

export function coinLabels(item: Item): CoinLabels | undefined {
  if (item.cat !== "coin") return undefined;
  return { ruler: rulerLabel(item.rulerId), denomination: "I" };
}

export function itemName(item: Item): string {
  if (item.cat === "watch") return makerById(item.makerId).name;
  if (item.cat === "coin") return rulerLabel(item.rulerId);
  return artistById(item.artistId).name;
}

export function sellerLine(c: Customer): string {
  const it = c.item;
  return t(c.lineKey, {
    price: formatMoney(c.ask),
    year: it.year,
    maker: it.cat === "watch" ? makerById(it.makerId).name : "",
    ruler: it.cat === "coin" ? rulerLabel(it.rulerId) : "",
    artist: it.cat === "painting" ? artistById(it.artistId).name : "",
  });
}

export function tellText(tell: TellId, it: Item): string {
  if (it.cat === "watch") {
    const m = makerById(it.makerId);
    const v: Record<string, string | number> = {
      maker: m.name, from: m.from, to: m.to, year: it.year, prefix: m.serialPrefix, serial: it.serial,
      expected: t(`hallmarkl.${m.hallmark}`), actual: t(`hallmarkl.${it.hallmark}`), min: m.jewels[0], max: m.jewels[1], n: it.jewels,
      material: t(`matl.${it.material}`), looks: t(`matl.${it.looksLike}`), weight: it.weight,
    };
    return t(`tell.${tell}`, v);
  }
  if (it.cat === "coin") {
    const r = rulerById(it.rulerId);
    const v: Record<string, string | number> = {
      ruler: rulerLabel(r.id), realm: r.realm, from: r.from, to: r.to, year: it.year,
      expected: tell === "c.edge" ? t(`edgel.${r.edge}`) : tell === "c.mint" ? r.mint : tell === "c.diameter" ? r.diameter : r.weight,
      actual: tell === "c.edge" ? t(`edgel.${it.edge}`) : tell === "c.mint" ? it.mint : tell === "c.diameter" ? it.diameter : it.weight,
      metal: t(`matl.${it.looksLike}`),
    };
    return t(`tell.${tell}`, v);
  }
  const a = artistById(it.artistId);
  if (tell === "p.canvas" && it.canvas === "synthetic" && it.year < RULES.syntheticCanvasFrom) return t("tell.p.canvasSynthetic", { year: it.year });
  const late = it.pigments.find(p => PIGMENTS[p].from > it.year);
  const v: Record<string, string | number> = {
    artist: a.name, from: tell === "p.pigment" && late ? PIGMENTS[late].from : a.activeFrom, to: a.activeTo, year: it.year,
    expected: tell === "p.corner" ? t(`cornerl.${a.corner}`) : t(`canvasl.${a.canvas}`),
    actual: tell === "p.corner" ? t(`cornerl.${it.corner}`) : t(`canvasl.${it.canvas}`),
    pigment: late ? t(`pig.${late}`) : "",
  };
  return t(`tell.${tell}`, v);
}

export function clockLabel(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "watch:halden" → "Halden Brothers" */
export function stampName(stamp: string): string {
  const [cat, id] = stamp.split(":");
  if (cat === "watch") return makerById(id).name;
  if (cat === "coin") return rulerLabel(id);
  return artistById(id).name;
}