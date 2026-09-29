// Logo, uygulama simgesi, açılış ekranı ve mağaza görsellerini SVG'den üretir (assets/ klasörüne).
// Sonra Android'e: node scripts/android-post.cjs (npm run android bunu kendisi yapar).
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const out = path.join(__dirname, "..", "assets");
fs.mkdirSync(out, { recursive: true });

const defs = `
<defs>
  <radialGradient id="bg" cx="50%" cy="40%" r="72%">
    <stop offset="0" stop-color="#5a3f27"/><stop offset=".55" stop-color="#2e2117"/><stop offset="1" stop-color="#140e0a"/>
  </radialGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff0b8"/><stop offset=".28" stop-color="#e9c46a"/><stop offset=".62" stop-color="#b8862f"/><stop offset="1" stop-color="#7a5418"/>
  </linearGradient>
  <linearGradient id="goldEdge" x1="1" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff7d6"/><stop offset=".5" stop-color="#d9a94a"/><stop offset="1" stop-color="#6b4712"/>
  </linearGradient>
  <radialGradient id="dial" cx="42%" cy="38%" r="75%">
    <stop offset="0" stop-color="#fffdf6"/><stop offset=".7" stop-color="#f1e6cc"/><stop offset="1" stop-color="#d9c7a0"/>
  </radialGradient>
  <linearGradient id="wood" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#3a1f0e"/><stop offset=".45" stop-color="#7a4522"/><stop offset="1" stop-color="#2a150a"/>
  </linearGradient>
  <radialGradient id="wax" cx="38%" cy="32%" r="75%">
    <stop offset="0" stop-color="#e2574c"/><stop offset=".6" stop-color="#a8231c"/><stop offset="1" stop-color="#6e120e"/>
  </radialGradient>
  <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity=".55"/><stop offset=".35" stop-color="#ffffff" stop-opacity=".06"/><stop offset="1" stop-color="#9fc2e8" stop-opacity=".18"/>
  </linearGradient>
  <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#000" flood-opacity=".55"/>
  </filter>
  <clipPath id="lensClip"><circle cx="0" cy="0" r="214"/></clipPath>
</defs>`;

// Büyütülmüş kadran: merceğin içinde görünen, saatin sağ üst çeyreği (XII ve III arası)
function magnifiedDial() {
  const ticks = [];
  for (let i = 0; i < 60; i++) {
    const big = i % 5 === 0;
    ticks.push(`<rect x="-4" y="${-470}" width="${big ? 12 : 5}" height="${big ? 46 : 22}" rx="2" fill="#3a2a18" transform="rotate(${i * 6})"/>`);
  }
  const roman = [["XII", 0], ["I", 30], ["II", 60], ["III", 90]]
    .map(([n, a]) => `<g transform="rotate(${a}) translate(0 -372) rotate(${-a})"><text text-anchor="middle" dominant-baseline="middle" font-family="Georgia, 'Times New Roman', serif" font-size="74" font-weight="700" fill="#2b1d10">${n}</text></g>`).join("");
  return `
    <g transform="translate(-40 300)">
      <circle r="560" fill="url(#goldEdge)"/>
      <circle r="520" fill="url(#dial)"/>
      ${ticks.join("")}
      ${roman}
      <circle r="330" fill="none" stroke="#b39a6a" stroke-width="3"/>
      <rect x="-10" y="-360" width="20" height="360" rx="10" fill="#1f160d" transform="rotate(38)"/>
      <rect x="-13" y="-250" width="26" height="250" rx="13" fill="#1f160d" transform="rotate(-62)"/>
      <circle r="30" fill="#1f160d"/><circle r="10" fill="#d9a94a"/>
    </g>`;
}

