// Mağaza görsellerini 14 dilde üretir: başlıklı ve telefon çerçeveli 5 ekran görüntüsü (1080x1920)
// ile özellik grafiği (1024x500). Çıktı: assets/store/<dil>/1..5.png ve feature.png
// Önce web derlemesi gerekir: npx vite build. Kullanım: node scripts/make-store-shots.mjs [dil ...]
// Oyun, başsız Chrome'da gerçek arayüzüyle açılır; görüntüler oradan alınır.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const work = join(tmpdir(), "collector-shots");
const outRoot = join(root, "assets", "store");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 5187, CDP_PORT = 9347;

// Telefon ekranı: 360x748 CSS pikseli, çerçevenin içine 752x1562 olarak oturur.
const VIEW = { w: 360, h: 748, scale: 752 / 360 };

// Başlıklar: [müşteri, büyüteç, katalog, dükkân ve aletler, ana ekran], ardından özellik grafiği alt yazısı.
const TEXT = {
  en: ["Real or fake? Your call.", "Spot the detail that gives it away", "The catalogue is your rulebook", "Build your expert toolkit", "Run grandpa's antique shop", "Antique & pawn shop detective"],
  tr: ["Sahte mi, gerçek mi? Karar senin.", "Ele veren ayrıntıyı yakala", "Katalog senin kural kitabın", "Alet çantanı kur", "Dedenin antika dükkânını işlet", "Antika ve rehin dükkânı dedektifi"],
  es: ["¿Auténtico o falso? Tú decides.", "Descubre el detalle que lo delata", "El catálogo es tu reglamento", "Arma tu kit de experto", "Lleva la tienda de antigüedades del abuelo", "Detective de antigüedades y empeños"],
  fr: ["Vrai ou faux ? À toi de juger.", "Repère le détail qui trahit le faux", "Le catalogue est ton règlement", "Constitue ta trousse d'expert", "Tiens la boutique d'antiquités de grand-père", "Détective en antiquités et prêts sur gages"],
  pt: ["Verdadeiro ou falso? Você decide.", "Ache o detalhe que entrega o falso", "O catálogo é o seu livro de regras", "Monte seu kit de perito", "Cuide do antiquário do vovô", "Detetive de antiguidades e penhores"],
  ru: ["Подлинник или подделка? Решать тебе.", "Найди деталь, которая выдаёт подделку", "Каталог — твой свод правил", "Собери набор эксперта", "Управляй дедушкиной антикварной лавкой", "Детектив антикварной лавки"],
  hi: ["असली या नकली? फ़ैसला आपका।", "वह बारीकी पकड़ें जो पोल खोल दे", "कैटलॉग ही आपकी नियम-पुस्तिका है", "अपना औज़ार-किट बनाएँ", "दादाजी की एंटीक दुकान चलाएँ", "एंटीक और गिरवी दुकान का जासूस"],
  ar: ["أصلي أم مزيّف؟ القرار لك.", "التقط التفصيل الذي يفضح التزوير", "الكتالوج هو مرجعك", "جهّز عدّة الخبير", "أدِر متجر التحف الذي ورثته عن جدّك", "محقق التحف والرهونات"],
  zh: ["真品还是赝品？由你决定。", "抓住露出破绽的细节", "图录就是你的规则书", "打造你的鉴定工具箱", "经营爷爷留下的古董店", "古董店与当铺鉴宝侦探"],
  id: ["Asli atau palsu? Kamu yang menentukan.", "Temukan detail yang membongkar kepalsuan", "Katalog adalah buku aturanmu", "Lengkapi peralatan ahlimu", "Kelola toko antik kakek", "Detektif toko antik & gadai"],
  de: ["Echt oder falsch? Du entscheidest.", "Finde das Detail, das die Fälschung verrät", "Der Katalog ist dein Regelbuch", "Stell dein Werkzeug zusammen", "Führe Großvaters Antiquitätenladen", "Detektiv im Antiquitäten- und Pfandhaus"],
  ja: ["本物か偽物か？決めるのはあなた。", "偽物を見抜く決め手を探そう", "カタログがあなたのルールブック", "鑑定道具をそろえよう", "祖父の骨董店を切り盛りしよう", "骨董店＆質屋の鑑定探偵"],
  ko: ["진품일까 가품일까? 판단은 당신의 몫.", "가품을 드러내는 단서를 찾아보세요", "도감이 곧 규칙서예요", "감정 도구를 갖춰 보세요", "할아버지의 골동품 가게를 운영하세요", "골동품·전당포 감정 탐정"],
  it: ["Vero o falso? Decidi tu.", "Scova il dettaglio che tradisce il falso", "Il catalogo è il tuo regolamento", "Crea il tuo kit da esperto", "Gestisci la bottega d'antiquariato del nonno", "Detective tra antiquariato e pegni"],
};
const FONT = `'Segoe UI', 'Nirmala UI', 'Yu Gothic UI', 'Malgun Gothic', 'Microsoft YaHei UI', system-ui, sans-serif`;
const SERIF = `Georgia, 'Times New Roman', 'Yu Mincho', 'Batang', 'SimSun', 'Nirmala UI', 'Segoe UI', serif`;
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const sleep = ms => new Promise(r => setTimeout(r, ms));

