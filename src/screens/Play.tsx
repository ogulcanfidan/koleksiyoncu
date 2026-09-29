import { useEffect, useMemo, useState } from "react";
import { t, formatMoney, useLang } from "@shared/src/i18n";
import { sfx } from "@shared/src/audio";
import { Avatar } from "@shared/src/avatar";
import { Sheet, useBackHandler } from "@shared/src/ui";
import { TOOLS } from "../game/catalog";
import type { ToolId } from "../game/types";
import { ItemArt, type View } from "../components/ItemArt";
import { Magnifier } from "../components/Magnifier";
import { CatalogView } from "../components/CatalogView";
import {
  SHOP_CLOSE, closeDay, currentCustomer, dayIsOver, decideBuy, decideReject, decideWalked,
  sellerResponse, useGame, applyTool, rank, type DaySummary,
} from "../state";
import { clockLabel, coinLabels, sellerLine } from "../texts";
import { METAL } from "../components/ItemArt";
import { PIGMENTS } from "../game/catalog";

type Neg = { open: boolean; round: number; offer: number; counter: number | null; msg: string | null; ended: boolean };
const TUT_STEPS = 6;

export function PlayScreen({ onDayEnd, onExit }: { onDayEnd: (s: DaySummary) => void; onExit: () => void }) {
  const g = useGame(); useLang();
  const run = g.run!;
  const c = currentCustomer();
  const [view, setView] = useState<View>("front");
  const [uv, setUv] = useState(false);
  const [loupe, setLoupe] = useState(false);
  const [catalog, setCatalog] = useState(false);
  const [stamp, setStamp] = useState<null | "buy" | "reject" | "walked">(null);
  const [neg, setNeg] = useState<Neg>({ open: false, round: 0, offer: 0, counter: null, msg: null, ended: false });
  const [tut, setTut] = useState(run.tutorial ? 1 : 0);
  const [artW, setArtW] = useState(300);
  // Donanım geri tuşu: açık pencere yoksa ana sayfaya dön (gün kaldığı yerden sürer).
  useBackHandler(true, onExit);

  useEffect(() => {
    // Çizim ekrana sığsın: genişlik ve yüksekliğe göre (müşteri, aletler ve karar çubuğu için yer bırak).
    const fit = () => setArtW(Math.max(200, Math.min(330, window.innerWidth - 56, (window.innerHeight - 430) / 1.06)));
    fit(); window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit);
  }, []);

  // Yeni müşteri geldiğinde inceleme durumunu sıfırla.
  useEffect(() => {
    setView("front"); setUv(false); setLoupe(false); setStamp(null);
    setNeg({ open: false, round: 0, offer: 0, counter: null, msg: null, ended: false });
    if (c) sfx("open");
  }, [c?.id]);

  const tools = useMemo(() => c ? TOOLS.filter(x => g.tools.includes(x.id) && x.forCats.includes(c.item.cat)) : [], [c?.id, g.tools]);

  if (!c || dayIsOver()) {
    const late = run.clock >= SHOP_CLOSE;
    return (
      <div className="play closed-panel">
        <div className="card center">
          <div className="big-emoji">{late ? "🌙" : "🔒"}</div>
          <p>{late ? t("play.closed") : t("play.dayDone")}</p>
          <button className="btn primary" onClick={() => { sfx("paper"); onDayEnd(closeDay()); }}>{t("play.toReport")} →</button>
        </div>
      </div>
    );
  }

  const item = c.item;
  const cat = item.cat;
  const views: View[] = cat === "painting" ? ["front", "back"] : ["front", "back", "inner"];
  const labels = coinLabels(item);
  const mood = stamp === "walked" ? "angry" : neg.msg === t("neg.accepted") ? "happy" : c.personality === "desperate" ? "nervous" : c.personality === "clueless" ? "happy" : "neutral";
  const used = run.usedTools;

  const toggleTool = (id: ToolId) => {
    sfx("tool");
    if (id === "loupe") { setLoupe(v => !v); if (!used.includes("loupe")) applyTool("loupe"); return; }
    if (id === "uv") { setUv(v => !v); if (!used.includes("uv")) applyTool("uv"); return; }
    applyTool(id);
  };

  const finish = (kind: "buy" | "reject" | "walked", price = 0) => {
    setStamp(kind); sfx("stamp");
    setNeg(n => ({ ...n, open: false }));
    setTimeout(() => {
      if (kind === "buy") { decideBuy(price); sfx("coin"); }
      else if (kind === "reject") decideReject();
      else decideWalked();
    }, 900);
  };

  const openNeg = () => {
    sfx("tap");
    setNeg({ open: true, round: 0, offer: Math.round((c.ask * 0.7) / 10) * 10, counter: null, msg: null, ended: false });
  };

  const makeOffer = () => {
    const r = sellerResponse(c, neg.offer, neg.round);
    if (r.accept) {
      if (g.money < neg.offer) { setNeg({ ...neg, msg: t("neg.notEnough") }); return; }
      setNeg({ ...neg, msg: t("neg.accepted"), ended: true }); sfx("good");
      setTimeout(() => finish("buy", neg.offer), 700);
      return;
    }
    if (r.leaves) {
      setNeg({ ...neg, msg: neg.offer < c.minAccept * 0.45 ? t("neg.insulted") : t("neg.leaves"), ended: true }); sfx("bad");
      setTimeout(() => finish("walked"), 1100);
      return;
    }
    sfx("tap");
    setNeg({ ...neg, round: neg.round + 1, counter: r.counter, msg: t("neg.counter", { price: formatMoney(r.counter) }) });
  };

  const pay = (price: number) => {
    if (g.money < price) { setNeg({ ...neg, msg: t("neg.notEnough") }); sfx("bad"); return; }
    setNeg({ ...neg, msg: t("neg.accepted"), ended: true }); sfx("good");
    setTimeout(() => finish("buy", price), 600);
  };

  const readings = used.filter(u => u === "scale" || u === "caliper" || u === "touchstone" || u === "pigment");
  const closingSoon = run.clock >= SHOP_CLOSE - 60;

  return (
    <div className="play">
      <header className="play-top">
        <button className="icon-btn" onClick={onExit} aria-label={t("ui.back")}>‹</button>
        <span className={`chip ${closingSoon ? "warn" : ""}`}>🕰 {clockLabel(run.clock)}</span>
        <span className="chip">{t("play.customer", { i: run.idx + 1, n: run.plan.customers.length })}</span>
        <span className="chip">{formatMoney(g.money)}</span>
        <button className="icon-btn" onClick={() => { sfx("paper"); setCatalog(true); }} aria-label={t("play.catalog")}>📖</button>
      </header>

      {tut > 0 && tut <= TUT_STEPS && (
        <div className="coach">
          <p>{t(`tut.${tut}`)}</p>
          <button className="btn small primary" onClick={() => { sfx("tap"); setTut(tut + 1); }}>{t("tut.next")}</button>
        </div>
      )}

      <section className="customer">
        <Avatar spec={{ seed: c.avatarSeed, age: c.age, gender: c.gender, mood }} size={64} />
        <div className="bubble">
          <b>{c.name}</b>
          <p>{sellerLine(c)}</p>
          {c.claimsUnknown && <small className="muted">{t("play.claimUnknown")}</small>}
        </div>
      </section>

      <section className={`stage ${uv ? "uv" : ""}`}>
        <div className="stage-bar">
          <div className="seg small">
            {views.map(v => (
              <button key={v} className={v === view ? "on" : ""} onClick={() => { sfx("tap"); setView(v); }}>{t(`view.${cat}.${v}`)}</button>
            ))}
          </div>
        </div>
        <div className="toolbar" role="toolbar" aria-label={t("play.tools")}>
          {tools.map(tl => {
            const on = (tl.id === "loupe" && loupe) || (tl.id === "uv" && uv) || (tl.id !== "loupe" && tl.id !== "uv" && used.includes(tl.id));
            return (
              <button key={tl.id} className={`tool ${on ? "on" : ""} ${tl.id === "loupe" ? "loupe" : ""}`} onClick={() => toggleTool(tl.id)} aria-pressed={on}>
                <span className="tool-icon">{tl.icon}</span>
                <span className="tool-name">{t(`tool.${tl.id}`)}</span>
                <small>{used.includes(tl.id) ? "✓" : t("play.minutes", { n: tl.minutes })}</small>
              </button>
            );
          })}
        </div>
        <Magnifier active={loupe} width={artW} height={artW * 1.06}
          render={(w, sharp) => <ItemArt item={item} view={view} uv={uv} coinLabels={labels} size={w} sharp={sharp} />} />
        <p className={`hint ${loupe ? "" : "idle"}`}>{loupe ? t("play.loupeHint") : t("play.loupeOff")}</p>
        {uv && <p className="hint uv-hint">🔦 {t("play.uvOn")}</p>}
        {stamp && <div className={`stamp ${stamp}`}>{t(`stamp.${stamp}`)}</div>}
      </section>
      {readings.length > 0 && (
        <section className="readings card">
          {readings.includes("scale") && "weight" in item && <div className="list-row"><span>⚖️ {t("read.weight")}</span><b>{t("read.grams", { n: item.weight })}</b></div>}
          {readings.includes("caliper") && item.cat === "coin" && <div className="list-row"><span>📏 {t("read.diameter")}</span><b>{t("read.mm", { n: item.diameter })}</b></div>}
          {readings.includes("touchstone") && item.cat !== "painting" && (() => {
            const m = item.cat === "watch" ? item.material : item.metal;
            return <div className="list-row"><span>🪨 {t("read.material")}</span><b><span className="metal-dot" style={{ background: `linear-gradient(135deg, ${METAL[m][2]}, ${METAL[m][0]})` }} />{t(`mat.${m}`)}</b></div>;
          })()}
          {readings.includes("pigment") && item.cat === "painting" && (
            <div className="list-row col"><span>🧪 {t("read.pigments")}</span>
              <div className="pig-list">{item.pigments.map(p => <span key={p} className="pig"><i style={{ background: PIGMENTS[p].color }} />{t(`pig.${p}`)}</span>)}</div>
            </div>
          )}
        </section>
      )}

      <footer className="decide-bar">
        <button className="btn ghost" disabled={!!stamp} onClick={() => finish("reject")}>✋ {t("decide.reject")}</button>
        <button className="btn primary" disabled={!!stamp} onClick={openNeg}>
          🤝 {t("decide.buy")}<small className="btn-sub">{t("play.ask", { price: formatMoney(c.ask) })}</small>
          {g.money < c.ask && <small className="btn-sub low-cash">{t("play.lowCash", { cash: formatMoney(g.money) })}</small>}
        </button>
      </footer>

      <Sheet open={neg.open} onClose={() => !neg.ended && setNeg({ ...neg, open: false })} title={`🤝 ${t("neg.title")}`}>
        <div className="neg">
          <div className="neg-who">
            <Avatar spec={{ seed: c.avatarSeed, age: c.age, gender: c.gender, mood: neg.ended && neg.msg !== t("neg.accepted") ? "angry" : neg.round > 0 ? "nervous" : mood }} size={52} />
            <div>
              <p className="muted small">{t("neg.asks", { price: formatMoney(c.ask) })}</p>
              <p className="muted small">{t("neg.cash", { price: formatMoney(g.money) })}</p>
            </div>
          </div>
          {neg.msg && <p className="neg-msg">{neg.msg}</p>}
          {!neg.ended && (
            <>
              <label className="neg-slider">
                <span>{t("neg.yourOffer")}: <b>{formatMoney(neg.offer)}</b></span>
                <input type="range" min={Math.round(c.ask * 0.2 / 10) * 10} max={c.ask} step={10} value={neg.offer}
                  onChange={e => setNeg({ ...neg, offer: +e.target.value })} />
              </label>
              <div className="stack">
                <button className="btn primary" onClick={makeOffer}>{t("neg.offer")}</button>
                {neg.counter != null && <button className="btn good" onClick={() => pay(neg.counter!)}>{t("neg.acceptCounter", { price: formatMoney(neg.counter) })}</button>}
                <button className="btn ghost" onClick={() => pay(c.ask)}>{t("neg.payAsk", { price: formatMoney(c.ask) })}</button>
                <button className="btn ghost" onClick={() => setNeg({ ...neg, open: false })}>{t("neg.cancel")}</button>
              </div>
              <p className="muted small center">{t("neg.patience", { n: Math.max(0, c.patience - neg.round) })}</p>
            </>
          )}
        </div>
      </Sheet>

      <Sheet open={catalog} onClose={() => setCatalog(false)} title={`📖 ${t("cat.title")}`}>
        <CatalogView owned={g.cats} initial={cat} tier={rank()} stamps={Object.keys(g.collection)} />
      </Sheet>
    </div>
  );
}