// Amblem: 1024x1024 koordinatlarda
function emblem({ ring = true } = {}) {
  const notches = Array.from({ length: 72 }, (_, i) => `<rect x="509" y="46" width="6" height="18" rx="2" fill="url(#gold)" transform="rotate(${i * 5} 512 512)"/>`).join("");
  return `
  ${ring ? `<circle cx="512" cy="512" r="452" fill="none" stroke="url(#gold)" stroke-width="12"/>
  <circle cx="512" cy="512" r="424" fill="none" stroke="#e0b862" stroke-opacity=".45" stroke-width="3" stroke-dasharray="2 14" stroke-linecap="round"/>
  ${notches}` : ""}
  <g filter="url(#shadow)">
    <!-- Sap -->
    <g transform="translate(470 452) rotate(-45)">
      <rect x="-40" y="244" width="80" height="58" rx="12" fill="url(#gold)"/>
      <rect x="-32" y="296" width="64" height="200" rx="30" fill="url(#wood)"/>
      <rect x="-32" y="486" width="64" height="18" rx="9" fill="url(#gold)"/>
    </g>
    <!-- Mercek -->
    <g transform="translate(470 452)">
      <g clip-path="url(#lensClip)">
        <rect x="-240" y="-240" width="480" height="480" fill="#f1e6cc"/>
        ${magnifiedDial()}
        <rect x="-240" y="-240" width="480" height="480" fill="url(#glass)"/>
      </g>
      <circle r="214" fill="none" stroke="#2a1a0c" stroke-width="10" stroke-opacity=".55"/>
      <circle r="238" fill="none" stroke="url(#gold)" stroke-width="44"/>
      <circle r="260" fill="none" stroke="#6b4712" stroke-width="3" stroke-opacity=".8"/>
      <path d="M -150 -120 A 190 190 0 0 1 60 -190" stroke="#fff" stroke-width="16" stroke-linecap="round" fill="none" opacity=".7"/>
    </g>
    <!-- Mühür: gerçek -->
    <g transform="translate(724 262)">
      <path d="M0 -92 C 30 -96 52 -80 70 -60 C 92 -40 96 -10 88 18 C 84 48 64 74 34 86 C 6 98 -26 96 -52 82 C -78 66 -94 38 -92 8 C -92 -24 -78 -52 -54 -72 C -38 -86 -20 -92 0 -92 Z" fill="url(#wax)"/>
      <circle r="58" fill="none" stroke="#5e0f0b" stroke-width="5" stroke-opacity=".6"/>
      <path d="M -30 2 L -8 26 L 34 -22" stroke="#ffe3c7" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </g>
  </g>`;
}

const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs}${body}</svg>`;

// Simge (tam): arka plan + amblem
const iconFull = svg(1024, 1024, `<rect width="1024" height="1024" fill="url(#bg)"/>${emblem()}`);
// Uyarlanabilir simge ön planı: güvenli alan için küçültülmüş, halkasız
const iconFg = svg(1024, 1024, `<g transform="translate(512 512) scale(.66) translate(-512 -512)">${emblem({ ring: false })}</g>`);
const iconBg = svg(1024, 1024, `<rect width="1024" height="1024" fill="url(#bg)"/>`);

// Açılış ekranı: ortada amblem + yazı
const splash = svg(2732, 2732, `
  <rect width="2732" height="2732" fill="#1d1611"/>
  <circle cx="1366" cy="1250" r="900" fill="url(#bg)" opacity=".9"/>
  <g transform="translate(1366 1180) scale(1.15) translate(-512 -512)">${emblem()}</g>
  <text x="1366" y="1960" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="160" font-weight="700" fill="#e2b95a" letter-spacing="4">The Collector</text>
  <text x="1366" y="2090" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="92" fill="#c9b38c">Real or Fake?</text>`);

// Mağaza tanıtım görseli (1024x500): İngilizce ve Türkçe
const featureOf = (title, sub, tag) => svg(1024, 500, `
  <rect width="1024" height="500" fill="#1d1611"/>
  <rect width="1024" height="500" fill="url(#bg)"/>
  <g transform="translate(222 250) scale(.4) translate(-512 -512)">${emblem()}</g>
  <text x="440" y="222" font-family="Georgia, 'Times New Roman', serif" font-size="70" font-weight="700" fill="#e9c46a">${title}</text>
  <text x="444" y="286" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="52" fill="#d8c4a0">${sub}</text>
  <rect x="444" y="316" width="360" height="3" fill="#b8862f" opacity=".7"/>
  <text x="444" y="362" font-family="Georgia, 'Times New Roman', serif" font-size="30" fill="#bfa98a">${tag}</text>`);
const feature = featureOf("The Collector", "Real or Fake?", "Antique &amp; pawn shop detective");
const featureTr = featureOf("Koleksiyoncu", "Sahte mi Gerçek mi?", "Antika ve rehin dükkânı dedektifi");

(async () => {
  const jobs = [
    [iconFull, "icon-only.png"], [iconFg, "icon-foreground.png"], [iconBg, "icon-background.png"],
    [splash, "splash.png"], [splash, "splash-dark.png"], [feature, "feature-graphic-1024x500.png"], [featureTr, "feature-graphic-tr-1024x500.png"],
  ];
  for (const [s, f] of jobs) await sharp(Buffer.from(s)).png().toFile(path.join(out, f));
  await sharp(Buffer.from(iconFull)).resize(512, 512).png().toFile(path.join(out, "store-icon-512.png"));
  fs.writeFileSync(path.join(out, "logo.svg"), iconFull);
  console.log("assets/ hazır");
})();
