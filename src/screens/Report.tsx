import { useEffect, useState } from "react";
import { t, formatMoney, formatDuration, useLang } from "@shared/src/i18n";
import { sfx } from "@shared/src/audio";
import { Screen, toast } from "@shared/src/ui";
import { SET_REWARD, VITRINE_RATE, keepInCollection, useGame, type DaySummary } from "../state";
import { ItemThumb } from "../components/ItemArt";
import { coinLabels, itemName, tellText } from "../texts";
import { RANKS } from "../game/catalog";

export function ReportScreen({ summary: initial, onDone }: { summary: DaySummary; onDone: () => void }) {
  useLang();
  const g = useGame();
  // Vitrine koyma raporu değiştirir; güncel hâli kayıttan okunur.
  const summary = g.lastSummary && g.lastSummary.dayNo === initial.dayNo && g.lastSummary.tutorial === initial.tutorial ? g.lastSummary : initial;
  const [open, setOpen] = useState<string | null>(null);
  const [setDone, setSetDone] = useState<string | null>(null);
  const profit = summary.earned - summary.spent + (summary.kept ?? 0);
  useEffect(() => { if (summary.rankUp != null) sfx("unlock"); }, []);
  const marks = summary.rows.map(r => !r.decision ? "▫️" : r.decision.neutral ? "➖" : r.decision.correct ? "✅" : "❌").join("");
  const anyKeepable = summary.rows.some(r => r.collectKey && !r.kept);

  const share = async () => {
    const text = t("report.shareText", {
      n: summary.dayNo, marks, correct: summary.correct, total: summary.total,
      profit: formatMoney(profit), time: formatDuration(summary.seconds),
    });
    try { if (navigator.share) { await navigator.share({ text }); return; } } catch { return; }
    try { await navigator.clipboard.writeText(text); toast(t("report.copied"), "good"); } catch { /* yok say */ }
  };

  const keep = (id: string) => {
    const res = keepInCollection(id);
    if (!res.ok) return;
    sfx("unlock");
    toast(t("coll.added"), "ach", "🏛️");
    if (res.setDone) setSetDone(res.setDone);
  };

  return (
    <Screen title={summary.tutorial ? t("report.tutorialTitle") : t("report.title", { n: summary.dayNo })}>
      <div className="report-hero card">
        <div className="marks">{marks}</div>
        <div className="report-grid">
          <div><span>{t("report.correct")}</span><b>{summary.correct}/{summary.total}</b></div>
          <div><span>{t("report.profit")}</span><b className={profit >= 0 ? "pos" : "neg"}>{formatMoney(profit)}</b></div>
          <div><span>{t("report.score")}</span><b>{summary.score}</b></div>
          <div><span>{t("report.rep")}</span><b className={summary.repDelta >= 0 ? "pos" : "neg"}>{summary.repDelta >= 0 ? "+" : ""}{summary.repDelta}</b></div>
          <div><span>{t("report.spent")}</span><b>{formatMoney(summary.spent)}</b></div>
          <div><span>{t("report.earned")}</span><b>{formatMoney(summary.earned - (summary.vitrine || 0))}</b></div>
          {summary.vitrine > 0 && <div className="wide"><span>🏛️ {t("coll.vitrineIncome")}</span><b className="pos">+{formatMoney(summary.vitrine)}</b></div>}
        </div>
      </div>

      {summary.rankUp != null && (
        <div className="celebrate card">
          <div className="big-emoji">{["🪶", "🔨", "🎖️", "👑", "🌟"][summary.rankUp]}</div>
          <b>{t("rank.up", { rank: t(`rank.${RANKS[summary.rankUp].id}`) })}</b>
          <p className="muted small">{t("rank.upDesc")}</p>
        </div>
      )}
      {setDone && (
        <div className="celebrate card">
          <div className="big-emoji">🏛️</div>
          <b>{t("coll.setDone", { set: t(`cat.tab.${setDone}`) })}</b>
          <p className="muted small">{t("coll.setReward", { money: formatMoney(SET_REWARD.money), rep: SET_REWARD.rep })}</p>
        </div>
      )}
      {anyKeepable && <p className="note-box keep-hint">🏛️ {t("coll.keepHint", { pct: Math.round(VITRINE_RATE * 100) })}</p>}

      {summary.rows.map(row => {
        const { customer: c, decision: d, sale } = row;
        const outcome = !d ? t("report.none")
          : d.action === "buy" ? t("report.bought", { price: formatMoney(d.price) })
          : d.action === "reject" ? (d.neutral ? t("report.broke") : t("report.rejected")) : t("report.walked");
        const detail = !d ? null
          : d.action === "buy" ? (c.genuine ? (row.kept ? t("coll.inCollection") : t("report.soldFor", { price: formatMoney(sale) })) : t("report.worthless"))
          : c.genuine ? t("report.missed", { price: formatMoney(c.trueValue) }) : t("report.goodCatch");
        const isOpen = open === c.id;
        return (
          <article key={c.id} className={`report-row card ${d ? (d.neutral ? "" : d.correct ? "ok" : "bad") : ""} ${row.kept ? "kept" : ""}`}>
            <div className="report-row-head" onClick={() => { sfx("paper"); setOpen(isOpen ? null : c.id); }}>
              <ItemThumb item={c.item} coinLabels={coinLabels(c.item)} />
              <div className="grow">
                <b>{itemName(c.item)}</b>
                <small className="muted block">{outcome}</small>
                {detail && <small className="block">{detail}</small>}
              </div>
              <span className={`truth ${c.genuine ? "g" : "f"}`}>{c.genuine ? t("report.genuine") : t("report.fake")}</span>
            </div>
            {row.collectKey && !row.kept && (
              <button className="btn small keep-btn" onClick={() => keep(c.id)}>🏛️ {t("coll.keep")}</button>
            )}
            {isOpen && !c.genuine && (
              <div className="why">
                <b>{t("report.why")}</b>
                <ul>{c.tells.map(tl => <li key={tl}>{tellText(tl, c.item)}</li>)}</ul>
              </div>
            )}
          </article>
        );
      })}

      <div className="stack">
        {!summary.tutorial && <button className="btn ghost" onClick={share}>📤 {t("report.share")}</button>}
        <button className="btn primary" onClick={() => { sfx("tap"); onDone(); }}>{t("report.continue")}</button>
      </div>
    </Screen>
  );
}
