// Gizlilik politikası ve kullanım koşulları. Diğer dillerde İngilizce metin gösterilir;
// mağaza için web'de yayınlanacak sürüm de bu metinden üretilir (docs/ klasörüne bakın).
import type { Lang } from "./i18n";

// Gizlilik politikasında ve mağazada herkese açık görünen iletişim adresi.
const CONTACT = "ogulcanfidannn@gmail.com";
const UPDATED = "29.09.2026";

export function privacyText(app: string, lang: Lang): string {
  if (lang === "tr") return `Son güncelleme: ${UPDATED}

## Kısaca
${app}, hesap açmanı istemez ve adını, e-postanı ya da konumunu toplamaz. Oyun ilerlemen yalnızca telefonunda saklanır.

## Telefonunda saklananlar
Oyun ilerlemesi, istatistikler, başarımlar, ayarlar (dil, ses, bildirim tercihi). Bu veriler bize gönderilmez. Uygulamayı silersen ya da ayarlardan "İlerlemeyi sıfırla"yı seçersen silinir.

## Reklamlar (Google AdMob)
İsteğe bağlı ödüllü reklamlar ve gün sonlarında seyrek geçiş reklamları Google AdMob ile gösterilir. AdMob, reklam göstermek ve ölçmek için cihazının reklam kimliğini, IP adresini ve kaba konum bilgisini kullanabilir. Avrupa Ekonomik Alanı ve Birleşik Krallık'taki kullanıcılardan bunun için onay istenir; tercihini Ayarlar > Reklam gizlilik seçenekleri bölümünden değiştirebilirsin. Ayrıntılar: https://policies.google.com/technologies/ads

## Uygulama içi satın almalar
Satın almalar Google Play (ya da App Store) üzerinden yapılır; ödeme bilgilerin bize ulaşmaz. Uygulama yalnızca hangi ürünü satın aldığını (ör. reklamsız paket) doğrulamak için mağazadan bilgi alır.

## Google Play Games
Sıralamaya katılırsan puanın ve Play Games oyuncu adın Google'a gönderilir ve diğer oyuncular tarafından görülebilir. Bu, Google'ın gizlilik politikasına tabidir.

## Bildirimler
Bildirimler telefonunda yerel olarak zamanlanır; bir sunucu kullanılmaz. Ayarlardan kapatabilirsin.

## Çocuklar
Oyun 13 yaş altı çocuklara yönelik değildir ve bilerek çocuklardan veri toplamaz.

## İletişim
Sorular ve silme talepleri için: ${CONTACT}`;

  return `Last updated: ${UPDATED}

## In short
${app} does not ask you to create an account and does not collect your name, email or location. Your game progress is stored only on your phone.

## Stored on your phone
Game progress, statistics, achievements and settings (language, sound, notification preference). This data is not sent to us. It is deleted when you uninstall the app or choose "Reset progress" in Settings.

## Ads (Google AdMob)
Optional rewarded ads and occasional end-of-day interstitial ads are served by Google AdMob. AdMob may use your device's advertising ID, IP address and approximate location to show and measure ads. Users in the European Economic Area and the UK are asked for consent; you can change your choice in Settings > Ad privacy options. Details: https://policies.google.com/technologies/ads

## In-app purchases
Purchases are processed by Google Play (or the App Store); your payment details never reach us. The app only asks the store which products you own (e.g. the ad-free pack) to unlock them.

## Google Play Games
If you take part in the leaderboard, your score and Play Games player name are sent to Google and may be visible to other players. This is covered by Google's privacy policy.

## Notifications
Notifications are scheduled locally on your phone; no server is involved. You can turn them off in Settings.

## Children
The game is not directed at children under 13 and does not knowingly collect data from children.

## Contact
For questions or deletion requests: ${CONTACT}`;
}

/** disclaimer: oyuna özel ek sorumluluk cümlesi (ör. Ekspertiz için antika uyarısı). */
export function termsText(app: string, lang: Lang, disclaimer?: { tr: string; en: string }): string {
  if (lang === "tr") return `Son güncelleme: ${UPDATED}

## Kullanım
${app}'i kişisel ve ticari olmayan amaçlarla oynayabilirsin. Oyundaki tüm karakterler, markalar, ustalar ve olaylar hayal ürünüdür; gerçek kişi ya da kurumlarla benzerlik tesadüftür.

## Oyun içi değerler
Oyun içi para ve ödüllerin gerçek parasal değeri yoktur ve gerçek paraya çevrilemez.

## Sorumluluk
Oyun "olduğu gibi" sunulur.${disclaimer ? " " + disclaimer.tr : ""}

## Değişiklikler
Bu koşullar güncellenebilir; güncel metin her zaman uygulamanın Ayarlar bölümündedir.

## İletişim
${CONTACT}`;

  return `Last updated: ${UPDATED}

## Use
You may play ${app} for personal, non-commercial purposes. All characters, brands, makers and events in the game are fictional; any resemblance to real people or organisations is coincidental.

## In-game values
In-game money and rewards have no real monetary value and cannot be exchanged for real money.

## Liability
The game is provided "as is".${disclaimer ? " " + disclaimer.en : ""}

## Changes
These terms may be updated; the current text is always available in the app's Settings.

## Contact
${CONTACT}`;
}