const langs = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(TEXT);
if (!existsSync(join(dist, "index.html"))) { console.error("dist/ yok: önce npx vite build"); process.exit(1); }
rmSync(work, { recursive: true, force: true }); mkdirSync(work, { recursive: true });

// /app/ → dist, /work/ → geçici klasör, /assets-src/ → assets
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json", ".mp3": "audio/mpeg", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const map = [["/app/", dist], ["/work/", work], ["/assets-src/", join(root, "assets")]].find(([p]) => url.startsWith(p));
  if (!map) { res.writeHead(404).end(); return; }
  let file = join(map[1], url.slice(map[0].length) || "index.html");
  if (!existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" }).end(readFileSync(file));
}).listen(PORT, "127.0.0.1");
const BASE = `http://127.0.0.1:${PORT}`;

const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${join(work, "profile")}`,
  "--no-first-run", "--hide-scrollbars", "--mute-audio", "--force-color-profile=srgb", "about:blank"], { stdio: "ignore" });

// Küçük bir CDP istemcisi (tarayıcı düzeyinde bağlantı, düz oturumlar)
async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const v = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json();
      const ws = new WebSocket(v.webSocketDebuggerUrl);
      await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
      let id = 0; const wait = new Map();
      ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && wait.has(d.id)) { const [ok, no] = wait.get(d.id); wait.delete(d.id); d.error ? no(new Error(d.error.message)) : ok(d.result); } };
      return (method, params = {}, sessionId) => new Promise((ok, no) => { const n = ++id; wait.set(n, [ok, no]); ws.send(JSON.stringify({ id: n, method, params, sessionId })); });
    } catch { await sleep(200); }
  }
  throw new Error("Chrome'a bağlanılamadı");
}

async function openPage(send, w, h, scale, mobile) {
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId);
  await s("Page.enable"); await s("Runtime.enable");
  await s("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: scale, mobile });
  const ev = async expr => {
    const r = await s("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const shot = async file => { const { data } = await s("Page.captureScreenshot", { format: "png" }); writeFileSync(file, Buffer.from(data, "base64")); };
  const go = async url => { await s("Page.navigate", { url }); await sleep(900); };
  const close = () => send("Target.closeTarget", { targetId });
  return { s, ev, shot, go, close };
}

const B = i => `[...document.querySelectorAll('button')][${i}].click()`;

async function capture(send, lang) {
  const p = await openPage(send, VIEW.w, VIEW.h, VIEW.scale, true);
  await p.go(`${BASE}/app/index.html`);
  await p.ev(`localStorage.clear(); localStorage.setItem('pref-lang', JSON.stringify({lang:'${lang}'})); location.reload(); 1`);
  await sleep(1200);
  const raw = n => join(work, `${lang}-raw-${n}.png`);
  // Açılış hikâyesi: ikinci düğme "Geç"
  await p.ev(B(1)); await sleep(500);
  await p.ev(`window.scrollTo(0,0)`); await p.shot(raw(5));                     // ana ekran
  await p.ev(B(4)); await sleep(500); await p.shot(raw(4)); await p.ev(B(0)); await sleep(400);   // dükkân ve aletler
  await p.ev(B(5)); await sleep(500); await p.shot(raw(3)); await p.ev(B(0)); await sleep(400);   // katalog
  await p.ev(B(2)); await sleep(900);                                            // eğitim günü
  for (let i = 0; i < 10; i++) { await p.ev(`document.querySelector('.coach button')?.click()`); await sleep(150); }   // eğitim ipuçlarını kapat
  await p.ev(`window.scrollTo(0,0)`); await sleep(200);
  await p.shot(raw(1));                                                          // müşteri
  // Arka kapak + büyüteç
  await p.ev(`document.querySelectorAll('.stage-bar .seg button')[1].click()`); await sleep(300);
  await p.ev(`document.querySelector('.tool.loupe').click()`); await sleep(300);
  // Sahne, üst çubuğun hemen altına gelsin (konuşma balonu yarım görünmesin)
  await p.ev(`(()=>{const h=document.querySelector('.play-top').getBoundingClientRect().bottom;const s=document.querySelector('.stage').getBoundingClientRect().top;window.scrollBy(0,s-h-8)})()`); await sleep(250);
  const r = await p.ev(`(()=>{const b=document.querySelector('.mag-wrap').getBoundingClientRect();return {x:b.left+b.width*0.5,y:b.top+b.height*0.62}})()`);
  await p.s("Input.dispatchMouseEvent", { type: "mousePressed", x: r.x, y: r.y, button: "left", clickCount: 1 });
  await sleep(400);
  await p.shot(raw(2));
  await p.s("Input.dispatchMouseEvent", { type: "mouseReleased", x: r.x, y: r.y, button: "left", clickCount: 1 });
  await p.close();
}

const dir = l => (l === "ar" ? "rtl" : "ltr");
const shotHtml = (lang, n) => `<!doctype html><html lang="${lang}" dir="${dir(lang)}"><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}
body{width:1080px;height:1920px;overflow:hidden;font-family:${({ zh: "'Microsoft YaHei UI', 'Microsoft YaHei', ", ja: "'Meiryo UI', 'Meiryo', 'Yu Gothic UI', ", ko: "'Malgun Gothic', " })[lang] || ""}${FONT};
  background:radial-gradient(1200px 900px at 85% 100%, #d08a3a 0%, rgba(208,138,58,0) 60%),linear-gradient(160deg,#3a0f1a 0%,#6d1f27 45%,#a8482e 100%)}
h1{position:absolute;left:70px;right:70px;top:64px;height:200px;display:flex;align-items:center;justify-content:center;text-align:center;
  color:#fff7e6;font-weight:700;font-size:62px;line-height:1.18;text-wrap:balance;word-break:keep-all;text-shadow:0 3px 14px rgba(0,0,0,.35)}
.phone{position:absolute;left:150px;top:292px;width:780px;height:1590px;border-radius:64px;background:#0d0a08;
  box-shadow:0 0 0 3px #d9a441,0 30px 80px rgba(0,0,0,.55)}
.phone img{position:absolute;left:14px;top:14px;width:752px;height:1562px;border-radius:50px;display:block}
</style><h1>${esc(TEXT[lang][n - 1])}</h1><div class="phone"><img src="/work/${lang}-raw-${n}.png"></div></html>`;

const featureHtml = (lang, title, sub) => `<!doctype html><html lang="${lang}" dir="${dir(lang)}"><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}
body{width:1024px;height:500px;overflow:hidden;background:radial-gradient(700px 500px at 22% 50%, #4a3520 0%, #1d1611 70%);font-family:${SERIF};display:flex;align-items:center;direction:ltr}
img{width:400px;height:400px;margin-left:22px;flex:none;mix-blend-mode:lighten}
.t{flex:1;padding:0 44px 0 22px;direction:${dir(lang)};text-align:start;min-width:0}
h1{color:#e9c46a;font-weight:700;font-size:${[...title].length >= 16 ? 54 : [...title].length >= 12 ? 62 : 70}px;line-height:1.12;white-space:nowrap}
h2{color:#d8c4a0;font-style:italic;font-weight:400;font-size:${[...sub].length > 20 ? 40 : 50}px;line-height:1.2;margin-top:10px}
hr{border:0;height:3px;width:360px;max-width:100%;background:#b8862f;opacity:.7;margin:22px 0 18px}
p{color:#bfa98a;font-size:28px;line-height:1.25}
</style><img src="/assets-src/logo.svg"><div class="t"><h1>${esc(title)}</h1><h2>${esc(sub)}</h2><hr><p>${esc(TEXT[lang][5])}</p></div></html>`;

async function compose(send, lang) {
  const out = join(outRoot, lang); mkdirSync(out, { recursive: true });
  const p = await openPage(send, 1080, 1920, 1, false);
  for (let n = 1; n <= 5; n++) {
    writeFileSync(join(work, `${lang}-c${n}.html`), shotHtml(lang, n));
    await p.go(`${BASE}/work/${lang}-c${n}.html`);
    await p.ev(`document.fonts.ready.then(()=>1)`);
    await p.shot(join(out, `${n}.png`));
  }
  await p.close();
  const d = JSON.parse(readFileSync(join(root, "src", "locales", `${lang}.json`), "utf8"));
  const f = await openPage(send, 1024, 500, 1, false);
  writeFileSync(join(work, `${lang}-f.html`), featureHtml(lang, d["app.title"], d["app.subtitle"]));
  await f.go(`${BASE}/work/${lang}-f.html`);
  await f.ev(`document.fonts.ready.then(()=>1)`);
  await f.shot(join(out, "feature.png"));
  await f.close();
}

try {
  const send = await connect();
  for (const lang of langs) {
    if (!TEXT[lang]) { console.log(`- ${lang}: başlık metni yok, atlandı`); continue; }
    await capture(send, lang);
    await compose(send, lang);
    console.log(`✓ ${lang}`);
  }
} finally {
  chrome.kill(); server.close();
}
