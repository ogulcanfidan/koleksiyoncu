// İki oyunun ortak ekranları ve bileşenleri.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { LANGS, formatClock, formatDuration, formatNumber, getLangPref, setLang, t, useLang, type Lang } from "./i18n";
import { getAudioPrefs, setHaptics, setMusicVolume, setSfxVolume, sfx } from "./audio";
import { notificationsEnabled, setNotificationsEnabled } from "./notify";
import { registerWebAdHandler, showRewardedAd, openAdPrivacyOptions } from "./ads";
import { useEnergy, type Energy } from "./energy";
import { useProgress, type Progress, type AchievementDef } from "./progress";
import { showNativeLeaderboard, showNativeAchievements, nativeLeaderboardAvailable, playGamesAvailable, type LeaderboardIds } from "./leaderboard";
import { useQuests, type DailyQuests } from "./quests";
import { registerMockPurchaseHandler, type ProductDef } from "./store";

const noop = () => {};

// ---------- Toast ----------
type ToastItem = { id: number; text: string; kind?: "good" | "bad" | "ach"; icon?: string };
let pushToast: (t: Omit<ToastItem, "id">) => void = () => {};
export function toast(text: string, kind?: ToastItem["kind"], icon?: string) { pushToast({ text, kind, icon }); }

export function Toasts() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    let n = 0;
    pushToast = it => {
      const id = ++n;
      setItems(v => [...v.slice(-2), { ...it, id }]);
      setTimeout(() => setItems(v => v.filter(x => x.id !== id)), it.kind === "ach" ? 3800 : 2400);
    };
  }, []);
  return (
    <div className="toasts" aria-live="polite">
      {items.map(i => (
        <div key={i.id} className={`toast ${i.kind || ""}`}>
          {i.icon && <span className="toast-icon">{i.icon}</span>}<span>{i.text}</span>
        </div>
      ))}
    </div>
  );
}

export function announceAchievement(a: AchievementDef) {
  sfx("unlock");
  toast(`${t("ui.achUnlocked")}: ${t(`ach.${a.id}.title`)}`, "ach", a.icon);
}

// ---------- Donanım geri tuşu ----------
// Tek bir dinleyici; en son açılan pencere/ekran önce kapanır (yığın). Yığın boşsa uygulama arka plana alınır.
type BackHandler = { id: number; fn: () => void };
const backStack: BackHandler[] = [];
let backSeq = 0;
let backInstalled = false;
function installBack() {
  if (backInstalled || !Capacitor.isNativePlatform()) return;
  backInstalled = true;
  void CapApp.addListener("backButton", () => {
    const top = backStack[backStack.length - 1];
    if (top) top.fn(); else void CapApp.minimizeApp();
  });
}
/** active iken geri tuşu handler'ı çağırır. Sonradan açılan (üstteki) kayıt önceliklidir. */
export function useBackHandler(active: boolean, handler: () => void) {
  // En güncel handler'ı ref'te tut: yeniden çizimler kaydı yığının üstüne taşımasın.
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return;
    installBack();
    const entry: BackHandler = { id: ++backSeq, fn: () => ref.current() };
    backStack.push(entry);
    return () => { const i = backStack.indexOf(entry); if (i >= 0) backStack.splice(i, 1); };
  }, [active]);
}

