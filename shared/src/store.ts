// Uygulama içi satın alma (Google Play Billing / App Store) — @capgo/native-purchases.
// Ürünler Play Console'da aynı kimliklerle oluşturulmalı. Oluşturulana kadar mağaza boş döner.
// TEST MODU: tarayıcıda ve "testing" derlemesinde (VITE_STORE_MOCK=1) gerçek ödeme alınmaz,
// onay penceresiyle satın alma taklit edilir. Yayın derlemesinde test modu kapalıdır.
import { Capacitor } from "@capacitor/core";
import { useSyncExternalStore } from "react";
import { load, save } from "./storage";

export type ProductDef = { id: string; consumable: boolean; fallbackPrice: string };

type MockHandler = (p: ProductDef, price: string) => Promise<boolean>;
let mockHandler: MockHandler | null = null;
export function registerMockPurchaseHandler(h: MockHandler) { mockHandler = h; }

const MOCK = !Capacitor.isNativePlatform() || import.meta.env.VITE_STORE_MOCK === "1";
export const storeIsTestMode = () => MOCK;

let products: ProductDef[] = [];
const prices: Record<string, string> = {};
const owned = load<{ ids: string[] }>("store-owned", { ids: [] });
const listeners = new Set<() => void>();
let snap = 0;
let available = MOCK;
function emit() { snap++; listeners.forEach(l => l()); }

export function useStore() {
  useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => snap);
}

export function storeAvailable() { return available; }
export function priceOf(id: string) { return prices[id] ?? products.find(p => p.id === id)?.fallbackPrice ?? ""; }
export function isOwned(id: string) { return owned.ids.includes(id); }

/** Açılışta bir kez: ürünleri ve fiyatları yükler, satın alınmış kalıcı ürünleri geri getirir. */
export async function initStore(defs: ProductDef[], onRestore: (id: string) => void) {
  products = defs;
  if (MOCK) { emit(); return; }
  try {
    const { NativePurchases, PURCHASE_TYPE } = await import("@capgo/native-purchases");
    const { isBillingSupported } = await NativePurchases.isBillingSupported();
    if (!isBillingSupported) return;
    const res = await NativePurchases.getProducts({ productIdentifiers: defs.map(d => d.id), productType: PURCHASE_TYPE.INAPP });
    for (const p of res.products) prices[p.identifier] = p.priceString;
    available = res.products.length > 0;
    await restorePurchases(onRestore);
  } catch (e) { console.warn("Mağaza yüklenemedi", e); }
  emit();
}

/** Satın alma. Başarılıysa true. Kalıcı ürünler "owned" listesine yazılır. */
export async function purchase(id: string): Promise<boolean> {
  const def = products.find(p => p.id === id);
  if (!def) return false;
  let ok = false;
  if (MOCK) {
    ok = mockHandler ? await mockHandler(def, priceOf(id)) : false;
  } else {
    try {
      const { NativePurchases, PURCHASE_TYPE } = await import("@capgo/native-purchases");
      const tx = await NativePurchases.purchaseProduct({
        productIdentifier: id, productType: PURCHASE_TYPE.INAPP,
        isConsumable: def.consumable, autoAcknowledgePurchases: true,
      });
      ok = !!tx?.transactionId;
    } catch (e) { console.warn("Satın alma tamamlanmadı", e); ok = false; }
  }
  if (ok && !def.consumable && !owned.ids.includes(id)) { owned.ids.push(id); save("store-owned", owned); }
  emit();
  return ok;
}

/** Kalıcı (tüketilmeyen) satın alımları mağazadan geri yükler. */
export async function restorePurchases(onRestore: (id: string) => void): Promise<number> {
  if (MOCK) { owned.ids.forEach(onRestore); return owned.ids.length; }
  try {
    const { NativePurchases, PURCHASE_TYPE } = await import("@capgo/native-purchases");
    const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP });
    let n = 0;
    for (const p of purchases) {
      const def = products.find(d => d.id === p.productIdentifier);
      if (def && !def.consumable) {
        if (!owned.ids.includes(def.id)) owned.ids.push(def.id);
        onRestore(def.id); n++;
      }
    }
    save("store-owned", owned); emit();
    return n;
  } catch (e) { console.warn("Geri yükleme başarısız", e); return 0; }
}
