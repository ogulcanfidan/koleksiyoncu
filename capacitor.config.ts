import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.fmjapps.collector",
  appName: "The Collector",
  webDir: "dist",
  android: { backgroundColor: "#2a1f17" },
  plugins: {
    // Koyu oyun: durum/gezinme çubuğu simgeleri açık renk olsun, içerik çubukların arkasına uzansın (güvenli alan CSS ile).
    SystemBars: { style: "DARK", insetsHandling: "css" },
    LocalNotifications: { iconColor: "#c9973a" },
  },
};

export default config;
