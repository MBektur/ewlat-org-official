# ewlat.org — Animasyon & Etkileşim Katmanı

Mevcut siteye (PHP + Bootstrap 5 + jQuery) **dokunmadan** eklenen bir hareket katmanı.
Stiller **Tailwind CSS v4** ile yazıldı. Bootstrap ile çakışmaması için Tailwind'in reset'i (preflight) kapalı ve tüm sınıflar `tw:` önekli.

## Sunucuya kurulum (2 satır)

1. Şu iki dosyayı sunucuda aynı yollara yükleyin:
   - `assets/css/motion.css`
   - `assets/js/motion.js`
2. `index.php` içinde:

```html
<!-- <head> içinde, app.css satırının hemen ALTINA -->
<link rel="stylesheet" href="assets/css/motion.css">

<!-- </body> etiketinin hemen ÖNCESİNE (sayfadaki mevcut <script> bloğundan sonra) -->
<script src="assets/js/motion.js" defer></script>
```

Başka bir şey değiştirmenize gerek yok. Kaldırmak için bu iki satırı silmeniz yeterli.

## Neler eklendi

| Bölüm | Etki |
|---|---|
| Slogan | Kelimeler sırayla bulanıktan netleşir, ardından üzerinden periyodik altın bir parıltı geçer |
| Tarih | Hicri tarihin yanında bugünkü **ay evresi** (UQCal'dan hesaplanır) |
| Yarım daire menü | **Dönen çark:** menu.png'nin dış halkası (12 dilim) çark gibi döner, ortadaki ay + kitap okuyan çocuk sabit kalır. Alt yarı, halkanın 180° döndürülmüş kopyasıyla tamamlanır, böylece kesintisiz tam bir çark olur. Açılışta hızlı döner ve yavaşlar, sonra yavaşça dönmeye devam eder. Fare halkanın üzerine gelince durur, böylece bağlantılara rahat tıklanır. Fareyle ya da parmakla tutup çevrilebilir, bırakınca savrulur (sürükleme bağlantı açmaz). Hover'da ikon dışarı fırlar ve site adını gösteren baloncuk çıkar; pasif öğede "يېقىندا"; çocuğun arkasında dönen ışık huzmeleri |
| Geçiş | Hero'nun altında akan katmanlı dalgalar |
| Uygulamalar | Arka planda yükselen Uygur harfleri; ikonlar kaydırınca yaylanarak belirir, hafifçe süzülür; hover'da 3D eğim + ışık yansıması; tıklamada dalga efekti |
| Modal | Bulanık arka plan, yaylanarak açılış, iframe yüklenene kadar "يۈكلىنىۋاتىدۇ…" göstergesi |
| Dil seçici & footer | Yumuşak açılan menü; sosyal ikonlar sırayla belirir ve imlece "mıknatıs" gibi çekilir |

**Erişilebilirlik ve performans:** "Hareketi azalt" ayarı açık olan ziyaretçilerde tüm hareket kapanır. Çark ve harf animasyonu yalnızca ekranda görünürken çalışır; "hareketi azalt" açıksa çark kurulmaz, menü orijinal haliyle durur. Çarkın hızı `motion.js` içindeki `AUTO` değeriyle (derece/saniye) ayarlanır. Dokunmatik cihazlarda eğim ve mıknatıs efektleri kapalıdır. JS çalışmazsa sayfa bugünkü haliyle görünür. Arayüz metinleri sitedeki 6 dilin hepsinde (`pageLang`) hazır.

## Geliştirme

```bash
npm install          # Tailwind CLI
npm run dev          # src/motion.css → assets/css/motion.css (izleme modu)
npm run build        # küçültülmüş derleme
npm run preview      # http://localhost:8080/preview/
```

- `src/motion.css` — Tailwind kaynağı (tema, keyframe'ler, mevcut seçicilere ait geçersiz kılma kuralları)
- `assets/js/motion.js` — tüm etkileşimler; Tailwind sınıfları bu dosyadan taranır. JS'e yeni bir `tw:` sınıfı eklediğinizde `npm run build` çalıştırın.
- `preview/` — canlı ana sayfanın yerel kopyası, **yalnızca test içindir, sunucuya yüklemeyin.** Uygulama popup'ları localhost'tan açılmaz; canlı sitede normal çalışır.
