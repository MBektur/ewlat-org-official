# ewlat.org — Animasyon & Etkileşim Katmanı

Mevcut siteye (PHP + Bootstrap 5 + jQuery) **dokunmadan** eklenen bir hareket katmanı.
Stiller **Tailwind CSS v4** ile yazıldı. Bootstrap ile çakışmaması için Tailwind'in reset'i (preflight) kapalı ve tüm sınıflar `tw:` önekli.

## Sunucuya kurulum

1. Şunları sunucuda **aynı yollara** yükleyin:
   - `assets/css/motion.css`
   - `assets/js/motion.js`
   - `assets/data/apps.json` (uygulama kartlarının içeriği: başlık, açıklama, görsel, indirme/mağaza/web bağlantıları)
   - `assets/images/apps/` (uygulama simgeleri ve mağaza rozetleri), `assets/fonts/UKIJEkran.ttf` (uygulama kartı yazı tipi)
   - `assets/images/wheel/` klasörü (`ring.webp` çark halkası, 12 yuvarlak logo, `hub.png`, `legs.png` — toplam ~310 KB)
2. `index.php` içinde:

```html
<!-- <head> içinde, app.css satırının hemen ALTINA -->
<link rel="stylesheet" href="assets/css/motion.css">

<!-- </body> etiketinin hemen ÖNCESİNE (sayfadaki mevcut <script> bloğundan sonra) -->
<script src="assets/js/motion.js" defer></script>
```

Başka bir şey değiştirmenize gerek yok. Kaldırmak için bu iki satırı silmeniz yeterli.

**Mobil için (önerilir):** `index.php`'deki viewport satırını değiştirin:

```html
<!-- eski -->  <meta name="viewport" content="width=1120">
<!-- yeni -->  <meta name="viewport" content="width=device-width, initial-scale=1">
```

Eski ayar telefonları sayfayı 1120px genişlikte küçültülmüş çizmeye zorluyor; altta büyük bir boşluk kalıyor ve sitenin `app.css` içindeki mobil kuralları hiç devreye girmiyor. Yeni ayarla sayfa telefon ekranını dolduruyor; dönme dolap da telefonda otomatik olarak büyük logolu düzene geçiyor.
`wheel/` klasörü yüklenmezse dönme dolap kurulmaz, menü orijinal haliyle çalışmaya devam eder.

## Neler eklendi

