import { useState } from "react";
import { t, formatMoney, useLang } from "@shared/src/i18n";
import { sfx } from "@shared/src/audio";
import { Screen, toast } from "@shared/src/ui";
import { isOwned, priceOf, purchase, storeAvailable, storeIsTestMode, useStore } from "@shared/src/store";
import { CATALOGS, TOOLS } from "../game/catalog";
import { adFree, buyCatalog, buyTool, deliverProduct, useGame } from "../state";

export function ShopScreen({ onBack }: { onBack: () => void }) {
  const g = useGame(); useLang(); useStore();
  const [busy, setBusy] = useState<string | null>(null);

  const buy = async (id: string, nameKey: string) => {
    if (!storeAvailable()) { toast(t("ui.storeUnavailable"), "bad"); return; }
    setBusy(id);
    const ok = await purchase(id);
    setBusy(null);
    if (ok) { deliverProduct(id); sfx("unlock"); toast(t("shop.bought", { item: t(nameKey) }), "good"); }
  };

  const premium = adFree() || isOwned("collector_ad_free");

  return (
    <Screen title={t("shop.title")} onBack={onBack} right={<span className="chip">{formatMoney(g.money)}</span>}>
      <h2 className="section-title">💎 {t("iap.title")}</h2>
      <div className={`iap-card card ${premium ? "owned" : ""}`}>
        <div className="iap-head">
          <span className="shop-icon">👑</span>
          <div className="grow">
            <b>{t("iap.adFree")}</b>
            <small className="muted block">{t("iap.adFreeDesc")}</small>
          </div>
        </div>
        {premium
          ? <span className="chip">✓ {t("shop.owned")}</span>
          : <button className="btn primary" disabled={busy === "collector_ad_free"} onClick={() => buy("collector_ad_free", "iap.adFree")}>{priceOf("collector_ad_free")}</button>}
      </div>
      <div className="iap-row">
        {[["keys_5", 5], ["keys_15", 15]].map(([id, n]) => (
          <button key={id} className="iap-pack card" disabled={busy === id} onClick={() => buy(String(id), `iap.${id}`)}>
            <span className="iap-keys">🗝️ ×{n}</span>
            <small className="muted">{t(`iap.${id}`)}</small>
            <b>{priceOf(String(id))}</b>
          </button>
        ))}
      </div>
      {storeIsTestMode() && <p className="muted small center">🧪 {t("iap.testMode")}</p>}

      <h2 className="section-title">{t("shop.catalogs")}</h2>
      {CATALOGS.map(c => {
        const owned = g.cats.includes(c.cat);
        return (
          <div key={c.cat} className={`shop-item card ${owned ? "owned" : ""}`}>
            <span className="shop-icon">{c.icon}</span>
            <div className="grow"><b>{t(`catalog.${c.cat}`)}</b><small className="muted block">{t(`catalog.${c.cat}.desc`)}</small></div>
            {owned ? <span className="chip">✓ {t("shop.owned")}</span> : (
              <button className="btn small primary" disabled={g.money < c.price}
                onClick={() => { if (buyCatalog(c.cat)) { sfx("coin"); toast(t("shop.bought", { item: t(`catalog.${c.cat}`) }), "good"); } }}>
                {formatMoney(c.price)}
              </button>
            )}
          </div>
        );
      })}

      <h2 className="section-title">{t("shop.tools")}</h2>
      {TOOLS.map(tl => {
        const owned = g.tools.includes(tl.id);
        return (
          <div key={tl.id} className={`shop-item card ${owned ? "owned" : ""}`}>
            <span className="shop-icon">{tl.icon}</span>
            <div className="grow">
              <b>{t(`tool.${tl.id}`)}</b>
              <small className="muted block">{t(`tool.${tl.id}.desc`)}</small>
              <small className="muted">⏱ {t("play.minutes", { n: tl.minutes })}</small>
            </div>
            {owned ? <span className="chip">✓ {t("shop.owned")}</span> : (
              <button className="btn small primary" disabled={g.money < tl.price}
                onClick={() => { if (buyTool(tl.id)) { sfx("coin"); toast(t("shop.bought", { item: t(`tool.${tl.id}`) }), "good"); } }}>
                {formatMoney(tl.price)}
              </button>
            )}
          </div>
        );
      })}
    </Screen>
  );
}
