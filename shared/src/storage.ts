// Basit kalıcı depolama. WebView içinde localStorage kalıcıdır; erişilemezse bellekte tutar.
const memory = new Map<string, string>();

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw != null) return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    const raw = memory.get(key);
    if (raw != null) return { ...fallback, ...JSON.parse(raw) } as T;
  }
  return structuredClone(fallback);
}

export function save(key: string, value: unknown): void {
  const raw = JSON.stringify(value);
  try { localStorage.setItem(key, raw); } catch { memory.set(key, raw); }
}

export function remove(key: string): void {
  try { localStorage.removeItem(key); } catch { memory.delete(key); }
}

/** Yerel saate göre gün anahtarı: 2026-09-28 */
export function dayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** UTC gün numarası: herkes için aynı günlük içerik tohumu */
export function utcDayNumber(d = new Date()): number {
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86400000);
}
