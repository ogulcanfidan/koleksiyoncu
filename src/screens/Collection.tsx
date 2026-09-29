// Koleksiyon: her ustadan, hükümdardan ve ressamdan birer gerçek eser. Oyunun uzun vadeli hedefi.
import { useState } from "react";
import { t, formatMoney, useLang } from "@shared/src/i18n";
import { sfx } from "@shared/src/audio";
import { Screen, Sheet } from "@shared/src/ui";
import { ARTISTS, RANKS, RULERS, WATCH_MAKERS } from "../game/catalog";
import type { Category } from "../game/types";
import { COLLECTION_SIZE, SET_REWARD, VITRINE_RATE, collectionValue, rank, useGame, vitrineIncome, type CollectionEntry } from "../state";
import { ItemArt } from "../components/ItemArt";
import { coinLabels, rulerLabel } from "../texts";

const SECTIONS: { cat: Category; list: { id: string; tier: number; name?: string }[] }[] = [
  { cat: "watch", list: WATCH_MAKERS },
  { cat: "coin", list: RULERS },
  { cat: "painting", list: ARTISTS },
];

function slotName(cat: Category, id: string, name?: string) {
  return cat === "coin" ? rulerLabel(id) : name ?? id;
}

export function CollectionScreen({ onBack }: { onBack: () => void }) {
  const g = useGame(); useLang();
  const [view, setView] = useState<{ key: string; entry: CollectionEntry; title: string } | null>(null);
  const count = Object.keys(g.collection).length;
  const tier = rank();

  return (
    <Screen title={t("coll.title")} onBack={onBack} right={<span className="chip">{count}/{COLLECTION_SIZE}</span>}>
      <div className="coll-hero card">
        <div><span>{t("coll.value")}</span><b>{formatMoney(collectionValue())}</b></div>
        <div><span>{t("coll.daily")}</span><b className="pos">+{formatMoney(vitrineIncome())}</b></div>
      </div>
      <p className="muted small">{t("coll.explain", { pct: Math.round(VITRINE_RATE * 100), money: formatMoney(SET_REWARD.money) })}</p>

      {SECTIONS.map(({ cat, list }) => {
        const owned = g.cats.includes(cat);
        const have = list.filter(x => g.collection[`${cat}:${x.id}`]).length;
        return (
          <section key={cat} className="coll-section">
            <header className="coll-head">
              <h2>{t(`cat.tab.${cat}`)}</h2>
              <span className={`chip ${g.setsDone.includes(cat) ? "done" : ""}`}>{g.setsDone.includes(cat) ? "🏆 " : ""}{have}/{list.length}</span>
            </header>
            {!owned && <p className="note-box">{t("coll.needCatalog", { catalog: t(`catalog.${cat}`) })}</p>}
            <div className="coll-grid">
              {[...list].sort((a, b) => a.tier - b.tier).map(x => {
                const key = `${cat}:${x.id}`;
                const e = g.collection[key];
                const title = slotName(cat, x.id, x.name);
                if (e) return (
                  <button key={key} className="slot filled" onClick={() => { sfx("open"); setView({ key, entry: e, title }); }}>
                    <ItemArt item={e.item} view="front" uv={false} coinLabels={coinLabels(e.item)} size={84} />
                    <b>{title}</b>
                    <small>{formatMoney(e.value)}</small>
                  </button>
                );
                const locked = x.tier > tier;
                return (
                  <div key={key} className={`slot empty ${locked ? "locked" : ""}`}>
                    <div className="slot-ghost">{locked ? "🔒" : cat === "watch" ? "⌚" : cat === "coin" ? "🪙" : "🖼️"}</div>
                    <b>{locked ? "• • •" : title}</b>
                    <small>{locked ? t(`rank.${RANKS[x.tier].id}`) : t("coll.missing")}</small>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <Sheet open={!!view} onClose={() => setView(null)} title={view?.title}>
        {view && (
          <div className="coll-detail">
            <ItemArt item={view.entry.item} view="front" uv={false} coinLabels={coinLabels(view.entry.item)} size={Math.min(300, window.innerWidth - 60)} />
            <div className="card list">
              <div className="list-row"><span>{t("coll.acquired")}</span><b>{t("home.day", { n: view.entry.day })}</b></div>
              <div className="list-row"><span>{t("coll.paid")}</span><b>{formatMoney(view.entry.paid)}</b></div>
              <div className="list-row"><span>{t("coll.worth")}</span><b>{formatMoney(view.entry.value)}</b></div>
              <div className="list-row"><span>{t("coll.year")}</span><b>{view.entry.item.year}</b></div>
            </div>
          </div>
        )}
      </Sheet>
    </Screen>
  );
}
