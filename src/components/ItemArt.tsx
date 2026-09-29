// Eşyaların kodla çizilen görselleri. Küçük yazılar (seri no, yıl, damga) bilerek küçüktür:
// büyüteç olmadan okunması zordur.
import { createContext, useContext, useId, type ReactElement, type ReactNode } from "react";
import { createRng } from "@shared/src/random";
import { artistById, makerById, rulerById, PIGMENTS } from "../game/catalog";
import type { CoinItem, Hallmark, Item, Material, PaintingItem, WatchItem } from "../game/types";

// Her çizim kendi SVG kimliklerini kullanır; aynı ekranda birden çok eşya olduğunda renkler karışmaz.
const UidCtx = createContext("ia");
function useU() { const p = useContext(UidCtx); return (n: string) => `${p}-${n}`; }

// İnce ayrıntılar (seri no, damga, yıl, taş sayısı, darphane harfi) çıplak gözle bulanıktır;
// büyüteç merceği aynı çizimi "sharp" olarak çizer. Böylece bu ipuçları yalnızca büyüteçle okunur.
const SharpCtx = createContext(false);
function Fine({ children }: { children: ReactNode }) {
  const sharp = useContext(SharpCtx); const u = useU();
  return <g filter={sharp ? undefined : `url(#${u("fine")})`}>{children}</g>;
}

export type View = "front" | "back" | "inner";

export const METAL: Record<Material, [string, string, string]> = {
  gold: ["#a67c1f", "#e2bb55", "#fbe7a1"],
  brass: ["#9c7d28", "#d6b554", "#f1dc95"],
  silver: ["#8e939a", "#cfd3d8", "#f6f7f9"],
  nickel: ["#8d8a80", "#c9c6bb", "#ebe9e1"],
  steel: ["#7f8a96", "#c3cbd4", "#eef2f6"],
};

function MetalGrad({ id, m }: { id: string; m: Material }) {
  const [a, b, c] = METAL[m];
  return (
    <radialGradient id={id} cx="35%" cy="30%" r="80%">
      <stop offset="0" stopColor={c} /><stop offset=".55" stopColor={b} /><stop offset="1" stopColor={a} />
    </radialGradient>
  );
}

export function HallmarkIcon({ h, x = 0, y = 0, s = 20, color = "currentColor" }: { h: Hallmark; x?: number; y?: number; s?: number; color?: string }) {
  const k = s / 20;
  const paths: Record<Hallmark, ReactElement> = {
    shield: <path d="M10 1 L18 4 L17 12 Q15 17 10 19 Q5 17 3 12 L2 4 Z" />,
    anchor: <g><circle cx="10" cy="3.5" r="2" fill="none" strokeWidth="1.4" stroke={color} /><path d="M10 5.5 V18 M5 9 H15 M3 13 Q10 22 17 13" fill="none" strokeWidth="1.6" stroke={color} /></g>,
    star: <path d="M10 1 L12.4 7.2 L19 7.6 L13.9 11.8 L15.6 18.4 L10 14.7 L4.4 18.4 L6.1 11.8 L1 7.6 L7.6 7.2 Z" />,
    gear: <g><circle cx="10" cy="10" r="5.5" /><g strokeWidth="3" stroke={color}>{[0, 45, 90, 135].map(a => <line key={a} x1="10" y1="1" x2="10" y2="19" transform={`rotate(${a} 10 10)`} />)}</g><circle cx="10" cy="10" r="2.2" fill="#fff" opacity=".7" /></g>,
    lily: <path d="M10 2 Q13 7 10 12 Q7 7 10 2 Z M10 12 Q4 5 2 10 Q5 12 10 13 Q15 12 18 10 Q16 5 10 12 Z M6 15 H14 V17 H6 Z" />,
    crown: <path d="M2 16 L3 6 L7 11 L10 4 L13 11 L17 6 L18 16 Z" />,
    key: <g><circle cx="6" cy="10" r="4" fill="none" strokeWidth="2" stroke={color} /><path d="M10 10 H19 M15 10 V14 M18 10 V13" strokeWidth="2" stroke={color} fill="none" /></g>,
    sun: <g><circle cx="10" cy="10" r="4.5" /><g strokeWidth="1.6" stroke={color}>{[0, 45, 90, 135, 180, 225, 270, 315].map(a => <line key={a} x1="10" y1="1" x2="10" y2="4" transform={`rotate(${a} 10 10)`} />)}</g></g>,
  };
  return <g transform={`translate(${x} ${y}) scale(${k})`} fill={color}>{paths[h]}</g>;
}

