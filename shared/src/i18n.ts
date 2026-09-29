// Çok dilli metin sistemi. Dil cihazdan otomatik seçilir, ayarlardan değiştirilebilir.
import { useSyncExternalStore } from "react";
import { load, save } from "./storage";

export const LANGS = [
  { code: "tr", name: "Türkçe" },
  { code: "en", name: "English" },
  { code: "zh", name: "中文" },
  { code: "hi", name: "हिन्दी" },
  { code: "es", name: "Español" },
  { code: "ar", name: "العربية", rtl: true },
  { code: "fr", name: "Français" },
  { code: "bn", name: "বাংলা" },
  { code: "pt", name: "Português" },
] as const;

export type Lang = (typeof LANGS)[number]["code"];
export type Dict = Record<string, string>;

const FALLBACK: Lang = "en";
const dicts: Partial<Record<Lang, Dict>> = {};
const listeners = new Set<() => void>();
const pref = load<{ lang: Lang | "auto" }>("pref-lang", { lang: "auto" });
let current: Lang = resolve(pref.lang);

function detect(): Lang {
  const cands = (navigator.languages?.length ? navigator.languages : [navigator.language]) || [];
  for (const c of cands) {
    const base = c.toLowerCase().split("-")[0];
    if (LANGS.some(l => l.code === base)) return base as Lang;
  }
  return FALLBACK;
}
function resolve(p: Lang | "auto"): Lang { return p === "auto" ? detect() : p; }

/** Paylaşılan ve oyuna özel sözlükleri birleştirerek ekler. */
export function registerDicts(all: Partial<Record<Lang, Dict>>) {
  for (const [code, d] of Object.entries(all) as [Lang, Dict][]) {
    dicts[code] = { ...(dicts[code] || {}), ...d };
  }
  applyDir();
}

export function getLang(): Lang { return current; }
export function getLangPref(): Lang | "auto" { return pref.lang; }
export function setLang(p: Lang | "auto") {
  pref.lang = p; save("pref-lang", pref);
  current = resolve(p);
  applyDir();
  listeners.forEach(l => l());
}
function applyDir() {
  const meta = LANGS.find(l => l.code === current);
  document.documentElement.lang = current;
  document.documentElement.dir = meta && "rtl" in meta && meta.rtl ? "rtl" : "ltr";
}

/** t("key", { n: 3 }) — {n} yer tutucularını doldurur. "a|b" çoğul: n===1 ise a. */
export function t(key: string, vars?: Record<string, string | number>): string {
  let s = dicts[current]?.[key] ?? dicts[FALLBACK]?.[key] ?? dicts.tr?.[key] ?? key;
  if (vars) {
    if (s.includes("||") && typeof vars.n === "number") {
      const [one, many] = s.split("||");
      s = vars.n === 1 ? one : many;
    }
    s = s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
  }
  return s;
}

/** Bileşenlerin dil değişince yeniden çizilmesi için. */
export function useLang(): Lang {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb); },
    () => current,
  );
}

export function formatNumber(n: number): string {
  try { return new Intl.NumberFormat(current).format(n); } catch { return String(n); }
}
export function formatMoney(n: number): string {
  // Oyun içi para birimi: gerçek bir para birimiyle karışmasın diye altın sikke simgesi.
  return "🪙 " + formatNumber(Math.round(n));
}
export function formatClock(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}
export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