| Bölüm | Etki |
|---|---|
| Slogan | Kelimeler sırayla bulanıktan netleşir, ardından üzerinden periyodik altın bir parıltı geçer |
| Tarih | Hicri tarihin yanında bugünkü **ay evresi** (UQCal'dan hesaplanır) |
| Yarım daire menü | **Dönme dolap.** Ortadaki ay ve kitap okuyan çocuk sabit göbektir; hilalde oturan çocuğun bacakları dizden hafifçe sallanır. Çevresinde 360° bir çark döner: orijinal menu.png'nin bir diliminden üretilmiş 24 özdeş dilim (aralarında orijinaldeki gölgeli sınır çizgileri), iç ve dış çemberde çarkın kendi renginin koyu tonunda kenar çizgisi. Bandın tam ortasında 24 yer vardır; 12 yuvarlak logo karşılıklı ikişer kez yer alır, böylece görünen üst yarıda 12'sinin hepsi her an görünür. Logolar çarka merkezlerinden takılıdır ve hep dik durur; altlarındaki tek satırlık yazılar (gerçek metin) ağırlık merkezini aşağıda tutar, çark hızlanıp yavaşladıkça logo ve yazı birlikte hafifçe sallanır (sınırlı ve sönümlü). Açılışta çark bir kez çevrilir, sonra yavaşça döner. Fare çarkın üzerine gelince durur; fareyle ya da parmakla tutup çevrilebilir, bırakınca savrulur (sürükleme bağlantı açmaz). Hover'da logo büyür. Çemberin altındaki oklarla (üzerine gelince o yöne döner, tıklayınca iter) çevrilebilir. Telefonda her logo bir kez ve iki kat büyük gösterilir. **"Hepsini gör"** düğmesi ya da ortadaki çocuğa tıklama, tüm siteleri kartlarla listeleyen bir pencere açar (pasif öğede "يېقىندا"). Çocuk ara sıra başını kaldırıp indirir |
| Uygulamalar | Arka planda yükselen Uygur harfleri; ikonlar kaydırınca yaylanarak belirir, hafifçe süzülür; hover'da 3D eğim + ışık yansıması; tıklamada dalga efekti |
| Modal | Bulanık arka plan, yaylanarak açılış. Uygulama kartları (`assets/data/apps.json`) doğrudan çizilir: görsel, açıklama, indirme/mağaza/web bağlantıları ve paylaşım düğmeleri (WhatsApp, Facebook, X, Telegram, bağlantı kopyala). Veri yüklenemezse eski iframe (`popup.php`) akışı çalışır. |
| Dil seçici & footer | Yumuşak açılan menü; sosyal ikonlar sırayla belirir ve imlece "mıknatıs" gibi çekilir |

**Erişilebilirlik ve performans:** "Hareketi azalt" ayarı açık olan ziyaretçilerde tüm hareket kapanır ve menü orijinal haliyle durur. Çark ve harf animasyonu yalnızca ekranda görünürken çalışır. Dokunmatik cihazlarda eğim ve mıknatıs efektleri kapalıdır. JS çalışmazsa sayfa bugünkü haliyle görünür. Arayüz metinleri sitedeki 6 dilin hepsinde (`pageLang`) hazır.

**Ayarlar** (`assets/js/motion.js`, `buildWheel` içinde):
- `AUTO` — çarkın sürekli dönüş hızı (derece/saniye; negatif = saat yönünün tersi)
- `MAXPHI` — logoların en fazla sallanma açısı (radyan)
- `DAMP` — salınımın ne kadar çabuk durulacağı
- `WIND` — hafif rüzgâr salınımı (0 = kapalı)

## Geliştirme

```bash
npm install          # Tailwind CLI + pngjs
npm run dev          # src/motion.css → assets/css/motion.css (izleme modu)
npm run build        # küçültülmüş derleme
npm run wheel        # menu.png → assets/images/wheel/ (logolar, göbek, bacaklar)
npm run preview      # http://localhost:8080/preview/ (popup.php'yi ewlat.org'a aktaran yerel sunucu)
```

- `src/motion.css` — Tailwind kaynağı (tema, keyframe'ler, mevcut seçicilere ait geçersiz kılma kuralları)
- `assets/js/motion.js` — tüm etkileşimler; Tailwind sınıfları bu dosyadan taranır. JS'e yeni bir `tw:` sınıfı eklediğinizde `npm run build` çalıştırın.
- `tools/build-wheel.mjs` — `menu.png`'den çark halkasını (`ring.webp`; dilim, kenar kalınlığı ve band ölçüleri dosyanın başındaki `RING_*` sabitleriyle ayarlanır), 12 yuvarlak logoyu, sabit göbeği (`hub.png`, alt bacakları silinmiş) ve çocuğun alt bacaklarını (`legs.png`) saydam parçalar olarak çıkarır. Logoların altındaki yazılar resim değil, `motion.js` içindeki `WHEEL.labels` dizisinde gerçek metindir. **`menu.png` değişirse** `npm run wheel` çalıştırın ve çıktıdaki `wheel.json` değerlerini `motion.js` içindeki `WHEEL` sabitine kopyalayın.
- `preview/` — canlı ana sayfanın yerel kopyası, **yalnızca test içindir, sunucuya yüklemeyin.** `popup.php` `X-Frame-Options: SAMEORIGIN` ile geldiği için başka bir alan adındaki iframe'de gösterilmez; bu yüzden önizlemede `popup.php` istekleri ewlat.org'a aktarılır (yerelde `tools/serve.mjs`, Vercel'de `vercel.json` → `rewrites`).