const ROMAN = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

// ---------- Saat ----------
function WatchFront({ w, uv }: { w: WatchItem; uv: boolean }) {
  const u = useU();
  const m = makerById(w.makerId);
  const dialFill = ["#f7f1e3", "#fbfaf6", "#efe6cf", "#f4efe8"][w.dialHue];
  const numColor = uv ? (w.lume ? "#9dff7a" : "#3b3450") : "#231c14";
  return (
    <g>
      <defs><MetalGrad id={u("case")} m={w.looksLike} /></defs>
      <circle cx="100" cy="14" r="9" fill="none" stroke={`url(#${u("case")})`} strokeWidth="4" />
      <rect x="93" y="18" width="14" height="10" rx="3" fill={`url(#${u("case")})`} />
      <circle cx="100" cy="112" r="80" fill={`url(#${u("case")})`} stroke="rgba(0,0,0,.25)" />
      <circle cx="100" cy="112" r="70" fill={uv ? "#1b1530" : dialFill} stroke="rgba(0,0,0,.2)" />
      {Array.from({ length: 60 }, (_, i) => (
        <line key={i} x1="100" y1="46" x2="100" y2={i % 5 === 0 ? 50 : 48} stroke={uv ? "#3b3450" : "#5a4b3a"} strokeWidth={i % 5 === 0 ? 1.2 : 0.5} transform={`rotate(${i * 6} 100 112)`} />
      ))}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 - 90) * Math.PI / 180;
        const x = 100 + Math.cos(a) * 55, y = 112 + Math.sin(a) * 55 + 4;
        return <text key={i} x={x} y={y} textAnchor="middle" fontSize={w.numerals === "roman" ? 9 : 11} fontFamily="Georgia, serif" fill={numColor}
          style={uv && w.lume ? { filter: "drop-shadow(0 0 2px #9dff7a)" } : undefined}>{w.numerals === "roman" ? ROMAN[i] : (i === 0 ? 12 : i)}</text>;
      })}
      <text x="100" y="88" textAnchor="middle" fontSize="7" fontFamily="Georgia, serif" fontStyle="italic" fill={uv ? "#3b3450" : "#3a2e22"}>{m.name}</text>
      <circle cx="100" cy="140" r="12" fill="none" stroke={uv ? "#3b3450" : "#8c7a62"} strokeWidth=".6" />
      <line x1="100" y1="140" x2="100" y2="131" stroke={uv ? "#3b3450" : "#231c14"} strokeWidth=".8" transform="rotate(130 100 140)" />
      <line x1="100" y1="112" x2="100" y2="72" stroke={uv ? (w.lume ? "#9dff7a" : "#3b3450") : "#231c14"} strokeWidth="2" strokeLinecap="round" transform="rotate(305 100 112)" />
      <line x1="100" y1="112" x2="100" y2="84" stroke={uv ? (w.lume ? "#9dff7a" : "#3b3450") : "#231c14"} strokeWidth="3" strokeLinecap="round" transform="rotate(62 100 112)" />
      <circle cx="100" cy="112" r="3" fill={uv ? "#3b3450" : "#231c14"} />
      {!uv && <ellipse cx="72" cy="80" rx="30" ry="14" fill="#fff" opacity=".18" transform="rotate(-30 72 80)" />}
    </g>
  );
}

