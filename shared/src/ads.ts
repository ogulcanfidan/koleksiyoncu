// Reklam servisi: yalnızca isteğe bağlı ödüllü reklam (geçiş reklamı yok).
// Telefonda AdMob kullanır (yayın derlemesinde gerçek, test derlemesinde Google test reklamları).
// Tarayıcıda gerçek reklam olmadığı için kısa bir taklit gösterilir.
// "Reklamsız" paketi alınmışsa ödüllü reklamın ödülü reklam izlemeden verilir.
import { Capacitor } from "@capacitor/core";
import { load, save } from "./storage";

// Yayın derlemesi gerçek AdMob reklam birimlerini kullanır. Test derlemesi (--mode testing) ve tarayıcı
// Google'ın herkese açık test reklamlarını gösterir: geliştirici kendi reklamına tıklayıp hesabı riske atmasın.
const TESTING = import.meta.env.VITE_STORE_MOCK === "1" || !Capacitor.isNativePlatform();
const REAL = {
  // AdMob: "The Collector: Real or Fake" (ca-app-pub-2569162850712494~2912269569)
  android: { rewarded: "ca-app-pub-2569162850712494/8715085570" },
  ios: { rewarded: "" }, // iOS uygulaması AdMob'a eklenince doldurulacak
};
const TEST = {
  android: { rewarded: "ca-app-pub-3940256099942544/5224354917" },
  ios: { rewarded: "ca-app-pub-3940256099942544/1712485313" },
};
const IDS = TESTING ? TEST : REAL;

type WebAdHandler = (kind: "rewarded") => Promise<boolean>;
let webHandler: WebAdHandler | null = null;
let initialized = false;

const pref = load<{ adFree: boolean }>("ads-state", { adFree: false });

/** Tarayıcı modunda reklam taklidini gösterecek bileşen kendini buraya kaydeder. */
export function registerWebAdHandler(h: WebAdHandler) { webHandler = h; }

export function isAdFree() { return pref.adFree; }
export function setAdFree(on: boolean) { pref.adFree = on; save("ads-state", pref); }

const ids = () => (Capacitor.getPlatform() === "ios" ? IDS.ios : IDS.android);

async function initNative() {
  if (initialized) return;
  const { AdMob } = await import("@capacitor-community/admob");
  await AdMob.initialize({ initializeForTesting: TESTING });
  // AB/İngiltere kullanıcıları için Google UMP onay formu (GDPR).
  try {
    const info = await AdMob.requestConsentInfo();
    if (info.isConsentFormAvailable && info.status === "REQUIRED") await AdMob.showConsentForm();
  } catch { /* onay bilgisi alınamazsa sınırlı reklamla devam edilir */ }
  initialized = true;
}

/** AdMob "gösterilecek reklam yok" hatası (kod 3). Bağlantı hatasından ayırmak için. */
function isNoFill(e: unknown): boolean {
  const any = e as { code?: number; message?: string } | undefined;
  return any?.code === 3 || /no.?fill|code.?3|no ad to show/i.test(String(any?.message ?? e));
}

/**
 * Ödüllü reklam sonucu:
 * - "rewarded": reklam izlendi ya da oyuncu reklamsız paketi aldı → ödül ver.
 * - "noFill": AdMob gösterecek reklam bulamadı (yeni uygulamalarda ve bazı ülkelerde sık olur).
 *   Oyuncunun suçu olmadığı için ödül yine verilir; günlük sınır aynen işler.
 * - "failed": bağlantı yok ya da başka bir hata → ödül yok, oyuncuya söylenir.
 * - "closed": oyuncu reklamı yarıda kapattı → ödül yok.
 */
export type RewardedResult = "rewarded" | "noFill" | "failed" | "closed";

export async function showRewardedAd(): Promise<RewardedResult> {
  if (pref.adFree) return "rewarded";
  if (!Capacitor.isNativePlatform()) return (webHandler ? await webHandler("rewarded") : true) ? "rewarded" : "closed";
  try {
    await initNative();
    const { AdMob } = await import("@capacitor-community/admob");
    await AdMob.prepareRewardVideoAd({ adId: ids().rewarded, isTesting: TESTING });
    const reward = await AdMob.showRewardVideoAd();
    return reward ? "rewarded" : "closed";
  } catch (e) {
    console.warn("Reklam gösterilemedi", e);
    return isNoFill(e) ? "noFill" : "failed";
  }
}

export async function openAdPrivacyOptions() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await initNative();
    const { AdMob } = await import("@capacitor-community/admob");
    await AdMob.showPrivacyOptionsForm();
  } catch (e) { console.warn(e); }
}
