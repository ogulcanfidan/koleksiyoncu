// Oyunun kural kitabı: tüm ustalar, hükümdarlar ve ressamlar hayal ürünüdür.
// Malzeme ve pigment tarihleri ise gerçek dünyadaki yaklaşık icat/yaygınlaşma yıllarıdır.
import type { Canvas, Category, Corner, Edge, Hallmark, Material, PigmentId, TellId, ToolId } from "./types.ts";

export type WatchMaker = {
  id: string; tier: number; name: string; city: string; from: number; to: number;
  hallmark: Hallmark; materials: Material[]; jewels: [number, number];
  serialPrefix: string; numerals: "roman" | "arabic"; prestige: number;
};

export type Ruler = {
  id: string; tier: number; title: "king" | "queen" | "sultan" | "duke" | "emperor"; name: string; realm: string;
  from: number; to: number; metal: Material; diameter: number; edge: Edge; mint: string; weight: number; prestige: number;
};

export type Artist = {
  id: string; tier: number; name: string; born: number; died: number; activeFrom: number; activeTo: number;
  corner: Corner; canvas: Canvas; prestige: number;
};

export const WATCH_MAKERS: WatchMaker[] = [
  { id: "vermeulen", tier: 0, name: "Vermeulen & Fils", city: "Genève", from: 1842, to: 1911, hallmark: "shield", materials: ["gold", "silver"], jewels: [15, 17], serialPrefix: "VF", numerals: "roman", prestige: 1.6 },
  { id: "halden", tier: 0, name: "Halden Brothers", city: "London", from: 1868, to: 1934, hallmark: "anchor", materials: ["silver", "nickel"], jewels: [7, 15], serialPrefix: "HB", numerals: "roman", prestige: 1.0 },
  { id: "orlova", tier: 1, name: "Orlova", city: "Sankt-Peterburg", from: 1880, to: 1917, hallmark: "star", materials: ["gold", "silver"], jewels: [17, 21], serialPrefix: "OR", numerals: "roman", prestige: 1.8 },
  { id: "kessler", tier: 0, name: "Kessler Uhren", city: "Pforzheim", from: 1901, to: 1965, hallmark: "gear", materials: ["steel", "nickel", "gold"], jewels: [15, 21], serialPrefix: "KU", numerals: "arabic", prestige: 1.2 },
  { id: "aubert", tier: 3, name: "Maison Aubert", city: "Paris", from: 1855, to: 1898, hallmark: "lily", materials: ["gold"], jewels: [13, 15], serialPrefix: "MA", numerals: "roman", prestige: 2.2 },
  { id: "takeda", tier: 2, name: "Takeda Seiki", city: "Ōsaka", from: 1912, to: 1970, hallmark: "sun", materials: ["steel", "silver"], jewels: [17, 23], serialPrefix: "TS", numerals: "arabic", prestige: 1.1 },
];

export const RULERS: Ruler[] = [
  { id: "aurelian", tier: 0, title: "king", name: "Aurelian II", realm: "Valdoria", from: 1742, to: 1771, metal: "silver", diameter: 38, edge: "reeded", mint: "V", weight: 27, prestige: 1.2 },
  { id: "isolde", tier: 2, title: "queen", name: "Isolde", realm: "Valdoria", from: 1771, to: 1796, metal: "gold", diameter: 22, edge: "reeded", mint: "V", weight: 7, prestige: 2.0 },
  { id: "kadir", tier: 1, title: "sultan", name: "Kadir III", realm: "Tarsa", from: 1789, to: 1807, metal: "silver", diameter: 40, edge: "lettered", mint: "T", weight: 28, prestige: 1.4 },
  { id: "emeric", tier: 0, title: "duke", name: "Emeric", realm: "Lumen", from: 1812, to: 1840, metal: "silver", diameter: 33, edge: "plain", mint: "L", weight: 20, prestige: 1.0 },
  { id: "casimir", tier: 3, title: "emperor", name: "Casimir", realm: "Nordheim", from: 1848, to: 1879, metal: "gold", diameter: 26, edge: "lettered", mint: "N", weight: 12, prestige: 2.2 },
  { id: "mirela", tier: 0, title: "queen", name: "Mirela", realm: "Austra", from: 1880, to: 1914, metal: "nickel", diameter: 25, edge: "plain", mint: "A", weight: 6, prestige: 0.7 },
];

export const ARTISTS: Artist[] = [
  { id: "moreau", tier: 0, name: "Adrien Moreau", born: 1841, died: 1903, activeFrom: 1862, activeTo: 1903, corner: "br", canvas: "linen", prestige: 1.6 },
  { id: "lindqvist", tier: 0, name: "Ida Lindqvist", born: 1861, died: 1929, activeFrom: 1880, activeTo: 1929, corner: "bl", canvas: "linen", prestige: 1.4 },
  { id: "wierzba", tier: 2, name: "Tomasz Wierzba", born: 1790, died: 1851, activeFrom: 1812, activeTo: 1851, corner: "br", canvas: "jute", prestige: 1.8 },
  { id: "varga", tier: 0, name: "Elena Varga", born: 1902, died: 1978, activeFrom: 1924, activeTo: 1978, corner: "bl", canvas: "linen", prestige: 1.1 },
  { id: "nazim", tier: 1, name: "Halil Nazım", born: 1868, died: 1931, activeFrom: 1890, activeTo: 1931, corner: "br", canvas: "linen", prestige: 1.5 },
  { id: "halle", tier: 3, name: "Beatrix Hallé", born: 1815, died: 1880, activeFrom: 1835, activeTo: 1880, corner: "bl", canvas: "jute", prestige: 2.0 },
];

