// Gizlilik politikasını, web'de yayınlanmaya hazır tek bir HTML sayfası olarak üretir (docs/privacy.html).
// Play Console "Gizlilik politikası URL'si" alanına bu sayfanın yayınlandığı adres girilir.
// Kullanım: node --experimental-strip-types scripts/make-privacy.ts
import { writeFileSync } from "node:fs";
import { privacyText, termsText } from "../shared/src/legal.ts";
import { ANTIQUE_DISCLAIMER } from "../src/disclaimer.ts";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const toHtml = (txt: string) => txt.split("\n\n").map(p =>
  p.startsWith("## ") ? `<h3>${esc(p.slice(3))}</h3>` : `<p>${esc(p).replace(/(https?:\/\/\S+)/g, '<a href="$1">$1</a>')}</p>`).join("\n");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Collector: Real or Fake — Privacy Policy</title>
<style>
  :root { --bg: #fbf7ef; --ink: #2b2016; --muted: #6d5d48; --accent: #8a5a1f; }
  @media (prefers-color-scheme: dark) { :root { --bg: #1d1611; --ink: #f2e7d3; --muted: #b8a68a; --accent: #d9ab4a; } }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.65 Georgia, "Times New Roman", serif; }
  main { max-width: 720px; margin: 0 auto; padding: 32px 16px 64px; }
  h1 { color: var(--accent); font-size: 26px; margin: 0 0 4px; }
  h2 { margin-top: 48px; border-top: 1px solid var(--muted); padding-top: 24px; }
  h3 { margin: 24px 0 4px; font-size: 17px; }
  p { margin: 6px 0; }
  a { color: var(--accent); }
  nav a { margin-inline-end: 12px; }
</style>
</head>
<body>
<main>
<h1>The Collector: Real or Fake</h1>
<nav><a href="#en">English</a><a href="#tr">Türkçe</a></nav>
<h2 id="en">Privacy Policy</h2>
${toHtml(privacyText("The Collector: Real or Fake", "en"))}
<h2>Terms of Use</h2>
${toHtml(termsText("The Collector: Real or Fake", "en", ANTIQUE_DISCLAIMER))}
<h2 id="tr" lang="tr">Gizlilik Politikası</h2>
<div lang="tr">${toHtml(privacyText("Koleksiyoncu: Sahte mi Gerçek mi?", "tr"))}</div>
<h2 lang="tr">Kullanım Koşulları</h2>
<div lang="tr">${toHtml(termsText("Koleksiyoncu: Sahte mi Gerçek mi?", "tr", ANTIQUE_DISCLAIMER))}</div>
</main>
</body>
</html>
`;
writeFileSync(new URL("../docs/privacy.html", import.meta.url), html);
console.log("docs/privacy.html yazıldı");
