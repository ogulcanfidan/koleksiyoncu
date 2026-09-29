// Reklam servisi: ödüllü reklam + seyrek geçiş reklamı.
// Telefonda AdMob kullanır (yayın derlemesinde gerçek, test derlemesinde Google test reklamları).
// Tarayıcıda gerçek reklam olmadığı için kısa bir taklit gösterilir.
// "Reklamsız" paketi alınmışsa: geçiş reklamı hiç çıkmaz, ödüllü reklamın ödülü reklamsız verilir.
import { Capacitor } from "@capacitor/core";
import { load, save } from "./storage";

// Yayın derlemesi gerçek AdMob reklam birimlerini kullanır. Test derlemesi (--mode testing) ve tarayıcı
// Google'ın herkese açık test reklamlarını gösterir: geliştirici kendi reklamına tıklayıp hesabı riske atmasın.
const TESTING = import.meta.env.VITE_STORE_MOCK === "1" || !Capacitor.isNativePlatform();
const REAL = {
  // AdMob: "The Collector: Real or Fake" (ca-app-pub-2569162850712494~2912269569)
  android: { rewarded: "ca-app-pub-2569162850712494/8715085570", interstitial: "ca-app-pub-2569162850712494/3407093586" },
  ios: { rewarded: "", interstitial: "" }, // iOS uygulaması AdMob'a eklenince doldurulacak
};
const TEST = {
  android: { rewarded: "ca-app-pub-3940256099942544/5224354917", interstitial: "ca-app-pub-3940256099942544/1033173712" },
  ios: { rewarded: "ca-app-pub-3940256099942544/1712485313", interstitial: "ca-app-pub-3940256099942544/4411468910" },
};
const IDS = TESTING ? TEST : REAL;

type WebAdHandler = (kind: "rewarded" | "interstitial") => Promise<boolean>;
let webHandler: WebAdHandler | null = null;
let initialized = false;

const pref = load<{ adFree: boolean; lastInterstitial: number }>("ads-state", { adFree: false, lastInterstitial: 0 });

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

/**
 * Geçiş reklamı: yalnızca doğal molalarda (gün sonu gibi) çağrılır.
 * minGapMinutes içinde ikinci kez gösterilmez; reklamsız pakette hiç gösterilmez.
 */
export async function maybeShowInterstitial(minGapMinutes = 4): Promise<void> {
  if (pref.adFree) return;
  if (Date.now() - pref.lastInterstitial < minGapMinutes * 60_000) return;
  pref.lastInterstitial = Date.now(); save("ads-state", pref);
  if (!Capacitor.isNativePlatform()) { if (webHandler) await webHandler("interstitial"); return; }
  try {
    await initNative();
    const { AdMob } = await import("@capacitor-community/admob");
    await AdMob.prepareInterstitial({ adId: ids().interstitial, isTesting: TESTING });
    await AdMob.showInterstitial();
  } catch (e) { console.warn("Geçiş reklamı gösterilemedi", e); }
}

export async function openAdPrivacyOptions() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await initNative();
    const { AdMob } = await import("@capacitor-community/admob");
    await AdMob.showPrivacyOptionsForm();
  } catch (e) { console.warn(e); }
}
