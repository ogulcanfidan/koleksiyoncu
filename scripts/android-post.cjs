// "cap add/sync android" sonrası çalışır:
//  - AndroidManifest: AdMob uygulama kimliği (şimdilik TEST) ve izinler
//  - Ana ekrandaki uygulama adı her dilde (res/values-xx/strings.xml)
//  - Simge ve açılış ekranı (assets/ → android res)
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const res = path.join(root, "android", "app", "src", "main", "res");
const manifestPath = path.join(root, "android", "app", "src", "main", "AndroidManifest.xml");

// 1) Manifest
let m = fs.readFileSync(manifestPath, "utf8");
if (!m.includes("gms.ads.APPLICATION_ID")) {
  m = m.replace("    </application>", `        <!-- AdMob uygulama kimliği: The Collector: Real or Fake -->
        <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-2569162850712494~2912269569" />
    </application>`);
}
for (const perm of ["POST_NOTIFICATIONS", "VIBRATE", "com.android.vending.BILLING"]) {
  const name = perm.includes(".") ? perm : `android.permission.${perm}`;
  if (!m.includes(`"${name}"`)) m = m.replace(`<uses-permission android:name="android.permission.INTERNET" />`, `<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="${name}" />`);
}
// Kimlik daha önce yazılmışsa da güncel olsun.
m = m.replace(/(android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"\s+android:value=")[^"]*(")/, "$1ca-app-pub-2569162850712494~2912269569$2");
// Google Play Oyun Hizmetleri proje kimliği (değer strings.xml'de)
if (!m.includes("com.google.android.gms.games.APP_ID")) {
  m = m.replace("    </application>", `        <meta-data android:name="com.google.android.gms.games.APP_ID" android:value="@string/game_services_project_id" />
    </application>`);
}
fs.writeFileSync(manifestPath, m);
const PGS_PROJECT_ID = "713398800109";

// 2) Yerelleştirilmiş uygulama adı
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/'/g, "\\'").replace(/"/g, '\\"');
const langs = { tr: "values", en: "values-en", es: "values-es", fr: "values-fr", pt: "values-pt", zh: "values-zh", ar: "values-ar", hi: "values-hi", ru: "values-ru", de: "values-de", ja: "values-ja", ko: "values-ko", it: "values-it", id: "values-in" };
for (const [lang, folder] of Object.entries(langs)) {
  const dict = JSON.parse(fs.readFileSync(path.join(root, "src", "locales", `${lang}.json`), "utf8"));
  const title = esc(dict["app.title"]);
  const dir = path.join(res, folder);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "strings.xml");
  if (folder === "values") {
    // Varsayılan dosyayı koru, yalnızca ad alanlarını güncelle
    let x = fs.readFileSync(file, "utf8");
    x = x.replace(/<string name="app_name">[^<]*<\/string>/, `<string name="app_name">${title}</string>`)
         .replace(/<string name="title_activity_main">[^<]*<\/string>/, `<string name="title_activity_main">${title}</string>`);
    if (!x.includes("game_services_project_id")) {
      x = x.replace("</resources>", `    <string name="game_services_project_id" translatable="false">${PGS_PROJECT_ID}</string>\n</resources>`);
    }
    fs.writeFileSync(file, x);
  } else {
    fs.writeFileSync(file, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <string name="app_name">${title}</string>\n    <string name="title_activity_main">${title}</string>\n</resources>\n`);
  }
}

// 2b) Koyu tema: açılış ekranı arka planı, durum çubuğu ve gezinme çubuğu oyunun rengine
const stylesPath = path.join(res, "values", "styles.xml");
let st = fs.readFileSync(stylesPath, "utf8");
if (!st.includes("windowSplashScreenBackground")) {
  st = st.replace(
    /<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">\s*<item name="android:background">@drawable\/splash<\/item>\s*<\/style>/,
    `<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:background">@drawable/splash</item>
        <item name="windowSplashScreenBackground">#1d1611</item>
        <item name="windowSplashScreenAnimatedIcon">@mipmap/ic_launcher_foreground</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
    </style>`);
  st = st.replace(
    `<item name="android:background">@null</item>
    </style>`,
    `<item name="android:background">@null</item>
        <item name="android:windowBackground">@android:color/black</item>
        <item name="android:statusBarColor">#1d1611</item>
        <item name="android:navigationBarColor">#1d1611</item>
        <item name="android:windowLightStatusBar">false</item>
        <item name="android:windowLightNavigationBar">false</item>
    </style>`);
  fs.writeFileSync(stylesPath, st);
}

// 2c) Kotlin derleyicisi ayrı bir arka plan sürecinde (daemon) değil, derlemenin içinde çalışsın.
const gp = path.join(root, "android", "gradle.properties");
let props = fs.readFileSync(gp, "utf8");
if (!props.includes("kotlin.compiler.execution.strategy")) fs.writeFileSync(gp, props.trimEnd() + "\nkotlin.compiler.execution.strategy=in-process\n");

// 2d) Sürüm ve yayın imzası (release/keystore.properties varsa)
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const [maj, min, pat] = pkg.version.split(".").map(Number);
const versionCode = maj * 10000 + min * 100 + pat;   // 1.0.0 → 10000; her yüklemede artmalı
const gradlePath = path.join(root, "android", "app", "build.gradle");
let gr = fs.readFileSync(gradlePath, "utf8");
gr = gr.replace(/versionCode \d+/, `versionCode ${versionCode}`).replace(/versionName "[^"]*"/, `versionName "${pkg.version}"`);
if (!gr.includes("signingConfigs")) {
  gr = gr.replace("    buildTypes {\n        release {", `    signingConfigs {
        release {
            def ksFile = rootProject.file("../release/keystore.properties")
            if (ksFile.exists()) {
                def ks = new Properties()
                ks.load(new FileInputStream(ksFile))
                storeFile rootProject.file(ks["storeFile"].replace("../../", "../"))
                storePassword ks["storePassword"]
                keyAlias ks["keyAlias"]
                keyPassword ks["keyPassword"]
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release`);
}
fs.writeFileSync(gradlePath, gr);

// 3) Simge ve açılış ekranı
execSync("npx capacitor-assets generate --android --iconBackgroundColor #1d1611 --splashBackgroundColor #1d1611 --splashBackgroundColorDark #1d1611", { cwd: root, stdio: "inherit" });
console.log("Android son işlemleri tamam.");