function WatchBack({ w, uv }: { w: WatchItem; uv: boolean }) {
  const u = useU();
  const m = makerById(w.makerId);
  const engr = uv ? "#4a4266" : "rgba(40,28,10,.72)";
  return (
    <g>
      <defs><MetalGrad id={u("caseb")} m={w.looksLike} /></defs>
      <circle cx="100" cy="14" r="9" fill="none" stroke={`url(#${u("caseb")})`} strokeWidth="4" />
      <rect x="93" y="18" width="14" height="10" rx="3" fill={`url(#${u("caseb")})`} />
      <circle cx="100" cy="112" r="80" fill={uv ? "#2a2240" : `url(#${u("caseb")})`} stroke="rgba(0,0,0,.25)" />
      <circle cx="100" cy="112" r="66" fill="none" stroke={engr} strokeWidth=".6" />
      <circle cx="100" cy="112" r="63" fill="none" stroke={engr} strokeWidth=".3" />
      {/* Kazıma süs */}
      {Array.from({ length: 24 }, (_, i) => <path key={i} d="M100 52 q3 5 0 9 q-3 -4 0 -9" fill="none" stroke={engr} strokeWidth=".4" transform={`rotate(${i * 15} 100 112)`} />)}
      <Fine>
      <HallmarkIcon h={w.hallmark} x={93} y={92} s={14} color={engr} />
      <text x="100" y="121" textAnchor="middle" fontSize="5" fontFamily="Georgia, serif" fill={engr} letterSpacing=".4">{m.city.toLocaleUpperCase(document.documentElement.lang || undefined)}</text>
      <text x="100" y="130" textAnchor="middle" fontSize="4.6" fontFamily="'Courier New', monospace" fill={engr}>№ {w.serial}</text>
      <text x="100" y="139" textAnchor="middle" fontSize="4.6" fontFamily="Georgia, serif" fill={engr}>{w.year}</text>
      </Fine>
      {!uv && <ellipse cx="72" cy="78" rx="30" ry="12" fill="#fff" opacity=".2" transform="rotate(-30 72 78)" />}
    </g>
  );
}

function WatchInner({ w, uv }: { w: WatchItem; uv: boolean }) {
  const u = useU();
  const r = createRng(w.serial);
  const plate = uv ? "#2a2240" : "#c9b27a";
  const jewelSpots = Array.from({ length: Math.min(w.jewels, 23) }, () => ({ x: 55 + r.next() * 90, y: 70 + r.next() * 85 }));
  return (
    <g>
      <defs><MetalGrad id={u("casei")} m={w.looksLike} /></defs>
      <circle cx="100" cy="112" r="80" fill={`url(#${u("casei")})`} stroke="rgba(0,0,0,.25)" />
      <circle cx="100" cy="112" r="68" fill={plate} stroke="rgba(0,0,0,.3)" />
      {[[80, 95, 22], [125, 100, 16], [105, 140, 18], [70, 135, 12]].map(([x, y, rr], i) => (
        <g key={i}><circle cx={x} cy={y} r={rr} fill={uv ? "#352c52" : "#b39a5e"} stroke="rgba(0,0,0,.25)" />
          {Array.from({ length: 16 }, (_, k) => <line key={k} x1={x} y1={y - rr} x2={x} y2={y - rr - 2.4} stroke={uv ? "#4a4266" : "#8c7640"} strokeWidth="1.4" transform={`rotate(${k * 22.5} ${x} ${y})`} />)}
        </g>
      ))}
      <circle cx="120" cy="125" r="14" fill="none" stroke={uv ? "#4a4266" : "#6e5a2c"} strokeWidth="1.2" />
      <path d="M120 125 m-12 0 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0" fill="none" stroke={uv ? "#4a4266" : "#8c7640"} strokeWidth=".4" strokeDasharray="1 1.5" />
      {jewelSpots.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="1.8" fill={uv ? "#ff6fb0" : "#b3122e"} stroke="#fff" strokeWidth=".3" />)}
      <path d="M52 112 Q100 60 148 112" fill="none" stroke="rgba(0,0,0,.18)" strokeWidth="10" />
      <Fine><text x="100" y="172" textAnchor="middle" fontSize="4.6" fontFamily="Georgia, serif" fill={uv ? "#7c72a0" : "#4a3a1a"} letterSpacing=".6">{w.jewels} JEWELS</text></Fine>
    </g>
  );
}

