// Kodla üretilen karakter portreleri (çizer gerektirmez). Aynı tohum = aynı yüz.
import { createRng } from "./random";

export type AvatarSpec = {
  seed: number | string;
  age?: "young" | "adult" | "old";
  gender?: "f" | "m" | "x";
  mood?: "neutral" | "happy" | "sad" | "angry" | "nervous";
};

const SKINS = ["#f6d7c3", "#eec3a4", "#dca47f", "#c68863", "#a86b48", "#7c4a2d", "#5a3522"];
const HAIRS = ["#1f1a17", "#3b2a20", "#5b3a24", "#8a5a33", "#b98a4e", "#d9b779", "#7a2e1e"];
const CLOTHES = ["#3d5a80", "#6b4f7a", "#2f6f5e", "#8c3b3b", "#4a4a4a", "#9a7b3d", "#3f4f6b", "#7a5c48", "#2c3e50"];

export function Avatar({ spec, size = 72, className }: { spec: AvatarSpec; size?: number; className?: string }) {
  const r = createRng(spec.seed);
  const gender = spec.gender ?? r.pick(["f", "m"] as const);
  const age = spec.age ?? r.pick(["young", "adult", "adult", "old"] as const);
  const skin = r.pick(SKINS);
  const hairColor = age === "old" ? r.pick(["#d8d4cc", "#b9b4ab", "#8f8a82"]) : r.pick(HAIRS);
  const cloth = r.pick(CLOTHES);
  const bg = r.pick(["#efe3cf", "#e3e8ef", "#e8efe3", "#efe3e8", "#e9e4f2", "#f2ead9"]);
  const glasses = r.chance(age === "old" ? 0.55 : 0.25);
  const beard = gender === "m" && r.chance(0.4);
  const mustache = gender === "m" && !beard && r.chance(0.3);
  const hat = r.chance(0.12);
  const hairStyle = gender === "f" ? r.pick(["long", "bun", "bob", "curly"] as const) : r.pick(["short", "side", "bald", "curly"] as const);
  const faceW = r.int(30, 35), faceH = r.int(38, 42);
  const eyeY = 50 + r.int(-1, 2);
  const mood = spec.mood ?? "neutral";
  const mouth = {
    neutral: "M44 70 Q50 72 56 70",
    happy: "M42 68 Q50 76 58 68",
    sad: "M43 72 Q50 67 57 72",
    angry: "M43 71 L57 70",
    nervous: "M43 70 Q46 68 49 70 Q52 72 55 70 Q56 69 57 70",
  }[mood];
  const brow = mood === "angry" ? ["M36 43 L45 46", "M55 46 L64 43"] : mood === "sad" || mood === "nervous" ? ["M36 45 L45 43", "M55 43 L64 45"] : ["M36 44 Q40 42 45 44", "M55 44 Q60 42 64 44"];

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true">
      <rect width="100" height="100" rx="18" fill={bg} />
      {/* Arka saç */}
      {(hairStyle === "long") && <path d={`M${50 - faceW - 4} 50 Q50 ${2} ${50 + faceW + 4} 50 L${50 + faceW + 2} 92 L${50 - faceW - 2} 92 Z`} fill={hairColor} />}
      {hairStyle === "bun" && <circle cx="50" cy="16" r="10" fill={hairColor} />}
      {/* Gövde */}
      <path d={`M14 100 Q16 78 50 76 Q84 78 86 100 Z`} fill={cloth} />
      <path d="M44 77 L50 86 L56 77" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" />
      {/* Boyun ve yüz */}
      <rect x="43" y="64" width="14" height="14" rx="5" fill={skin} />
      <ellipse cx="50" cy="52" rx={faceW - 10} ry={faceH - 16} fill={skin} />
      <ellipse cx={50 - faceW + 9} cy="54" rx="4" ry="6" fill={skin} />
      <ellipse cx={50 + faceW - 9} cy="54" rx="4" ry="6" fill={skin} />
      {age === "old" && <g stroke="rgba(0,0,0,.18)" strokeWidth="1" fill="none"><path d="M38 60 Q40 63 43 63" /><path d="M62 60 Q60 63 57 63" /><path d="M42 38 L58 38" /></g>}
      {/* Ön saç */}
      {hairStyle === "short" && <path d={`M${50 - faceW + 9} 48 Q50 18 ${50 + faceW - 9} 48 Q58 34 42 36 Z`} fill={hairColor} />}
      {hairStyle === "side" && <path d={`M${50 - faceW + 9} 50 Q46 16 ${50 + faceW - 9} 46 Q60 30 38 40 Z`} fill={hairColor} />}
      {hairStyle === "curly" && <g fill={hairColor}>{[30, 38, 46, 54, 62, 70].map((x, i) => <circle key={i} cx={x} cy={i % 2 ? 30 : 34} r="8" />)}</g>}
      {(hairStyle === "long" || hairStyle === "bob" || hairStyle === "bun") && <path d={`M${50 - faceW + 8} 52 Q50 14 ${50 + faceW - 8} 52 Q62 30 50 32 Q38 30 ${50 - faceW + 8} 52 Z`} fill={hairColor} />}
      {hairStyle === "bob" && <g fill={hairColor}><rect x={50 - faceW + 6} y="40" width="8" height="28" rx="4" /><rect x={50 + faceW - 14} y="40" width="8" height="28" rx="4" /></g>}
      {hairStyle === "bald" && <path d={`M${50 - faceW + 9} 52 Q${50 - faceW + 10} 44 ${50 - faceW + 14} 42`} stroke={hairColor} strokeWidth="4" fill="none" />}
      {hat && <g><rect x="28" y="24" width="44" height="6" rx="3" fill="#3a3129" /><rect x="35" y="10" width="30" height="16" rx="5" fill="#3a3129" /></g>}
      {/* Yüz detayları */}
      <g stroke="#2a211b" strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d={brow[0]} /><path d={brow[1]} />
      </g>
      <circle cx="41" cy={eyeY} r="2.2" fill="#2a211b" />
      <circle cx="59" cy={eyeY} r="2.2" fill="#2a211b" />
      <path d={`M50 ${eyeY + 3} Q48 ${eyeY + 10} 51 ${eyeY + 11}`} stroke="rgba(0,0,0,.25)" strokeWidth="1.4" fill="none" />
      {glasses && <g stroke="#2a211b" strokeWidth="1.4" fill="rgba(255,255,255,.15)"><circle cx="41" cy={eyeY} r="6" /><circle cx="59" cy={eyeY} r="6" /><path d={`M47 ${eyeY} L53 ${eyeY}`} /></g>}
      {beard && <path d={`M${50 - faceW + 11} 58 Q50 88 ${50 + faceW - 11} 58 Q58 74 50 74 Q42 74 ${50 - faceW + 11} 58 Z`} fill={hairColor} opacity=".92" />}
      {mustache && <path d="M42 66 Q50 61 58 66 Q50 64 42 66 Z" fill={hairColor} />}
      <path d={mouth} stroke="#7a3b30" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {mood === "nervous" && <path d="M66 40 q2 4 0 6 q-2 -2 0 -6" fill="#8ec5ff" />}
    </svg>
  );
}
