# Koleksiyoncu: Sahte mi Gerçek mi?

Dedenden kalan antika dükkânını işlettiğin bir çıkarım oyunu. Müşteriler cep
saati, sikke ve tablo getiriyor; kataloğa ve aletlere bakarak sahteyi
yakalıyor, gerçeği pazarlıkla alıyorsun. Gün sonunda eserleri müzayedede
satıyor ya da vitrine koyuyorsun. Uzun vadeli hedef, dedenin hayali olan
18 eserlik koleksiyonu tamamlamak.

İngilizce adı: *The Collector: Real or Fake*.

## Özellikler

- Kurallarla üretilen eşyalar: her sahte, eldeki aletlerle yakalanabilir
- Büyüteç, terazi, kumpas, mihenk taşı, UV lamba ve pigment analizi
- Pazarlık, müzayede, vitrin geliri ve set ödülleri
- Beş rütbe, günlük görevler, 22 başarım
- Google Play Games sıralaması ve başarımları
- Günlük anahtar sistemi; ödüllü reklam ya da tek seferlik satın almayla artırılabilir
- Sakin müzik ve ses efektleri, 9 dilde arayüz

React + TypeScript ile yazılmış, Android için Capacitor ile paketlenmiş bir oyun.

## Geliştirme

```bash
npm install
npm run dev          # tarayıcıda çalıştırır
npm run typecheck
npm run test:gen     # eşya üreticisi testi
npm run android      # test derlemesi (satın almalar taklit) → emülatör
npm run release      # imzalı AAB
```

`android/` klasörü depoda yok; ilk derlemede `npx cap add android` ile
üretilir, kalıcı ayarlar `scripts/android-post.cjs` içinde. Play Games köprüsü
`plugins/play-games` altında.

İmzalı derleme için `release/keystore.properties` ve yükleme anahtarı
gerekir; ikisi de depoya girmez.

## Gizlilik politikası

https://fmjapps.github.io/privacy/collector/
