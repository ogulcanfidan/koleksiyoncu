// Yerel bildirimler: haklar dolduğunda ya da günlük içerik geldiğinde haber verir.
// Sunucu gerekmez; bildirim telefonun kendisinde zamanlanır.
import { Capacitor } from "@capacitor/core";
import { load, save } from "./storage";

type Pref = { enabled: boolean; asked: boolean };
const pref = load<Pref>("pref-notify", { enabled: true, asked: false });

export function notificationsEnabled() { return pref.enabled; }

export async function setNotificationsEnabled(on: boolean): Promise<boolean> {
  if (on) {
    const ok = await ensurePermission();
    pref.enabled = ok;
  } else {
    pref.enabled = false;
    await cancelAll();
  }
  save("pref-notify", pref);
  return pref.enabled;
}

async function ensurePermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  let p = await LocalNotifications.checkPermissions();
  if (p.display !== "granted") p = await LocalNotifications.requestPermissions();
  pref.asked = true; save("pref-notify", pref);
  return p.display === "granted";
}

async function cancelAll() {
  if (!Capacitor.isNativePlatform()) return;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
}

/**
 * Tek bir hatırlatmayı (aynı id ile) yeniden zamanlar.
 * Oyun her hak harcadığında ya da açıldığında çağırır.
 */
export async function scheduleReminder(id: number, at: Date | null, title: string, body: string) {
  if (!pref.enabled || !Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: [{ id }] });
    if (!at || at.getTime() < Date.now() + 60_000) return;
    if (!pref.asked && !(await ensurePermission())) return;
    await LocalNotifications.schedule({
      notifications: [{ id, title, body, schedule: { at, allowWhileIdle: true } }],
    });
  } catch (e) { console.warn("Bildirim zamanlanamadı", e); }
}
