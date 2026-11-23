# ewlat.org — Animasyon & Etkileşim Katmanı

Mevcut siteye (PHP + Bootstrap 5 + jQuery) **dokunmadan** eklenen bir hareket katmanı.
Stiller **Tailwind CSS v4** ile yazıldı. Bootstrap ile çakışmaması için Tailwind'in reset'i (preflight) kapalı ve tüm sınıflar `tw:` önekli.

## Sunucuya kurulum

1. Şunları sunucuda **aynı yollara** yükleyin:
   - `assets/css/motion.css`
   - `assets/js/motion.js`
   - `assets/images/wheel/` klasörü (dönme dolabın ikon ve yazı parçaları, 24 küçük PNG)
2. `index.php` içinde:

```html
<!-- <head> içinde, app.css satırının hemen ALTINA -->
<link rel="stylesheet" href="assets/css/motion.css">

<!-- </body> etiketinin hemen ÖNCESİNE (sayfadaki mevcut <script> bloğundan sonra) -->
<script src="assets/js/motion.js" defer></script>
```

Başka bir şey değiştirmenize gerek yok. Kaldırmak için bu iki satırı silmeniz yeterli.
`wheel/` klasörü yüklenmezse dönme dolap kurulmaz, menü orijinal haliyle çalışmaya devam eder.

## Neler eklendi

| Bölüm | Etki |
|---|---|
| Slogan | Kelimeler sırayla bulanıktan netleşir, ardından üzerinden periyodik altın bir parıltı geçer |
| Tarih | Hicri tarihin yanında bugünkü **ay evresi** (UQCal'dan hesaplanır) |
| Yarım daire menü | **Dönme dolap.** Ortadaki ay ve kitap okuyan çocuk sabit göbektir. Çevresinde yeniden çizilmiş bir çark döner: çift jant, sırayla yanan ampuller ve kesintisiz, yumuşak bir renk halkası. 12 yuvarlak ikon, altlarındaki yazılarla birlikte jant üzerindeki pimlere asılıdır ve yerçekimiyle hep dik durur. Çark hızlanıp yavaşladıkça sarkaç gibi sallanır; salınım sınırlı ve sönümlüdür. Açılışta çark bir kez çevrilir, sonra yavaşça döner. Fare çarkın üzerine gelince durur, böylece bağlantılara rahat tıklanır. Fareyle ya da parmakla tutup çevrilebilir, bırakınca savrulur (sürükleme bağlantı açmaz). Hover'da ikon büyür ve site adını gösteren baloncuk çıkar; pasif öğede "يېقىندا" |
| Geçiş | Hero'nun altında akan katmanlı dalgalar |
| Uygulamalar | Arka planda yükselen Uygur harfleri; ikonlar kaydırınca yaylanarak belirir, hafifçe süzülür; hover'da 3D eğim + ışık yansıması; tıklamada dalga efekti |
| Modal | Bulanık arka plan, yaylanarak açılış, iframe yüklenene kadar "يۈكلىنىۋاتىدۇ…" göstergesi |
| Dil seçici & footer | Yumuşak açılan menü; sosyal ikonlar sırayla belirir ve imlece "mıknatıs" gibi çekilir |

**Erişilebilirlik ve performans:** "Hareketi azalt" ayarı açık olan ziyaretçilerde tüm hareket kapanır ve menü orijinal haliyle durur. Çark ve harf animasyonu yalnızca ekranda görünürken çalışır. Dokunmatik cihazlarda eğim ve mıknatıs efektleri kapalıdır. JS çalışmazsa sayfa bugünkü haliyle görünür. Arayüz metinleri sitedeki 6 dilin hepsinde (`pageLang`) hazır.

**Ayarlar** (`assets/js/motion.js`, `buildWheel` içinde):
- `AUTO` — çarkın sürekli dönüş hızı (derece/saniye; negatif = saat yönünün tersi)
- `MAXPHI` — kabinlerin en fazla sallanma açısı (radyan)
- `DAMP` — salınımın ne kadar çabuk durulacağı
- `WIND` — hafif rüzgâr salınımı (0 = kapalı)

## Geliştirme

```bash
npm install          # Tailwind CLI + pngjs
npm run dev          # src/motion.css → assets/css/motion.css (izleme modu)
npm run build        # küçültülmüş derleme
npm run wheel        # menu.png → assets/images/wheel/ (ikon ve yazı parçaları)
npm run preview      # http://localhost:8080/preview/
```

- `src/motion.css` — Tailwind kaynağı (tema, keyframe'ler, mevcut seçicilere ait geçersiz kılma kuralları)
- `assets/js/motion.js` — tüm etkileşimler; Tailwind sınıfları bu dosyadan taranır. JS'e yeni bir `tw:` sınıfı eklediğinizde `npm run build` çalıştırın.
- `tools/build-wheel.mjs` — `menu.png`'den 12 yuvarlak ikonu ve yazıyı saydam parçalar olarak çıkarır. **`menu.png` değişirse** `npm run wheel` çalıştırın ve çıktıdaki `wheel.json` değerlerini `motion.js` içindeki `WHEEL` sabitine kopyalayın.
- `preview/` — canlı ana sayfanın yerel kopyası, **yalnızca test içindir, sunucuya yüklemeyin.** Uygulama popup'ları localhost'tan açılmaz; canlı sitede normal çalışır.
