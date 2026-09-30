import { useEffect, useState } from "react";
import { t, getLang, formatMoney, formatNumber, formatDuration, useLang } from "@shared/src/i18n";
import { setMusicTheme, unlockAudio } from "@shared/src/audio";
import {
  AchievementsScreen, LeaderboardScreen, LegalScreen, MockPurchaseOverlay, SettingsScreen, StatsScreen, Toasts,
  WebAdOverlay, Screen, announceAchievement, toast,
} from "@shared/src/ui";
import { initPlayGames } from "@shared/src/leaderboard";
import { initStore, restorePurchases } from "@shared/src/store";
import { privacyText, termsText } from "@shared/src/legal";
import { HomeScreen, type Nav } from "./screens/Home";
import { PlayScreen } from "./screens/Play";
import { ReportScreen } from "./screens/Report";
import { ShopScreen } from "./screens/Shop";
import { CollectionScreen } from "./screens/Collection";
import { IntroScreen } from "./screens/Intro";
import { CatalogView } from "./components/CatalogView";
import { ANTIQUE_DISCLAIMER } from "./disclaimer";
import {
  COLLECTION_SIZE, PRODUCTS, collectionValue, deliverProduct, markIntroSeen, progress, rank, refreshReminder,
  resetAllProgress, startTutorial, useGame, type DaySummary,
} from "./state";

type Route = { name: "home" } | { name: "play" } | { name: "report"; summary: DaySummary } | { name: Nav } | { name: "privacy" } | { name: "terms" };

const VERSION = "1.0.3";

// Google Play Oyun Hizmetleri (proje 713398800109). iOS Game Center eklenince ios alanları doldurulacak.
const LEADERBOARD = { android: "CgkI7Z2Hz-EUEAIQAQ", ios: "" };
const PLAY_ACHIEVEMENTS: Record<string, string> = {
  firstDay: "CgkI7Z2Hz-EUEAIQBg", fakes10: "CgkI7Z2Hz-EUEAIQFQ", fakes50: "CgkI7Z2Hz-EUEAIQBQ", perfectDay: "CgkI7Z2Hz-EUEAIQEg",
  perfect5: "CgkI7Z2Hz-EUEAIQDQ", treasure: "CgkI7Z2Hz-EUEAIQEA", haggler: "CgkI7Z2Hz-EUEAIQDA", sharpEye: "CgkI7Z2Hz-EUEAIQDg",
  profit10k: "CgkI7Z2Hz-EUEAIQAw", profit100k: "CgkI7Z2Hz-EUEAIQCQ", allTools: "CgkI7Z2Hz-EUEAIQBw", allCatalogs: "CgkI7Z2Hz-EUEAIQFg",
  streak7: "CgkI7Z2Hz-EUEAIQCA", days30: "CgkI7Z2Hz-EUEAIQAg", reputation: "CgkI7Z2Hz-EUEAIQFw", stamps10: "CgkI7Z2Hz-EUEAIQCg",
  stampsAll: "CgkI7Z2Hz-EUEAIQEQ", rankMaster: "CgkI7Z2Hz-EUEAIQCw", rankLegend: "CgkI7Z2Hz-EUEAIQBA", quests10: "CgkI7Z2Hz-EUEAIQDw",
  bareEye: "CgkI7Z2Hz-EUEAIQEw", fooled: "CgkI7Z2Hz-EUEAIQFA",
};
const PRODUCT_NAMES: Record<string, string> = { collector_ad_free: "iap.adFree", keys_5: "iap.keys_5", keys_15: "iap.keys_15" };

