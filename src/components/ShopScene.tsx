// Ana sayfadaki dükkân vitrini. Satın alınan aletler ve katalog ciltleri rafta belirir.
import type { Category, ToolId } from "../game/types";

export function ShopScene({ tools, cats }: { tools: ToolId[]; cats: Category[] }) {
  const has = (t: ToolId) => tools.includes(t);
  return (
    <svg className="shop-scene" viewBox="0 0 360 200" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b2a1d" /><stop offset="1" stopColor="#2a1f17" /></linearGradient>
        <linearGradient id="win" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f5d9a2" /><stop offset="1" stopColor="#d99a5b" /></linearGradient>
        <radialGradient id="lamp" cx="50%" cy="0%" r="80%"><stop offset="0" stopColor="#ffe3a3" stopOpacity=".55" /><stop offset="1" stopColor="#ffe3a3" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="360" height="200" fill="url(#wall)" />
      {/* Pencere */}
      <rect x="236" y="22" width="104" height="92" rx="4" fill="url(#win)" />
      <path d="M288 22 V114 M236 68 H340" stroke="#2a1f17" strokeWidth="4" />
      <path d="M246 104 Q270 84 296 98 T340 92 V114 H236 Z" fill="#b87a45" opacity=".5" />
      {/* Raflar */}
      {[52, 100, 148].map(y => <rect key={y} x="14" y={y} width="200" height="6" fill="#6b4a2f" />)}
      {/* Üst raf: saatler ve katalog ciltleri */}
      <g>
        <circle cx="40" cy="38" r="12" fill="#d9b35a" stroke="#6b4a2f" /><circle cx="40" cy="38" r="8" fill="#f7f1e3" />
        <circle cx="72" cy="40" r="10" fill="#cfd3d8" stroke="#6b4a2f" /><circle cx="72" cy="40" r="6.5" fill="#fbfaf6" />
        {cats.includes("watch") && <rect x="150" y="22" width="12" height="30" fill="#7a2e1e" />}
        {cats.includes("coin") && <rect x="164" y="26" width="12" height="26" fill="#2f5f4a" />}
        {cats.includes("painting") && <rect x="178" y="20" width="14" height="32" fill="#2c3e6b" />}
        <rect x="194" y="30" width="10" height="22" fill="#8a6a3a" />
      </g>
      {/* Orta raf: sikkeler ve vazo */}
      <g>
        {cats.includes("coin") && [30, 48, 66].map((x, i) => <circle key={x} cx={x} cy="93" r="7" fill={i === 1 ? "#e2bb55" : "#cfd3d8"} stroke="#6b4a2f" />)}
        <path d="M120 100 Q108 84 116 72 L132 72 Q140 84 128 100 Z" fill="#3f6fb0" /><rect x="118" y="68" width="12" height="5" fill="#2f5b95" />
        {has("scale") && <g><rect x="166" y="94" width="30" height="6" fill="#b8a27a" /><path d="M181 94 V76 M168 78 H194" stroke="#b8a27a" strokeWidth="2" /><path d="M164 78 Q168 86 172 78 M190 78 Q194 86 198 78" fill="none" stroke="#b8a27a" strokeWidth="1.5" /></g>}
      </g>
      {/* Alt raf: tablo ve aletler */}
      <g>
        {cats.includes("painting") && <g><rect x="24" y="112" width="52" height="36" fill="#c9973a" /><rect x="29" y="117" width="42" height="26" fill="#8fa7a8" /><path d="M29 136 Q44 126 58 134 T71 132 V143 H29 Z" fill="#4f5d38" /></g>}
        {has("uv") && <g><rect x="98" y="132" width="26" height="12" rx="2" fill="#4b3f7a" /><rect x="120" y="134" width="8" height="8" fill="#b9a8ff" /></g>}
        {has("touchstone") && <rect x="140" y="136" width="22" height="12" rx="3" fill="#2d2d2d" />}
        {has("caliper") && <path d="M170 146 H206 M174 146 V132 M182 146 V136" stroke="#c3cbd4" strokeWidth="2.5" />}
        {has("pigment") && <g>{["#d4402b", "#2f5fb3", "#f2c230"].map((c, i) => <rect key={c} x={180 + i * 8} y="122" width="6" height="10" rx="1" fill={c} />)}</g>}
      </g>
      {/* Tezgâh */}
      <rect x="0" y="162" width="360" height="38" fill="#5a3e28" />
      <rect x="0" y="162" width="360" height="5" fill="#7a5638" />
      <g transform="translate(260 140)">
        <circle cx="0" cy="12" r="10" fill="none" stroke="#c9a15a" strokeWidth="3" />
        <line x1="7" y1="19" x2="16" y2="28" stroke="#6b4a2f" strokeWidth="4" strokeLinecap="round" />
      </g>
      <rect x="0" y="0" width="360" height="200" fill="url(#lamp)" />
    </svg>
  );
}