/** Pigmentlerin sanatçı paletine girdiği en erken yıl (yaklaşık, gerçek tarih). */
export const PIGMENTS: Record<PigmentId, { from: number; color: string }> = {
  leadWhite: { from: 0, color: "#f4f1e8" },
  vermilion: { from: 0, color: "#d4402b" },
  ochre: { from: 0, color: "#c8913a" },
  prussian: { from: 1706, color: "#1f3a6b" },
  cobalt: { from: 1802, color: "#2f5fb3" },
  ultramarine: { from: 1828, color: "#3a3fa6" },
  zincWhite: { from: 1834, color: "#fbfbf7" },
  viridian: { from: 1838, color: "#2f7d6b" },
  cadmiumYellow: { from: 1846, color: "#f2c230" },
  titaniumWhite: { from: 1921, color: "#ffffff" },
  phthalo: { from: 1935, color: "#0f5c7a" },
};

/** Genel kurallar (kataloğun "Genel Bilgiler" sayfası). */
export const RULES = {
  steelFrom: 1913,      // paslanmaz çelik
  lumeFrom: 1910,       // karanlıkta parlayan rakamlar
  syntheticCanvasFrom: 1950,
};

/** Malzemeye göre cep saati ağırlık aralığı (gram). Kaplama saatler hafif kalır. */
export const WATCH_WEIGHT: Record<Material, [number, number]> = {
  gold: [96, 114], silver: [76, 90], nickel: [66, 78], steel: [70, 84], brass: [58, 68],
};

export const COIN_TOLERANCE = { weight: 0.3, diameter: 0.3 };

// ---------- Dükkân: aletler ve katalog ciltleri ----------
export const TOOLS: { id: ToolId; price: number; minutes: number; icon: string; forCats: Category[] }[] = [
  { id: "loupe", price: 0, minutes: 5, icon: "🔍", forCats: ["watch", "coin", "painting"] },
  { id: "scale", price: 600, minutes: 5, icon: "⚖️", forCats: ["watch", "coin"] },
  { id: "caliper", price: 700, minutes: 5, icon: "📏", forCats: ["coin"] },
  { id: "touchstone", price: 900, minutes: 10, icon: "🪨", forCats: ["watch", "coin"] },
  { id: "uv", price: 1500, minutes: 10, icon: "🔦", forCats: ["watch", "painting"] },
  { id: "pigment", price: 2500, minutes: 20, icon: "🧪", forCats: ["painting"] },
];

export const CATALOGS: { cat: Category; price: number; icon: string }[] = [
  { cat: "watch", price: 0, icon: "⌚" },
  { cat: "coin", price: 800, icon: "🪙" },
  { cat: "painting", price: 2200, icon: "🖼️" },
];

/**
 * Hangi ihlal hangi aletlerden biriyle fark edilir ("eye" = aletsiz, gözle görülür).
 * Üretici, oyuncunun sahip olmadığı aletle anlaşılabilecek ihlal üretmez.
 */
export const TELL_TOOLS: Record<TellId, (ToolId | "eye")[]> = {
  "w.year": ["loupe"], "w.hallmark": ["loupe"], "w.serial": ["loupe"], "w.jewels": ["loupe"],
  "w.material": ["touchstone"], "w.plated": ["scale", "touchstone"], "w.steelEra": ["touchstone"], "w.lumeEra": ["uv"],
  "c.year": ["eye"], "c.mint": ["loupe"], "c.edge": ["eye"], "c.diameter": ["caliper"], "c.weight": ["scale"], "c.metal": ["touchstone", "scale"],
  "p.year": ["eye"], "p.corner": ["eye"], "p.canvas": ["eye"], "p.pigment": ["pigment"], "p.uvSignature": ["uv"],
};

export const TELLS_BY_CAT: Record<Category, TellId[]> = {
  watch: ["w.year", "w.hallmark", "w.serial", "w.jewels", "w.material", "w.plated", "w.steelEra", "w.lumeEra"],
  coin: ["c.year", "c.mint", "c.edge", "c.diameter", "c.weight", "c.metal"],
  painting: ["p.year", "p.corner", "p.canvas", "p.pigment", "p.uvSignature"],
};

export const makerById = (id: string) => WATCH_MAKERS.find(m => m.id === id)!;
export const rulerById = (id: string) => RULERS.find(r => r.id === id)!;
export const artistById = (id: string) => ARTISTS.find(a => a.id === id)!;

// ---------- Rütbeler ----------
/** Rütbe atladıkça her kategoride yeni ustalar açılır (tier <= rütbe). */
export const RANKS = [
  { id: "apprentice", xp: 0 },
  { id: "journeyman", xp: 150 },
  { id: "master", xp: 400 },
  { id: "chief", xp: 900 },
  { id: "legend", xp: 1800 },
] as const;

export function rankIndex(xp: number): number {
  let i = 0;
  RANKS.forEach((r, k) => { if (xp >= r.xp) i = k; });
  return i;
}