// ---------- Sikke ----------
function CoinFace({ c, side, uv, labels }: { c: CoinItem; side: "front" | "back"; uv: boolean; labels: CoinLabels }) {
  const u = useU();
  const k = rulerById(c.rulerId);
  const scale = 0.72 + (c.diameter - 22) / 18 * 0.28; // çap görsel boyutu biraz etkiler
  const ink = uv ? "#4a4266" : "rgba(40,28,10,.55)";
  return (
    <g transform={`translate(100 112) scale(${scale}) translate(-100 -112)`}>
      <defs>
        <MetalGrad id={u(`coin-${side}`)} m={c.looksLike} />
        <path id={u("rim-top")} d="M40 112 A60 60 0 0 1 160 112" />
        <path id={u("rim-bot")} d="M36 112 A64 64 0 0 0 164 112" />
      </defs>
      <circle cx="100" cy="112" r="80" fill={uv ? "#2a2240" : `url(#${u(`coin-${side}`)})`} stroke="rgba(0,0,0,.3)" strokeWidth="1.5" />
      <circle cx="100" cy="112" r="72" fill="none" stroke={ink} strokeWidth=".8" strokeDasharray="1.5 2.5" />
      {side === "front" ? (
        <>
          <path d="M92 70 Q118 66 122 92 Q126 100 132 104 Q126 108 126 112 Q128 118 122 120 Q124 128 116 132 L116 150 L84 150 Q90 132 84 118 Q76 100 82 84 Q86 72 92 70 Z" fill={ink} opacity=".55" />
          <text fontSize="11" fontFamily="Georgia, serif" fill={ink} letterSpacing="1.5"><textPath href={`#${u("rim-top")}`} startOffset="50%" textAnchor="middle">{labels.ruler.toLocaleUpperCase(document.documentElement.lang || undefined)}</textPath></text>
          <text x="100" y="172" textAnchor="middle" fontSize="12" fontFamily="Georgia, serif" fill={ink}>{c.year}</text>
        </>
      ) : (
        <>
          {Array.from({ length: 9 }, (_, i) => <ellipse key={`l${i}`} cx={64 + i * 2} cy={150 - i * 10} rx="7" ry="3" fill={ink} opacity=".5" transform={`rotate(${-60 + i * 8} ${64 + i * 2} ${150 - i * 10})`} />)}
          {Array.from({ length: 9 }, (_, i) => <ellipse key={`r${i}`} cx={136 - i * 2} cy={150 - i * 10} rx="7" ry="3" fill={ink} opacity=".5" transform={`rotate(${60 - i * 8} ${136 - i * 2} ${150 - i * 10})`} />)}
          <text x="100" y="118" textAnchor="middle" fontSize="26" fontFamily="Georgia, serif" fill={ink}>{labels.denomination}</text>
          <text fontSize="10" fontFamily="Georgia, serif" fill={ink} letterSpacing="2"><textPath href={`#${u("rim-top")}`} startOffset="50%" textAnchor="middle">{k.realm.toLocaleUpperCase(document.documentElement.lang || undefined)}</textPath></text>
          <Fine><text x="100" y="140" textAnchor="middle" fontSize="6" fontFamily="Georgia, serif" fill={ink}>{c.mint}</text></Fine>
        </>
      )}
      {!uv && <ellipse cx="72" cy="80" rx="28" ry="12" fill="#fff" opacity=".22" transform="rotate(-30 72 80)" />}
    </g>
  );
}

