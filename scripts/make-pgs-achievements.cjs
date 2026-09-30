// Play Oyun Hizmetleri için başarım içe aktarma paketi üretir: release/pgs-achievements.zip
// İçerik: AchievementsMetadata.csv, AchievementsLocalizations.csv, AchievementsIconsMappings.csv ve 512x512 simgeler.
// Kurallar: başlık satırı yok, ad/açıklamada virgül yok, puanlar 5'in katı ve 5–200 arası.
// Varsayılan dil İngilizce (Play Games projesinin varsayılanı en-US), diğer 8 dil çeviri olarak eklenir.
// Simgeler Chrome'un başsız modu ile çizilir (renkli emoji için).
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "release", "pgs-achievements");
const zipPath = path.join(root, "release", "pgs-achievements.zip");
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

// Oyundaki sıra, Play Games puanı ve simge (kopya simge olmasın diye bazıları oyundakinden farklı)
const ACH = [
  ["firstDay", 5, "🗝️"], ["fakes10", 15, "🕵️"], ["fakes50", 40, "🦅"], ["perfectDay", 20, "💎"],
  ["perfect5", 50, "👑"], ["treasure", 25, "🏺"], ["haggler", 25, "🤝"], ["sharpEye", 25, "⚡"],
  ["profit10k", 25, "💰"], ["profit100k", 75, "🏦"], ["allTools", 50, "🧰"], ["allCatalogs", 40, "📚"],
  ["streak7", 50, "🔥"], ["days30", 75, "🏪"], ["reputation", 50, "⭐"], ["stamps10", 60, "📜"],
  ["stampsAll", 150, "🏛️"], ["rankMaster", 40, "🎖️"], ["rankLegend", 125, "🌟"], ["quests10", 30, "📋"],
  ["bareEye", 25, "👁️", true], ["fooled", 5, "🤡", true],
];
// Play Console'daki dil kodları
const LOCALES = { tr: "tr-TR", es: "es-ES", fr: "fr-FR", pt: "pt-BR", zh: "zh-CN", ar: "ar", hi: "hi-IN", bn: "bn-BD", ru: "ru-RU", de: "de-DE", ja: "ja-JP", ko: "ko-KR", it: "it-IT", id: "id" };
const ES_LATAM = "es-419";

const load = l => JSON.parse(fs.readFileSync(path.join(root, "src", "locales", `${l}.json`), "utf8"));
// Play Games metni: para emojisi yok, sayılarda binlik virgülü yok, cümle içi virgül yerine tire.
function clean(s, lang) {
  let t = s.replace(/🪙\s*/g, lang === "en" ? "" : "").replace(/(\d),(?=\d)/g, "$1");
  if (lang === "en") t = t.replace(/Make (\d+) profit/, "Make $1 coins of profit");
  t = t.replace(/\s*,\s*/g, " – ").replace(/"/g, "'");
  if (t.includes(",")) throw new Error(`virgül kaldı: ${t}`);
  return t.trim();
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const en = load("en");
const total = ACH.reduce((a, x) => a + x[1], 0);
if (total > 2000) throw new Error("toplam puan 2000'i aşıyor");
for (const [, p] of ACH) if (p % 5 || p < 5 || p > 200) throw new Error(`geçersiz puan ${p}`);

const nameOf = id => clean(en[`ach.${id}.title`], "en");
const meta = ACH.map(([id, pts, , hidden], i) =>
  [nameOf(id), clean(en[`ach.${id}.desc`], "en"), "False", "", hidden ? "Hidden" : "Revealed", pts, i + 1].join(","));
const names = new Set(ACH.map(([id]) => nameOf(id)));
if (names.size !== ACH.length) throw new Error("başarım adları benzersiz değil");

const loc = [];
for (const [lang, code] of Object.entries(LOCALES)) {
  const d = load(lang);
  for (const [id] of ACH) {
    const row = [nameOf(id), clean(d[`ach.${id}.title`], lang), clean(d[`ach.${id}.desc`], lang)];
    loc.push([...row, code].join(","));
    if (lang === "es") loc.push([...row, ES_LATAM].join(","));
  }
}

const icons = ACH.map(([id]) => `${nameOf(id)},${id}.png`);

// UTF-8 BOM'suz yaz
fs.writeFileSync(path.join(outDir, "AchievementsMetadata.csv"), meta.join("\n") + "\n");
fs.writeFileSync(path.join(outDir, "AchievementsLocalizations.csv"), loc.join("\n") + "\n");
fs.writeFileSync(path.join(outDir, "AchievementsIconsMappings.csv"), icons.join("\n") + "\n");

// Simgeler: koyu zemin, altın halka, ortada emoji
const tmp = path.join(outDir, "_html");
fs.mkdirSync(tmp);
for (const [id, , emoji, hidden] of ACH) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:512px;height:512px;overflow:hidden;background:#1d1611}
.b{position:absolute;inset:0;background:radial-gradient(circle at 50% 38%,#5a3d22 0%,#2a1d13 62%,#1d1611 100%)}
.r{position:absolute;left:36px;top:36px;width:440px;height:440px;border-radius:50%;box-sizing:border-box;
border:14px solid #d4a64a;box-shadow:inset 0 0 0 6px #7a5320,0 0 0 4px #7a5320,inset 0 0 60px rgba(0,0,0,.55)}
.e{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
font:250px/1 "Segoe UI Emoji","Noto Color Emoji",sans-serif;${hidden ? "" : ""}filter:drop-shadow(0 10px 14px rgba(0,0,0,.5))}
</style></head><body><div class="b"></div><div class="r"></div><div class="e">${emoji}</div></body></html>`;
  const f = path.join(tmp, `${id}.html`);
  fs.writeFileSync(f, html);
  execFileSync(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
    "--window-size=512,512", `--screenshot=${path.join(outDir, `${id}.png`)}`, "file:///" + f.replace(/\\/g, "/")], { stdio: "ignore" });
}
fs.rmSync(tmp, { recursive: true, force: true });

fs.rmSync(zipPath, { force: true });
execFileSync("powershell", ["-NoProfile", "-Command",
  `Compress-Archive -Path '${outDir}\\*' -DestinationPath '${zipPath}'`], { stdio: "inherit" });
console.log(`Hazır: ${zipPath} (${ACH.length} başarım, toplam ${total} puan)`);
