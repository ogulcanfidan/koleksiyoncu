// İlk açılışta üç sayfalık kısa hikâye: oyuncuya "neden oynuyorum" sorusunun cevabını verir.
import { useState } from "react";
import { t, useLang } from "@shared/src/i18n";
import { sfx } from "@shared/src/audio";
import { ShopScene } from "../components/ShopScene";

const PAGES = [
  { art: "shop", key: "intro.1" },
  { art: "📓", key: "intro.2" },
  { art: "🔍", key: "intro.3" },
] as const;

export function IntroScreen({ onDone }: { onDone: () => void }) {
  useLang();
  const [i, setI] = useState(0);
  const last = i === PAGES.length - 1;
  const p = PAGES[i];
  return (
    <div className="intro">
      <div className="intro-art">
        {p.art === "shop" ? <ShopScene tools={["loupe"]} cats={["watch"]} /> : <div className="intro-emoji">{p.art}</div>}
      </div>
      <h1 className="intro-title">{t("app.title")}</h1>
      <p className="intro-text" key={i}>{t(p.key)}</p>
      <div className="intro-dots">{PAGES.map((_, k) => <i key={k} className={k === i ? "on" : ""} />)}</div>
      <div className="stack">
        <button className="btn primary big" onClick={() => { sfx(last ? "unlock" : "paper"); if (last) onDone(); else setI(i + 1); }}>
          {last ? t("intro.start") : t("ui.continue")}
        </button>
        {!last && <button className="btn ghost" onClick={() => { sfx("tap"); onDone(); }}>{t("intro.skip")}</button>}
      </div>
    </div>
  );
}