// ---------- Sheet (alttan açılan pencere) ----------
export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: string }) {
  useBackHandler(open, onClose);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="sheet-head">
          <div className="sheet-grip" />
          <button className="sheet-close" onClick={() => { sfx("close"); onClose(); }} aria-label={t("ui.close")}>✕</button>
        </div>
        {title && <h2 className="sheet-title">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

// ---------- Ekran çerçevesi ----------
export function Screen({ title, onBack, children, right }: { title: string; onBack?: () => void; children: ReactNode; right?: ReactNode }) {
  useBackHandler(!!onBack, onBack ?? noop);
  return (
    <div className="screen">
      <header className="screen-head">
        {onBack ? <button className="icon-btn" onClick={() => { sfx("tap"); onBack(); }} aria-label={t("ui.back")}>‹</button> : <span />}
        <h1>{title}</h1>
        <span className="screen-right">{right}</span>
      </header>
      <div className="screen-body">{children}</div>
    </div>
  );
}

// ---------- Reklam taklidi (tarayıcıda) ----------
export function WebAdOverlay() {
  const [state, setState] = useState<{ resolve: (b: boolean) => void; left: number; kind: "rewarded" | "interstitial" } | null>(null);
  useEffect(() => {
    registerWebAdHandler(kind => new Promise<boolean>(resolve => setState({ resolve, left: kind === "rewarded" ? 5 : 3, kind })));
  }, []);
  useEffect(() => {
    if (!state || state.left <= 0) return;
    const id = setTimeout(() => setState(s => s && { ...s, left: s.left - 1 }), 1000);
    return () => clearTimeout(id);
  }, [state]);
  if (!state) return null;
  const done = state.left <= 0;
  const rewarded = state.kind === "rewarded";
  return (
    <div className="ad-overlay">
      <div className="ad-box">
        <div className="ad-label">{rewarded ? t("ui.adTestLabel") : t("ui.adInterstitialLabel")}</div>
        <div className="ad-art">{rewarded ? "📺" : "🪧"}</div>
        <p>{done ? t("ui.adDone") : t("ui.adWatching", { n: state.left })}</p>
        <div className="row">
          {done
            ? <button className="btn primary" onClick={() => { state.resolve(true); setState(null); }}>{rewarded ? t("ui.adClaim") : t("ui.close")}</button>
            : rewarded && <button className="btn ghost" onClick={() => { state.resolve(false); setState(null); }}>{t("ui.adSkip")}</button>}
        </div>
      </div>
    </div>
  );
}
// ---------- Test satın alma penceresi (gerçek ödeme alınmaz) ----------
export function MockPurchaseOverlay({ nameOf }: { nameOf: (id: string) => string }) {
  const [st, setSt] = useState<{ p: ProductDef; price: string; resolve: (b: boolean) => void } | null>(null);
  useEffect(() => { registerMockPurchaseHandler((p, price) => new Promise<boolean>(resolve => setSt({ p, price, resolve }))); }, []);
  const close = (ok: boolean) => { st?.resolve(ok); setSt(null); };
  return (
    <Sheet open={!!st} onClose={() => close(false)} title={`🧾 ${t("ui.mockBuyTitle")}`}>
      {st && <>
        <p><b>{nameOf(st.p.id)}</b> · {st.price}</p>
        <p className="note-box">{t("ui.mockBuyNote")}</p>
        <div className="stack">
          <button className="btn primary" onClick={() => close(true)}>{t("ui.mockBuyConfirm")}</button>
          <button className="btn ghost" onClick={() => close(false)}>{t("ui.cancel")}</button>
        </div>
      </>}
    </Sheet>
  );
}

// ---------- Hak göstergesi + "hakkın bitti" penceresi ----------
export function EnergyChip({ energy, icon, onClick }: { energy: Energy; icon: string; onClick?: () => void }) {
  useEnergy(energy);
  const ms = energy.msToNext();
  return (
    <button className="chip energy" onClick={onClick}>
      <span>{icon} {energy.value}</span>
      {energy.cfg.mode === "regen" && ms != null && energy.value < energy.cfg.max && (
        <small>{formatClock(ms / 1000)}</small>
      )}
    </button>
  );
}

export function EnergySheet({ energy, open, onClose, icon, unitKey, premiumNote }: { energy: Energy; open: boolean; onClose: () => void; icon: string; unitKey: string; premiumNote?: string }) {
  useEnergy(energy);
  const [busy, setBusy] = useState(false);
  const ms = energy.msToNext();
  const watch = async () => {
    setBusy(true);
    const res = await showRewardedAd();
    setBusy(false);
    if (res === "failed") { toast(t("ui.adFailed"), "bad", "📡"); return; }
    if (res === "closed") return;
    if (energy.grantFromAd()) { sfx("good"); toast(t("ui.adRewarded", { unit: t(unitKey) }), "good", icon); onClose(); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={`${icon} ${t(unitKey)}: ${energy.value}`}>
      <p className="muted">
        {energy.cfg.mode === "regen"
          ? (ms != null ? t("ui.energyNextRegen", { time: formatClock(ms / 1000) }) : t("ui.energyFull"))
          : t("ui.energyNextDaily", { time: formatDuration((ms ?? 0) / 1000 / 60) })}
      </p>
      <div className="stack">
        {premiumNote ? <p className="note-box">👑 {premiumNote}</p> : <>
          <button className="btn primary" disabled={busy || energy.adsLeft <= 0} onClick={watch}>
            📺 {t("ui.watchAdFor", { n: energy.cfg.adAmount, unit: t(unitKey) })}
          </button>
          <p className="muted small center">{t("ui.adsLeftToday", { n: energy.adsLeft })}</p>
        </>}
        <button className="btn ghost" onClick={onClose}>{t("ui.close")}</button>
      </div>
    </Sheet>
  );
}

// ---------- İstatistikler ----------
export type StatRow = { label: string; value: string; icon?: string };

export function StatsScreen({ progress, rows, onBack, chartLabel }: { progress: Progress; rows: StatRow[]; onBack: () => void; chartLabel: string }) {
  useProgress(progress); useLang();
  const hist = progress.history.slice(-14);
  const maxScore = Math.max(1, ...hist.map(h => h.score));
  return (
    <Screen title={t("ui.stats")} onBack={onBack}>
      <div className="stat-hero">
        <div><b>{formatNumber(progress.leaderboardScore())}</b><span>{t("ui.rankScore")}</span></div>
        <div><b>🔥 {progress.streak.current}</b><span>{t("ui.streak")}</span></div>
        <div><b>{progress.streak.best}</b><span>{t("ui.bestStreak")}</span></div>
      </div>
      <div className="card">
        <h3 className="card-title">{chartLabel}</h3>
        {hist.length === 0 ? <p className="muted">{t("ui.noHistory")}</p> : (
          <div className="bars" role="img" aria-label={chartLabel}>
            {hist.map((h, i) => (
              <div key={i} className="bar-col" title={`${h.day}: ${h.score}`}>
                <div className="bar" style={{ height: `${Math.max(4, (h.score / maxScore) * 100)}%` }} />
                <small>{h.day.slice(8)}</small>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card list">
        {rows.map(r => (
          <div className="list-row" key={r.label}>
            <span>{r.icon} {r.label}</span><b>{r.value}</b>
          </div>
        ))}
      </div>
    </Screen>
  );
}

// ---------- Başarımlar ----------
export function AchievementsScreen({ progress, onBack }: { progress: Progress; onBack: () => void }) {
  useProgress(progress); useLang();
  const list = progress.achievements;
  const done = list.filter(a => progress.isUnlocked(a.id)).length;
  return (
    <Screen title={t("ui.achievements")} onBack={onBack} right={<span className="chip">{done}/{list.length}</span>}>
      {playGamesAvailable() && (
        <button className="btn ghost" onClick={async () => { if (!(await showNativeAchievements(progress))) toast(t("ui.playGamesFailed"), "bad"); }}>
          🎮 {t("ui.openPlayAchievements")}
        </button>
      )}
      <div className="ach-grid">
        {list.map(a => {
          const un = progress.isUnlocked(a.id);
          const secret = a.hidden && !un;
          const v = Math.min(a.goal, a.value(progress.stats));
          return (
            <div key={a.id} className={`ach ${un ? "on" : ""}`}>
              <div className="ach-icon">{secret ? "❔" : a.icon}</div>
              <div className="ach-text">
                <b>{secret ? t("ui.secretAch") : t(`ach.${a.id}.title`)}</b>
                <span>{secret ? t("ui.secretAchDesc") : t(`ach.${a.id}.desc`)}</span>
                {!un && a.goal > 1 && !secret && (
                  <div className="mini-bar"><i style={{ width: `${(v / a.goal) * 100}%` }} /><small>{v}/{a.goal}</small></div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Screen>
  );
}

// ---------- Sıralama ----------
export function LeaderboardScreen({ progress, ids, onBack }: { progress: Progress; ids: LeaderboardIds; onBack: () => void }) {
  useProgress(progress); useLang();
  const native = nativeLeaderboardAvailable(ids);
  const correct = progress.stat("correct");
  const avg = correct ? progress.stat("secondsOnCorrect") / correct : 0;
  return (
    <Screen title={t("ui.leaderboard")} onBack={onBack}>
      <div className="card center">
        <div className="big-number">{formatNumber(progress.leaderboardScore())}</div>
        <p className="muted">{t("ui.rankScore")}</p>
      </div>
      <div className="card list">
        <div className="list-row"><span>✅ {t("ui.correctDecisions")}</span><b>{formatNumber(correct)}</b></div>
        <div className="list-row"><span>⏱ {t("ui.avgTime")}</span><b>{correct ? formatDuration(avg) : "—"}</b></div>
        <div className="list-row"><span>🎯 {t("ui.parTime")}</span><b>{formatDuration(progress.lb.parSeconds)}</b></div>
      </div>
      <p className="muted small">{t("ui.rankFormula")}</p>
      {native
        ? <button className="btn primary" onClick={async () => { if (!(await showNativeLeaderboard(ids, progress))) toast(t("ui.playGamesFailed"), "bad"); }}>🏆 {t("ui.openPlayGames")}</button>
        : <p className="note-box">{t("ui.playGamesSoon")}</p>}
    </Screen>
  );
}

// ---------- Ayarlar ----------
export function SettingsScreen({ appName, version, onBack, onOpenPrivacy, onOpenTerms, onResetProgress, onReplayTutorial, onRestorePurchases }: {
  appName: string; version: string; onBack: () => void; onOpenPrivacy: () => void; onOpenTerms: () => void;
  onResetProgress: () => void; onReplayTutorial?: () => void; onRestorePurchases?: () => void;
}) {
  useLang();
  const [a, setA] = useState(getAudioPrefs());
  const [notif, setNotif] = useState(notificationsEnabled());
  const [confirmReset, setConfirmReset] = useState(false);
  const [langPref, setLangPref] = useState<Lang | "auto">(getLangPref());
  return (
    <Screen title={t("ui.settings")} onBack={onBack}>
      <section className="card">
        <h3 className="card-title">{t("ui.sound")}</h3>
        <label className="slider-row">
          <span>🎵 {t("ui.music")}</span>
          <input type="range" min={0} max={1} step={0.05} value={a.music}
            onChange={e => { const v = +e.target.value; setMusicVolume(v); setA({ ...a, music: v }); }} />
        </label>
        <label className="slider-row">
          <span>🔔 {t("ui.effects")}</span>
          <input type="range" min={0} max={1} step={0.05} value={a.sfx}
            onChange={e => { const v = +e.target.value; setSfxVolume(v); setA({ ...a, sfx: v }); }} onPointerUp={() => sfx("good")} />
        </label>
        <label className="toggle-row">
          <span>📳 {t("ui.haptics")}</span>
          <input type="checkbox" checked={a.haptics} onChange={e => { setHaptics(e.target.checked); setA({ ...a, haptics: e.target.checked }); }} />
        </label>
      </section>

      <section className="card">
        <label className="toggle-row">
          <span>🔔 {t("ui.notifications")}<small className="muted block">{t("ui.notificationsDesc")}</small></span>
          <input type="checkbox" checked={notif} onChange={async e => setNotif(await setNotificationsEnabled(e.target.checked))} />
        </label>
        <label className="select-row">
          <span>🌐 {t("ui.language")}</span>
          <select value={langPref} onChange={e => { const v = e.target.value as Lang | "auto"; setLangPref(v); setLang(v); }}>
            <option value="auto">{t("ui.langAuto")}</option>
            {LANGS.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
        </label>
      </section>

      <section className="card list">
        {onReplayTutorial && <button className="list-row link" onClick={onReplayTutorial}><span>🎓 {t("ui.replayTutorial")}</span><b>›</b></button>}
        {onRestorePurchases && <button className="list-row link" onClick={onRestorePurchases}><span>🧾 {t("ui.restorePurchases")}</span><b>›</b></button>}
        <button className="list-row link" onClick={onOpenPrivacy}><span>🔒 {t("ui.privacy")}</span><b>›</b></button>
        <button className="list-row link" onClick={onOpenTerms}><span>📄 {t("ui.terms")}</span><b>›</b></button>
        {Capacitor.isNativePlatform() && <button className="list-row link" onClick={openAdPrivacyOptions}><span>📺 {t("ui.adPrivacy")}</span><b>›</b></button>}
        <button className="list-row link danger" onClick={() => setConfirmReset(true)}><span>🗑 {t("ui.resetProgress")}</span><b>›</b></button>
      </section>

      <p className="muted small center">{appName} · {t("ui.version")} {version}<br />{t("ui.madeWith")}</p>

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title={t("ui.resetConfirmTitle")}>
        <p>{t("ui.resetConfirmBody")}</p>
        <div className="stack">
          <button className="btn danger" onClick={() => { onResetProgress(); setConfirmReset(false); toast(t("ui.resetDone")); }}>{t("ui.resetYes")}</button>
          <button className="btn ghost" onClick={() => setConfirmReset(false)}>{t("ui.cancel")}</button>
        </div>
      </Sheet>
    </Screen>
  );
}

// ---------- Yasal metin ----------
export function LegalScreen({ title, text, onBack }: { title: string; text: string; onBack: () => void }) {
  return (
    <Screen title={title} onBack={onBack}>
      <article className="card legal">{text.split("\n\n").map((p, i) => p.startsWith("## ")
        ? <h3 key={i}>{p.slice(3)}</h3>
        : <p key={i}>{p}</p>)}</article>
    </Screen>
  );
}

// ---------- Günlük görevler ----------
export function QuestsCard({ quests }: { quests: DailyQuests }) {
  useQuests(quests); useLang();
  const list = quests.today;
  const reward = (r: { icon: string; amount: number }) => `${r.icon} ${formatNumber(r.amount)}`;
  const midnight = new Date(); midnight.setHours(24, 0, 0, 0);
  const left = Math.max(0, midnight.getTime() - Date.now()) / 1000;
  return (
    <section className="card quests">
      <header className="quests-head">
        <h3 className="card-title">📋 {t("ui.quests")}</h3>
        <small className="muted">{t("ui.questsRefresh", { h: Math.floor(left / 3600), m: Math.floor((left % 3600) / 60) })}</small>
      </header>
      {list.map(q => {
        const v = Math.min(q.goal, quests.value(q)), done = quests.done(q), claimed = quests.claimed(q);
        return (
          <div key={q.id} className={`quest ${claimed ? "claimed" : done ? "ready" : ""}`}>
            <span className="quest-icon">{q.icon}</span>
            <div className="quest-body">
              <span>{t(`quest.${q.id}`, { n: q.goal })}</span>
              <div className="mini-bar"><i style={{ width: `${(v / q.goal) * 100}%` }} /></div>
            </div>
            {claimed ? <span className="quest-done">✓</span>
              : done ? <button className="btn small primary" onClick={() => { if (quests.claim(q)) { sfx("coin"); toast(`${t("ui.questClaimed")} ${reward(q.reward)}`, "good"); } }}>{reward(q.reward)}</button>
              : <small className="quest-count">{v}/{q.goal}</small>}
          </div>
        );
      })}
      <div className={`quest bonus ${quests.bonusClaimed ? "claimed" : ""}`}>
        <span className="quest-icon">🎁</span>
        <div className="quest-body"><span>{t("ui.questBonus")}</span></div>
        {quests.bonusClaimed ? <span className="quest-done">✓</span>
          : <button className="btn small primary" disabled={!quests.allClaimed}
              onClick={() => { if (quests.claimBonus()) { sfx("unlock"); toast(`${t("ui.questClaimed")} ${reward(quests.bonus)}`, "ach", "🎁"); } }}>{reward(quests.bonus)}</button>}
      </div>
    </section>
  );
}

export function useTicker(ms = 1000) {
  const [, set] = useState(0);
  useEffect(() => { const id = setInterval(() => set(x => x + 1), ms); return () => clearInterval(id); }, [ms]);
}
