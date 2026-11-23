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
| Hero haritası | Uygur topluluklarının yaşadığı şehirlerde nabız gibi atan noktalar; ana vatandan dünyaya uzanan ışık yayları; imleçle hafif paralaks |
| Slogan | Kelimeler sırayla bulanıktan netleşir, ardından üzerinden periyodik altın bir parıltı geçer |
| Tarih | Hicri tarihin yanında bugünkü **ay evresi** (UQCal'dan hesaplanır) |
| Yarım daire menü | Sağdan sola yelpaze gibi açılır; merkezden 8,5 sn'de bir ışın taraması yapılır ve ikonlar sırayla parlar; hover'da ikon dışarı fırlar + site adını gösteren baloncuk; pasif öğede "يېقىندا"; çocuğun arkasında dönen ışık huzmeleri; imlece göre 3D eğim |
| Geçiş | Hero'nun altında akan katmanlı dalgalar |
| Uygulamalar | Arka planda yükselen Uygur harfleri; ikonlar kaydırınca yaylanarak belirir, hafifçe süzülür; hover'da 3D eğim + ışık yansıması; tıklamada dalga efekti |
| Modal | Bulanık arka plan, yaylanarak açılış, iframe yüklenene kadar "يۈكلىنىۋاتىدۇ…" göstergesi |
| Dil seçici & footer | Yumuşak açılan menü; sosyal ikonlar sırayla belirir ve imlece "mıknatıs" gibi çekilir |

**Erişilebilirlik ve performans:** "Hareketi azalt" ayarı açık olan ziyaretçilerde tüm hareket kapanır. Canvas animasyonları yalnızca ekranda görünürken çalışır. Dokunmatik cihazlarda eğim, paralaks ve mıknatıs efektleri kapalıdır. JS çalışmazsa sayfa bugünkü haliyle görünür. Arayüz metinleri sitedeki 6 dilin hepsinde (`pageLang`) hazır.

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

Harita kalibrasyonu `bg.jpg` (1920×629) içindir; arka plan görseli değişirse `motion.js` içindeki `CAL` değerlerinin güncellenmesi gerekir.