export function App() {
  useLang();
  const g = useGame();
  const [route, setRoute] = useState<Route>(() => (g.run ? { name: "play" } : { name: "home" }));

  useEffect(() => {
    setMusicTheme("shop");
    progress.onUnlock = announceAchievement;
    refreshReminder();
    // Kalıcı satın alımlar (reklamsız paket) her açılışta mağazadan doğrulanır.
    void initStore(PRODUCTS, id => deliverProduct(id));
    // Genel sıralama ve başarımlar Google Play Games ile otomatik eşitlenir.
    void initPlayGames({ leaderboard: LEADERBOARD, achievements: PLAY_ACHIEVEMENTS }, progress);
    const first = () => { unlockAudio(); window.removeEventListener("pointerdown", first); };
    window.addEventListener("pointerdown", first);
    return () => window.removeEventListener("pointerdown", first);
  }, []);

  const home = () => setRoute({ name: "home" });
  const appName = t("app.name");
  const correct = progress.stat("correct"), wrong = progress.stat("wrong");

  if (!g.introSeen && !g.tutorialDone) {
    return (
      <div className="app-root">
        <IntroScreen onDone={markIntroSeen} />
      </div>
    );
  }

  let body;
  switch (route.name) {
    case "play": body = <PlayScreen onExit={home} onDayEnd={summary => setRoute({ name: "report", summary })} />; break;
    case "report": body = <ReportScreen summary={route.summary} onDone={home} />; break;
    case "shop": body = <ShopScreen onBack={home} />; break;
    case "collection": body = <CollectionScreen onBack={home} />; break;
    case "catalog": body = <Screen title={t("cat.title")} onBack={home}><CatalogView owned={g.cats} tier={rank()} stamps={Object.keys(g.collection)} /></Screen>; break;
    case "stats": body = (
      <StatsScreen progress={progress} onBack={home} chartLabel={t("stats.chart")} rows={[
        { icon: "🗓", label: t("stat.days"), value: formatNumber(progress.stat("days")) },
        { icon: "🎯", label: t("stat.accuracy"), value: correct + wrong ? `%${Math.round((correct / (correct + wrong)) * 100)}` : "—" },
        { icon: "⏱", label: t("stat.avgTime"), value: correct ? formatDuration(progress.stat("secondsOnCorrect") / correct) : "—" },
        { icon: "🏛️", label: t("coll.title"), value: `${Object.keys(g.collection).length}/${COLLECTION_SIZE} · ${formatMoney(collectionValue())}` },
        { icon: "🕵️", label: t("stat.fakesCaught"), value: formatNumber(progress.stat("fakesCaught")) },
        { icon: "🤡", label: t("stat.fakesBought"), value: formatNumber(progress.stat("fakesBought")) },
        { icon: "🏺", label: t("stat.genuineBought"), value: formatNumber(progress.stat("genuineBought")) },
        { icon: "💎", label: t("stat.treasures"), value: formatNumber(progress.stat("treasures")) },
        { icon: "✨", label: t("stat.perfectDays"), value: formatNumber(progress.stat("perfectDays")) },
        { icon: "💰", label: t("stat.profitTotal"), value: formatMoney(progress.stat("profitTotal")) },
        { icon: "📈", label: t("stat.bestDayProfit"), value: formatMoney(progress.stat("bestDayProfit")) },
        { icon: "🔧", label: t("stat.toolUses"), value: formatNumber(progress.stat("toolUses")) },
      ]} />
    ); break;
    case "achievements": body = <AchievementsScreen progress={progress} onBack={home} />; break;
    case "leaderboard": body = <LeaderboardScreen progress={progress} ids={LEADERBOARD} onBack={home} />; break;
    case "settings": body = (
      <SettingsScreen appName={appName} version={VERSION} onBack={home}
        onOpenPrivacy={() => setRoute({ name: "privacy" })} onOpenTerms={() => setRoute({ name: "terms" })}
        onResetProgress={resetAllProgress}
        onReplayTutorial={() => { if (!g.run) { startTutorial(); setRoute({ name: "play" }); } }}
        onRestorePurchases={async () => {
          const n = await restorePurchases(id => deliverProduct(id));
          toast(n ? t("ui.restoreDone") : t("ui.restoreNone"), n ? "good" : undefined);
        }} />
    ); break;
    case "privacy": body = <LegalScreen title={t("ui.privacy")} text={privacyText(appName, getLang())} onBack={() => setRoute({ name: "settings" })} />; break;
    case "terms": body = <LegalScreen title={t("ui.terms")} text={termsText(appName, getLang(), ANTIQUE_DISCLAIMER)} onBack={() => setRoute({ name: "settings" })} />; break;
    default: body = <HomeScreen onPlay={() => setRoute({ name: "play" })} onNav={n => setRoute({ name: n })} />;
  }

  return (
    <div className="app-root">
      {body}
      <Toasts />
      <WebAdOverlay />
      <MockPurchaseOverlay nameOf={id => t(PRODUCT_NAMES[id] ?? id)} />
    </div>
  );
}
