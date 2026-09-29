// Kural kitabı: ustalar, hükümdarlar, ressamlar ve genel bilgiler.
import { useState, type ReactNode } from "react";
import { t, useLang } from "@shared/src/i18n";
import { sfx } from "@shared/src/audio";
import { ARTISTS, PIGMENTS, RANKS, RULERS, WATCH_MAKERS, WATCH_WEIGHT } from "../game/catalog";
import type { Category, Material, PigmentId } from "../game/types";
import { HallmarkIcon, METAL } from "./ItemArt";
import { rulerLabel } from "../texts";

type Tab = Category | "general";

function MetalDot({ m }: { m: Material }) {
  return <span className="metal-dot" style={{ background: `linear-gradient(135deg, ${METAL[m][2]}, ${METAL[m][0]})` }} />;
}

function Row({ k, v }: { k: ReactNode; v: ReactNode }) {
  return <div className="cat-row"><span>{k}</span><b>{v}</b></div>;
}

function Locked({ tier }: { tier: number }) {
  return (
    <article className="cat-card locked">
      <header><span className="easel">🔒</span><div><h3>• • • • •</h3><small>{t("rank.unlocksAt", { rank: t(`rank.${RANKS[tier].id}`) })}</small></div></header>
    </article>
  );
}

function Stamp({ on }: { on: boolean }) {
  return on ? <span className="seal" title={t("stamps.title")}>✓</span> : null;
}

export function CatalogView({ owned, initial, tier = 9, stamps = [] }: { owned: Category[]; initial?: Tab; tier?: number; stamps?: string[] }) {
  useLang();
  const [tab, setTab] = useState<Tab>(initial ?? "watch");
  const tabs: Tab[] = ["watch", "coin", "painting", "general"];
  const locked = tab !== "general" && !owned.includes(tab);
  return (
    <div className="catalog">
      <div className="seg">
        {tabs.map(x => (
          <button key={x} className={x === tab ? "on" : ""} onClick={() => { sfx("paper"); setTab(x); }}>
            {t(`cat.tab.${x}`)}{x !== "general" && !owned.includes(x) ? " 🔒" : ""}
          </button>
        ))}
      </div>

      {locked && <p className="note-box">{t("cat.locked")}</p>}
      {!locked && tab !== "general" && <p className="muted small">{t("stamps.hint")}</p>}

      {tab === "watch" && !locked && WATCH_MAKERS.map(m => m.tier > tier ? <Locked key={m.id} tier={m.tier} /> : (
        <article key={m.id} className="cat-card">
          <header><HallmarkIcon h={m.hallmark} s={26} color="var(--ink)" /><div className="grow"><h3>{m.name}</h3><small>{m.city}</small></div><Stamp on={stamps.includes(`watch:${m.id}`)} /></header>
          <Row k={t("cat.years")} v={`${m.from}–${m.to}`} />
          <Row k={t("cat.hallmark")} v={<span className="inline-hm"><svg width="18" height="18" viewBox="0 0 20 20"><HallmarkIcon h={m.hallmark} color="var(--ink)" /></svg>{t(`hallmarkl.${m.hallmark}`)}</span>} />
          <Row k={t("cat.materials")} v={<span className="mat-list">{m.materials.map(x => <span key={x}><MetalDot m={x} />{t(`mat.${x}`)}</span>)}</span>} />
          <Row k={t("cat.jewels")} v={`${m.jewels[0]}–${m.jewels[1]}`} />
          <Row k={t("cat.serial")} v={<code>{m.serialPrefix}-•••••</code>} />
          <Row k={t("cat.numerals")} v={t(`numerals.${m.numerals}`)} />
        </article>
      ))}

      {tab === "coin" && !locked && RULERS.map(r => r.tier > tier ? <Locked key={r.id} tier={r.tier} /> : (
        <article key={r.id} className="cat-card">
          <header><span className="coin-badge"><MetalDot m={r.metal} /></span><div className="grow"><h3>{rulerLabel(r.id)}</h3><small>{r.realm}</small></div><Stamp on={stamps.includes(`coin:${r.id}`)} /></header>
          <Row k={t("cat.reign")} v={`${r.from}–${r.to}`} />
          <Row k={t("cat.metal")} v={<span className="mat-list"><span><MetalDot m={r.metal} />{t(`mat.${r.metal}`)}</span></span>} />
          <Row k={t("cat.diameter")} v={t("read.mm", { n: r.diameter })} />
          <Row k={t("cat.weight")} v={t("read.grams", { n: r.weight })} />
          <Row k={t("cat.edge")} v={t(`edgel.${r.edge}`)} />
          <Row k={t("cat.mint")} v={<code>{r.mint}</code>} />
        </article>
      ))}

      {tab === "painting" && !locked && ARTISTS.map(a => a.tier > tier ? <Locked key={a.id} tier={a.tier} /> : (
        <article key={a.id} className="cat-card">
          <header><span className="easel">🎨</span><div className="grow"><h3>{a.name}</h3><small>{t("cat.life")}: {a.born}–{a.died}</small></div><Stamp on={stamps.includes(`painting:${a.id}`)} /></header>
          <Row k={t("cat.active")} v={`${a.activeFrom}–${a.activeTo}`} />
          <Row k={t("cat.signature")} v={t("cat.cornerSuffix", { corner: t(`cornerl.${a.corner}`) })} />
          <Row k={t("cat.canvas")} v={t(`canvasl.${a.canvas}`)} />
        </article>
      ))}

      {tab === "general" && (
        <>
          <article className="cat-card rules">
            <p>⌚ {t("gen.steel")}</p>
            <p>✨ {t("gen.lume")}</p>
            <p>🖼️ {t("gen.canvas")}</p>
            <p>🔦 {t("gen.uv")}</p>
            <p>🪙 {t("gen.tolerance")}</p>
            <p>💡 {t("gen.clueless")}</p>
          </article>
          <article className="cat-card">
            <h3>{t("gen.weights")}</h3>
            {(Object.keys(WATCH_WEIGHT) as Material[]).map(m => (
              <Row key={m} k={<span className="mat-list"><span><MetalDot m={m} />{t(`mat.${m}`)}</span></span>} v={`${WATCH_WEIGHT[m][0]}–${WATCH_WEIGHT[m][1]} g`} />
            ))}
            <p className="muted small">{t("gen.weightsNote")}</p>
          </article>
          <article className="cat-card">
            <h3>{t("gen.pigments")}</h3>
            {(Object.keys(PIGMENTS) as PigmentId[]).map(p => (
              <Row key={p} k={<span className="pig"><i style={{ background: PIGMENTS[p].color }} />{t(`pig.${p}`)}</span>}
                v={PIGMENTS[p].from ? String(PIGMENTS[p].from) : t("gen.pigmentAncient")} />
            ))}
          </article>
        </>
      )}
    </div>
  );
}