function CoinEdge({ c, uv }: { c: CoinItem; uv: boolean }) {
  const u = useU();
  const [a, b, cc] = METAL[c.looksLike];
  const w = 150, h = 22, x = 25, y = 101;
  return (
    <g>
      <defs><linearGradient id={u("edge")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={cc} /><stop offset=".5" stopColor={b} /><stop offset="1" stopColor={a} /></linearGradient></defs>
      <rect x={x} y={y} width={w} height={h} rx="6" fill={uv ? "#2a2240" : `url(#${u("edge")})`} stroke="rgba(0,0,0,.35)" />
      {c.edge === "reeded" && Array.from({ length: 60 }, (_, i) => <line key={i} x1={x + 4 + i * 2.4} y1={y + 2} x2={x + 4 + i * 2.4} y2={y + h - 2} stroke="rgba(0,0,0,.35)" strokeWidth=".7" />)}
      {c.edge === "lettered" && <text x={x + w / 2} y={y + 14} textAnchor="middle" fontSize="7" letterSpacing="1.2" fontFamily="Georgia, serif" fill="rgba(0,0,0,.5)">✦ DECUS · ET · FIDES · ✦ DECUS · ET · FIDES</text>}
      <ellipse cx={x + w / 2} cy={y + 60} rx="70" ry="6" fill="rgba(0,0,0,.08)" />
    </g>
  );
}

export type CoinLabels = { ruler: string; denomination: string };

// ---------- Tablo ----------
const PALETTES = [
  { sky: ["#f2c98b", "#e59a6a"], hills: ["#6b7a4b", "#4f5d38", "#394528"], water: "#8fa7a8", sun: "#fff1c9" },
  { sky: ["#bcd3e0", "#e9e2cf"], hills: ["#7d8f6a", "#5f7352", "#44573d"], water: "#9fb8c2", sun: "#fffbe8" },
  { sky: ["#3b4a6b", "#9d7a8c"], hills: ["#2f3a4a", "#232c38", "#171e27"], water: "#56637d", sun: "#f3e3b5" },
  { sky: ["#e8d6b5", "#c9b594"], hills: ["#8a6f4a", "#6d5738", "#4f3f28"], water: "#a39880", sun: "#fff4d6" },
  { sky: ["#cfe0d5", "#f0e7d2"], hills: ["#6d8a6a", "#4f6b52", "#355040"], water: "#90b3a8", sun: "#ffffff" },
];

function PaintingFront({ p, uv }: { p: PaintingItem; uv: boolean }) {
  const u = useU();
  const a = artistById(p.artistId);
  const r = createRng(p.scene);
  const pal = PALETTES[p.palette % PALETTES.length];
  const x0 = 22, y0 = 36, W = 156, H = 150;
  const hills = pal.hills.map((col, i) => {
    const base = y0 + H * (0.45 + i * 0.14);
    let d = `M${x0} ${base}`;
    for (let k = 0; k < 6; k++) d += ` Q${x0 + (k + 0.5) * W / 6} ${base - r.int(6, 26)} ${x0 + (k + 1) * W / 6} ${base - r.int(0, 10)}`;
    d += ` L${x0 + W} ${y0 + H} L${x0} ${y0 + H} Z`;
    return <path key={i} d={d} fill={col} />;
  });
  const surname = a.name.split(" ").slice(-1)[0];
  const sigX = p.corner === "bl" ? x0 + 8 : x0 + W - 8;
  const sigAnchor = p.corner === "bl" ? "start" : "end";
  const sunX = x0 + r.int(30, W - 30), sunY = y0 + r.int(20, 50);
  const trees = Array.from({ length: r.int(2, 5) }, () => ({ x: x0 + r.int(10, W - 10), y: y0 + H * 0.72 + r.int(0, 20), h: r.int(14, 28) }));
  return (
    <g>
      <defs>
        <linearGradient id={u("sky")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={pal.sky[0]} /><stop offset="1" stopColor={pal.sky[1]} /></linearGradient>
        <linearGradient id={u("frame")} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8a6424" /><stop offset=".5" stopColor="#e0b75c" /><stop offset="1" stopColor="#7a5520" /></linearGradient>
        <filter id={u("glow")}><feGaussianBlur stdDeviation="1.4" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <clipPath id={u("canvasClip")}><rect x={x0} y={y0} width={W} height={H} /></clipPath>
      </defs>
      <rect x={x0 - 14} y={y0 - 14} width={W + 28} height={H + 28} fill={uv ? "#3a3156" : `url(#${u("frame")})`} stroke="#5a3e14" />
      <rect x={x0 - 4} y={y0 - 4} width={W + 8} height={H + 8} fill="none" stroke="#5a3e14" strokeWidth="1.5" />
      <g clipPath={`url(#${u("canvasClip")})`}>
      <rect x={x0} y={y0} width={W} height={H} fill={`url(#${u("sky")})`} />
      <circle cx={sunX} cy={sunY} r="11" fill={pal.sun} opacity=".9" />
      {hills}
      <rect x={x0} y={y0 + H * 0.84} width={W} height={H * 0.16} fill={pal.water} opacity=".85" />
      {trees.map((tr, i) => <g key={i}><rect x={tr.x - 1} y={tr.y - 2} width="2" height="8" fill="#3a2a18" /><ellipse cx={tr.x} cy={tr.y - tr.h / 2} rx={tr.h / 3.2} ry={tr.h / 2} fill="#2f3d24" /></g>)}
      {/* Fırça dokusu */}
      {Array.from({ length: 70 }, (_, i) => { const x = x0 + r.int(2, W - 12), y = y0 + r.int(2, H - 4), len = r.int(4, 10); return <line key={i} x1={x} y1={y} x2={x + len} y2={y + r.int(-2, 2)} stroke={i % 3 ? "#000" : "#fff"} strokeWidth=".7" strokeLinecap="round" opacity=".06" />; })}
      </g>
      <text x={sigX} y={y0 + H - 6} textAnchor={sigAnchor} fontSize="7" fontStyle="italic" fontFamily="'Brush Script MT', 'Segoe Script', cursive" fill="#2a1b10">{surname}</text>
      {uv && (
        <g>
          {/* UV: eski vernik yeşilimsi floresan verir; sonradan eklenen boya koyu, sonradan eklenen imza parlak görünür */}
          <rect x={x0} y={y0} width={W} height={H} fill="#1d1640" opacity=".78" />
          <rect x={x0} y={y0} width={W} height={H} fill="#5f7d4a" opacity=".25" />
          <text x={sigX} y={y0 + H - 6} textAnchor={sigAnchor} fontSize="7" fontStyle="italic" fontFamily="'Brush Script MT', 'Segoe Script', cursive"
            fill={p.uvSignature ? "#f3fff0" : "#2a2440"} filter={p.uvSignature ? `url(#${u("glow")})` : undefined}>{surname}</text>
        </g>
      )}
    </g>
  );
}

function PaintingBack({ p, uv }: { p: PaintingItem; uv: boolean }) {
  const u = useU();
  const a = artistById(p.artistId);
  const x0 = 22, y0 = 36, W = 156, H = 150;
  const canvasFill = { linen: "#d9c8a4", jute: "#a8845a", synthetic: "#f1f0ec" }[p.canvas];
  const weave = { linen: 2.2, jute: 4.5, synthetic: 0 }[p.canvas];
  return (
    <g>
      <defs>
        <pattern id={u("weave")} width={weave || 4} height={weave || 4} patternUnits="userSpaceOnUse">
          {weave > 0 && <path d={`M0 0 H${weave} M0 0 V${weave}`} stroke="rgba(60,40,15,.35)" strokeWidth={weave > 3 ? 1.2 : 0.5} />}
        </pattern>
        <linearGradient id={u("sheen")} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".5" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /></linearGradient>
      </defs>
      <rect x={x0 - 6} y={y0 - 6} width={W + 12} height={H + 12} fill={uv ? "#2a2240" : canvasFill} />
      {!uv && <rect x={x0 - 6} y={y0 - 6} width={W + 12} height={H + 12} fill={`url(#${u("weave")})`} />}
      {!uv && p.canvas === "synthetic" && <rect x={x0 - 6} y={y0 - 6} width={W + 12} height={H + 12} fill={`url(#${u("sheen")})`} />}
      {/* Kasnak çıtaları */}
      <g fill={uv ? "#352c52" : "#b48a55"} stroke="rgba(0,0,0,.3)">
        <rect x={x0 - 6} y={y0 - 6} width={W + 12} height="10" /><rect x={x0 - 6} y={y0 + H - 4} width={W + 12} height="10" />
        <rect x={x0 - 6} y={y0 - 6} width="10" height={H + 12} /><rect x={x0 + W - 4} y={y0 - 6} width="10" height={H + 12} />
        <rect x={x0 + W / 2 - 4} y={y0} width="8" height={H} />
      </g>
      {/* Galeri etiketi */}
      <g transform={`translate(${x0 + 18} ${y0 + 28}) rotate(-2)`}>
        <rect width="54" height="32" fill={uv ? "#3b3456" : "#f3ead2"} stroke="rgba(0,0,0,.3)" />
        <text x="27" y="10" textAnchor="middle" fontSize="4.6" fontFamily="Georgia, serif" fill="#3a2a18">{a.name}</text>
        <line x1="6" y1="14" x2="48" y2="14" stroke="#3a2a18" strokeWidth=".3" />
        <text x="27" y="23" textAnchor="middle" fontSize="5" fontFamily="'Courier New', monospace" fill="#3a2a18">{p.year}</text>
      </g>
    </g>
  );
}

// ---------- Ana bileşen ----------
export function ItemArt({ item, view, uv, coinLabels, size = 300, sharp = false }: { item: Item; view: View; uv: boolean; coinLabels?: CoinLabels; size?: number; sharp?: boolean }) {
  let body: ReactElement;
  if (item.cat === "watch") body = view === "front" ? <WatchFront w={item} uv={uv} /> : view === "back" ? <WatchBack w={item} uv={uv} /> : <WatchInner w={item} uv={uv} />;
  else if (item.cat === "coin") body = view === "inner" ? <CoinEdge c={item} uv={uv} /> : <CoinFace c={item} side={view} uv={uv} labels={coinLabels ?? { ruler: "", denomination: "1" }} />;
  else body = view === "back" ? <PaintingBack p={item} uv={uv} /> : <PaintingFront p={item} uv={uv} />;
  const uid = useId().replace(/:/g, "");
  return (
    <UidCtx.Provider value={uid}>
    <SharpCtx.Provider value={sharp}>
    <svg viewBox="0 0 200 212" width={size} height={size * 1.06} className="item-art" aria-hidden="true">
      <defs><filter id={`${uid}-fine`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.25" /></filter></defs>
      {body}
    </svg>
    </SharpCtx.Provider>
    </UidCtx.Provider>
  );
}

/** Küçük önizleme (rapor ekranı için). */
export function ItemThumb({ item, coinLabels }: { item: Item; coinLabels?: CoinLabels }) {
  return <ItemArt item={item} view="front" uv={false} coinLabels={coinLabels} size={56} sharp />;
}

export function pigmentColor(id: keyof typeof PIGMENTS) { return PIGMENTS[id].color; }
