import { useEffect, useMemo, useState } from "react";
import { t, formatMoney, useLang } from "@shared/src/i18n";
import { sfx } from "@shared/src/audio";
import { EnergyChip, EnergySheet, QuestsCard, toast, useTicker } from "@shared/src/ui";
import { useEnergy } from "@shared/src/energy";
import { useProgress } from "@shared/src/progress";
import { COLLECTION_SIZE, PREMIUM_DAILY_KEYS, adFree, claimPremiumDaily, keys, progress, quests, rank, rankProgress, startDay, startTutorial, useGame, vitrineIncome } from "../state";
import { RANKS } from "../game/catalog";
import { ShopScene } from "../components/ShopScene";

export type Nav = "shop" | "catalog" | "stats" | "achievements" | "leaderboard" | "settings" | "collection";

export function HomeScreen({ onPlay, onNav }: { onPlay: () => void; onNav: (n: Nav) => void }) {
  const g = useGame(); useLang(); useEnergy(keys); useProgress(progress); useTicker(30000);
  const [energyOpen, setEnergyOpen] = useState(false);
  // Reklamsız paket: ana sayfa her açıldığında günün anahtarlarını kontrol et.
  useEffect(() => { if (claimPremiumDaily()) { sfx("unlock"); toast(t("iap.premiumDaily", { n: PREMIUM_DAILY_KEYS }), "good", "👑"); } }, []);
  const tip = useMemo(() => `home.tip.${1 + Math.floor(Math.random() * 4)}`, []);
  const stars = Math.round(g.reputation / 20);
  const last = g.lastSummary && !g.lastSummary.tutorial ? g.lastSummary : null;

  const open = () => {
    if (g.run) { sfx("open"); onPlay(); return; }
    if (keys.value <= 0) { sfx("bad"); setEnergyOpen(true); return; }
    if (startDay()) { sfx("unlock"); onPlay(); }
  };

  return (
    <div className="home">
      <header className="home-top">
        <EnergyChip energy={keys} icon="🗝️" onClick={() => setEnergyOpen(true)} />
        <span className="chip">{formatMoney(g.money)}</span>
        <button className="icon-btn" onClick={() => onNav("settings")} aria-label={t("ui.settings")}>⚙️</button>
      </header>

      <ShopScene tools={g.tools} cats={g.cats} />

      <section className="home-title">
        <h1>{t("app.title")}</h1>
        <p className="home-sub">{t("app.subtitle")}</p>
        <p className="muted">{t("app.tagline")}</p>
        <div className="home-meta">
          <span>{t("home.day", { n: g.dayNo + (g.run && !g.run.tutorial ? 0 : 1) })}</span>
          <span title={t("home.reputation")}>{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span>
          <span>🔥 {progress.streak.current}</span>
        </div>
      </section>

      {!g.tutorialDone && !g.run && (
        <div className="card tutorial-card">
          <p>{t("home.tutorialPitch")}</p>
          <button className="btn primary" onClick={() => { startTutorial(); sfx("unlock"); onPlay(); }}>🎓 {t("home.startTutorial")}</button>
        </div>
      )}

      {(g.tutorialDone || g.run) && <button className="btn primary big" onClick={open} disabled={!g.run && keys.value <= 0 && keys.adsLeft <= 0}>
        {g.run ? `▶ ${t("home.continueDay")}` : keys.value > 0 ? `🗝️ ${t("home.openShop")}` : `🔒 ${t("home.noKeys")}`}
        {!g.run && keys.value > 0 && <small className="btn-sub">{t("home.openShopCost")}</small>}
      </button>}

      {last && <p className="muted small center">{t("home.lastDay", { correct: last.correct, total: last.total, profit: formatMoney(last.earned - last.spent + (last.kept ?? 0)) })}</p>}

      {g.tutorialDone && (() => {
        const rp = rankProgress(); const i = rank();
        const pct = rp.next ? ((rp.value - rp.cur) / (rp.next - rp.cur)) * 100 : 100;
        const have = Object.keys(g.collection).length;
        return (
          <div className="home-cards">
            <section className="rank-card card">
              <div className="rank-row">
                <span className="rank-badge">{["🪶", "🔨", "🎖️", "👑", "🌟"][i]}</span>
                <div className="grow">
                  <b>{t(`rank.${RANKS[i].id}`)}</b>
                  <div className="mini-bar"><i style={{ width: `${pct}%` }} /></div>
                  <small className="muted">{rp.next ? t("rank.next", { xp: rp.value, next: rp.next, rank: t(`rank.${RANKS[i + 1].id}`) }) : t("rank.max")}</small>
                </div>
              </div>
            </section>
            <button className="coll-card card" onClick={() => { sfx("open"); onNav("collection"); }}>
              <span className="rank-badge">🏛️</span>
              <div className="grow">
                <b>{t("coll.title")} · {have}/{COLLECTION_SIZE}</b>
                <div className="mini-bar"><i style={{ width: `${(have / COLLECTION_SIZE) * 100}%` }} /></div>
                <small className="muted">{have ? t("coll.homeIncome", { money: formatMoney(vitrineIncome()) }) : t("coll.homeEmpty")}</small>
              </div>
              <b className="chev">›</b>
            </button>
          </div>
        );
      })()}

      {g.tutorialDone && <QuestsCard quests={quests} />}

      <nav className="home-grid">
        <button onClick={() => onNav("collection")}><span>🏛️</span>{t("coll.title")}</button>
        <button onClick={() => onNav("shop")}><span>🧰</span>{t("home.shop")}</button>
        <button onClick={() => onNav("catalog")}><span>📖</span>{t("home.catalog")}</button>
        <button onClick={() => onNav("stats")}><span>📊</span>{t("ui.stats")}</button>
        <button onClick={() => onNav("achievements")}><span>🏅</span>{t("ui.achievements")}</button>
        <button onClick={() => onNav("leaderboard")}><span>🏆</span>{t("ui.leaderboard")}</button>
      </nav>
      <p className="tip">{t(tip)}</p>

      <EnergySheet energy={keys} open={energyOpen} onClose={() => setEnergyOpen(false)} icon="🗝️" unitKey="energy.unit"
        premiumNote={adFree() ? t("iap.premiumNote", { n: PREMIUM_DAILY_KEYS }) : undefined} />
    </div>
  );
}
