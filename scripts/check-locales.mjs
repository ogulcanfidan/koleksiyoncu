// Çeviri denetimi: her dil dosyası en.json ile aynı anahtarlara ve aynı {yer tutuculara} sahip olmalı.
// Kullanım: node scripts/check-locales.mjs shared/locales src/locales
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const LANGS = ["tr", "en", "zh", "hi", "es", "ar", "fr", "bn", "pt", "ru", "de", "ja", "ko", "it", "id"];
const dirs = process.argv.slice(2);
if (!dirs.length) { console.error("Klasör verin."); process.exit(2); }

const ph = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(",");
let problems = 0;

for (const dir of dirs) {
  const files = readdirSync(dir).filter(f => f.endsWith(".json"));
  const en = JSON.parse(readFileSync(join(dir, "en.json"), "utf8"));
  for (const lang of LANGS) {
    const file = `${lang}.json`;
    if (!files.includes(file)) { console.log(`- ${dir}/${file}: YOK`); problems++; continue; }
    let d;
    try { d = JSON.parse(readFileSync(join(dir, file), "utf8")); }
    catch (e) { console.log(`✗ ${dir}/${file}: geçersiz JSON (${e.message})`); problems++; continue; }
    const missing = Object.keys(en).filter(k => !(k in d));
    const extra = Object.keys(d).filter(k => !(k in en));
    const badPh = Object.keys(en).filter(k => k in d && ph(en[k]) !== ph(d[k]));
    const empty = Object.keys(d).filter(k => typeof d[k] !== "string" || !d[k].trim());
    const untranslated = lang !== "en" ? Object.keys(en).filter(k => k in d && d[k] === en[k] && /[a-z]{4,}/i.test(en[k]) && !/^[A-Z][\w &.-]+$/.test(en[k])) : [];
    const n = missing.length + extra.length + badPh.length + empty.length;
    problems += n;
    const note = untranslated.length ? ` (uyarı: ${untranslated.length} metin İngilizceyle aynı)` : "";
    console.log(`${n ? "✗" : "✓"} ${dir}/${file}: ${Object.keys(d).length} anahtar${note}`);
    if (missing.length) console.log("   eksik:", missing.slice(0, 12).join(", "), missing.length > 12 ? "…" : "");
    if (extra.length) console.log("   fazla:", extra.slice(0, 12).join(", "));
    if (badPh.length) console.log("   yer tutucu farkı:", badPh.slice(0, 12).join(", "));
    if (empty.length) console.log("   boş:", empty.slice(0, 12).join(", "));
  }
}
process.exit(problems ? 1 : 0);
