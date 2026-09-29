// Sakin müzik ve yumuşak efektler, tamamen kodla üretilir (telif derdi yok, dosya boyutu sıfır).
// Müzik: yavaş değişen yumuşak akorlar + ara sıra tek tük piyano benzeri notalar + çok hafif yağmur/oda sesi.
import { load, save } from "./storage";

type Pref = { music: number; sfx: number; haptics: boolean };
const pref = load<Pref>("pref-audio", { music: 0.35, sfx: 0.6, haptics: true });

let ctx: AudioContext | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let musicTimer: number | null = null;
let ambience: AudioBufferSourceNode | null = null;
let theme: MusicTheme = "shop";

export type MusicTheme = "shop" | "office";
export type Sfx = "tap" | "open" | "close" | "good" | "bad" | "coin" | "stamp" | "paper" | "unlock" | "tool";

export function getAudioPrefs() { return { ...pref }; }
export function setMusicVolume(v: number) { pref.music = v; save("pref-audio", pref); if (musicGain && ctx) musicGain.gain.setTargetAtTime(v * 0.22, ctx.currentTime, 0.3); }
export function setSfxVolume(v: number) { pref.sfx = v; save("pref-audio", pref); if (sfxGain && ctx) sfxGain.gain.setTargetAtTime(v * 0.5, ctx.currentTime, 0.05); }
export function setHaptics(on: boolean) { pref.haptics = on; save("pref-audio", pref); }

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  try {
    ctx = new AudioContext();
    musicGain = ctx.createGain(); musicGain.gain.value = pref.music * 0.22;
    sfxGain = ctx.createGain(); sfxGain.gain.value = pref.sfx * 0.5;
    // Tüm sesleri yumuşatan hafif bir filtre + sıkıştırıcı: ani yüksek ses olmasın.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -24; comp.ratio.value = 4;
    musicGain.connect(comp); sfxGain.connect(comp); comp.connect(ctx.destination);
  } catch { ctx = null; }
  return ctx;
}

/** Tarayıcılar sesi ancak kullanıcı dokunduktan sonra açar; ilk dokunuşta çağrılır. */
export function unlockAudio() {
  const c = ensure(); if (!c) return;
  if (c.state === "suspended") c.resume();
  if (musicTimer == null) startMusic();
}

export function setMusicTheme(t: MusicTheme) { theme = t; }

document.addEventListener("visibilitychange", () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend(); else ctx.resume();
});

// ---------- Müzik ----------
const SCALES: Record<MusicTheme, number[][]> = {
  // Akor ilerlemeleri (MIDI nota numaraları). Yumuşak, çözülmeyen, "düşünme" hissi veren akorlar.
  shop: [[50, 57, 62, 65, 69], [46, 53, 58, 62, 65], [48, 55, 60, 64, 67], [45, 52, 57, 60, 64]],
  office: [[48, 55, 59, 64, 67], [45, 52, 57, 60, 64], [41, 48, 53, 57, 60], [43, 50, 55, 59, 62]],
};
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function pad(freq: number, start: number, dur: number, level: number) {
  const c = ctx!;
  const o1 = c.createOscillator(), o2 = c.createOscillator();
  o1.type = "sine"; o2.type = "triangle";
  o1.frequency.value = freq; o2.frequency.value = freq * 1.003;
  const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900;
  const g = c.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(level, start + dur * 0.35);
  g.gain.linearRampToValueAtTime(0, start + dur);
  o1.connect(f); o2.connect(f); f.connect(g); g.connect(musicGain!);
  o1.start(start); o2.start(start); o1.stop(start + dur + 0.1); o2.stop(start + dur + 0.1);
}

function pluck(freq: number, start: number, level: number) {
  const c = ctx!;
  const o = c.createOscillator(); o.type = "sine"; o.frequency.value = freq;
  const o2 = c.createOscillator(); o2.type = "sine"; o2.frequency.value = freq * 2;
  const g = c.createGain(), g2 = c.createGain();
  g.gain.setValueAtTime(0, start); g.gain.linearRampToValueAtTime(level, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + 2.6);
  g2.gain.value = 0.15;
  o.connect(g); o2.connect(g2); g2.connect(g); g.connect(musicGain!);
  o.start(start); o2.start(start); o.stop(start + 2.8); o2.stop(start + 2.8);
}

function noiseBuffer(seconds: number): AudioBuffer {
  const c = ctx!;
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
  return buf;
}

function startAmbience() {
  const c = ctx!;
  const src = c.createBufferSource(); src.buffer = noiseBuffer(4); src.loop = true;
  const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 700;
  const g = c.createGain(); g.gain.value = 0.18;
  src.connect(f); f.connect(g); g.connect(musicGain!); src.start();
  ambience = src;
}

function startMusic() {
  const c = ctx!;
  if (!ambience) startAmbience();
  let step = 0;
  const bar = 8; // saniye
  const schedule = () => {
    const chords = SCALES[theme];
    const chord = chords[step % chords.length];
    const t0 = c.currentTime + 0.1;
    chord.slice(0, 4).forEach((m, i) => pad(mtof(m), t0 + i * 0.05, bar + 1.5, 0.05));
    // Bir akor süresince 2-3 seyrek nota
    const notes = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < notes; i++) {
      const m = chord[1 + Math.floor(Math.random() * (chord.length - 1))] + 12;
      pluck(mtof(m), t0 + 0.8 + Math.random() * (bar - 2), 0.05);
    }
    step++;
  };
  schedule();
  musicTimer = window.setInterval(schedule, bar * 1000);
}

// ---------- Efektler ----------
function tone(freq: number, dur: number, type: OscillatorType, level: number, when = 0, slideTo?: number) {
  const c = ensure(); if (!c || !sfxGain) return;
  const t = c.currentTime + when;
  const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(level, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur: number, freq: number, level: number, when = 0) {
  const c = ensure(); if (!c || !sfxGain) return;
  const t = c.currentTime + when;
  const src = c.createBufferSource(); src.buffer = noiseBuffer(Math.max(0.2, dur));
  const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(sfxGain); src.start(t); src.stop(t + dur + 0.05);
}

export function sfx(kind: Sfx) {
  if (pref.sfx <= 0) return;
  switch (kind) {
    case "tap": tone(880, 0.06, "sine", 0.12); break;
    case "open": noise(0.18, 1800, 0.25); break;
    case "close": noise(0.12, 900, 0.2); break;
    case "paper": noise(0.25, 2500, 0.18); noise(0.15, 1500, 0.12, 0.1); break;
    case "tool": tone(520, 0.08, "triangle", 0.12); tone(780, 0.1, "sine", 0.08, 0.05); break;
    case "good": tone(659, 0.35, "sine", 0.16); tone(880, 0.45, "sine", 0.14, 0.1); tone(1319, 0.6, "sine", 0.06, 0.2); break;
    case "bad": tone(220, 0.35, "sine", 0.18, 0, 180); break;
    case "coin": tone(1568, 0.12, "sine", 0.1); tone(2093, 0.3, "sine", 0.08, 0.07); break;
    case "stamp": noise(0.09, 300, 0.5); tone(90, 0.15, "sine", 0.3); break;
    case "unlock": [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5, "sine", 0.1, i * 0.09)); break;
  }
  if (pref.haptics && "vibrate" in navigator) {
    try { navigator.vibrate(kind === "bad" ? 40 : kind === "stamp" ? 25 : kind === "good" ? [10, 30, 10] : 0); } catch { /* yok say */ }
  }
}
