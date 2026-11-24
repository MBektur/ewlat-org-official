
# ewlat.org — Animasyon & Etkileşim Katmanı

Mevcut siteye (PHP + Bootstrap 5 + jQuery) **dokunmadan** eklenen bir hareket katmanı.
Düz CSS + vanilla JS + JSON. **Derleme yok, Node.js gerekmez** — dosyaları olduğu gibi yükleyin.

## Sunucuya kurulum

1. Şunları sunucuda **aynı yollara** yükleyin:
   - `assets/css/motion.css`
   - `assets/js/motion.js`
   - `assets/data/ui.json` (çark öğeleri ve arayüz metinleri, 6 dilde) ve `assets/data/apps.json` (uygulama kartlarının içeriği)
   - `assets/images/apps/` (uygulama simgeleri ve mağaza rozetleri), `assets/fonts/UKIJEkran.ttf` (uygulama kartı yazı tipi)
   - `assets/images/wheel/` klasörü (`ring.webp` çark halkası, 12 yuvarlak logo, `hub.png`, `legs.png`, `head.png`, `wheel.json`)
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
`assets/data/ui.json`, `assets/images/wheel/wheel.json` ya da `wheel/` klasörü yüklenmezse dönme dolap kurulmaz, menü orijinal haliyle çalışmaya devam eder.

## Neler eklendi

| Bölüm | Etki |
|---|---|
| Slogan | Kelimeler sırayla bulanıktan netleşir, ardından üzerinden periyodik altın bir parıltı geçer |
| Tarih | Hicri + Miladi tarih **6 dilde ve 3 Uygur yazısında** (Arap, Latin, Kiril) doğru yazılır (`ui.json` → `calendar`; Hicri hesap sitenin UQCal'ı). Hicri tarihin yanında bugünkü **ay evresi** |
| Yarım daire menü | **Dönme dolap.** Ortadaki ay ve kitap okuyan çocuk sabit göbektir; hilalde oturan çocuğun bacakları dizden sallanır, başı ara sıra kalkıp iner; altındaki yazı (ئەۋلاد گۇرۇپپىسى / Ewlad Grubu / …) resim değil, dile göre gerçek metindir (`ui.json` → `strings.hubTitle`). Çevresinde 360° bir çark döner: orijinal menu.png'nin bir diliminden üretilmiş özdeş dilimler (aralarında gölgeli sınır çizgileri), iç ve dış çemberde kenar çizgisi. Her öğe karşılıklı iki kez yer alır (24 yer), böylece görünen üst yarıda hepsi her an görünür. Logolar çarka merkezlerinden takılıdır ve hep dik durur; altlarındaki tek satırlık yazılar (gerçek metin, sayfanın diline göre) ağırlık merkezini aşağıda tutar, çark hızlanıp yavaşladıkça logo ve yazı birlikte hafifçe sallanır. Açılışta çark bir kez çevrilir, sonra yavaşça döner. Fare çarkın üzerine gelince durur ve **fare hangi dilimin üzerindeyse o dilim koyulaşır** (logoda hover efekti yoktur). Fareyle ya da parmakla tutup çevrilebilir, bırakınca savrulur (sürükleme bağlantı açmaz). Çemberin altındaki oklarla (üzerine gelince o yöne döner, tıklayınca iter) çevrilebilir. Telefonda her logo bir kez ve büyük gösterilir. **"Hepsini gör"** düğmesi ya da ortadaki çocuğa tıklama, tüm siteleri kartlarla listeleyen bir pencere açar (pasif öğede "يېقىندا") |
| Uygulamalar | Arka planda yükselen Uygur harfleri; ikonlar kaydırınca yaylanarak belirir, hafifçe süzülür; hover'da 3D eğim + ışık yansıması; tıklamada dalga efekti. İkon altı adlar ve başlık sayfanın diline göre çevrilir |
| Modal | Bulanık arka plan, yaylanarak açılış. Üstte uygulamanın adı ve X düğmesi olan bir **başlık** vardır; içerik ekrana sığmazsa yalnızca gövde kayar (başlık ve alttaki "kapat" düğmesi yerinde kalır). Uygulama kartları (`assets/data/apps.json`) doğrudan çizilir: görsel, açıklama, indirme/mağaza/web bağlantıları ve paylaşım düğmeleri (WhatsApp, Facebook, X, Telegram, bağlantı kopyala). Veri yüklenemezse eski iframe (`popup.php`) akışı çalışır |
| Dil seçici & footer | Yumuşak açılan menü; sosyal ikonlar sırayla belirir ve imlece "mıknatıs" gibi çekilir |

**Diller:** `pageLang` (ug, ul, uc, tr, en, ar) sayfanın dilini belirler. Canlı site yalnızca sloganı, dil seçiciyi ve tarihleri çeviriyor; çark yazıları, uygulama adları, kart metinleri ve arayüz metinleri bu katman tarafından `ui.json` / `apps.json` içindeki dil haritalarından getirilir. Eksik bir dilde Uygurca (`ug`) kullanılır. ul/uc/tr/en/ar metinleri taslaktır; anadili konuşan biri gözden geçirmelidir.

**Erişilebilirlik ve performans:** "Hareketi azalt" ayarı açık olan ziyaretçilerde tüm hareket kapanır ve menü orijinal haliyle durur. Çark ve harf animasyonu yalnızca ekranda görünürken çalışır. Dokunmatik cihazlarda eğim ve mıknatıs efektleri kapalıdır. JS çalışmazsa sayfa bugünkü haliyle görünür.

## İçerik nasıl değiştirilir

- **Çark yazıları / arayüz metinleri / tarih adları:** `assets/data/ui.json` → `wheel.items[].label`, `strings` ve `calendar` (ay ve gün adları, tarih biçimleri).
- **Uygulama kartları:** `assets/data/apps.json` → `name`, `title`, `description`, bağlantılar.
- **Çarka yeni öğe eklemek:** `ui.json` içindeki `wheel.items` dizisinin sonuna `{ "label": { "ug": "…", "tr": "…" }, "href": "https://…", "icon": "yeni.png" }` ekleyin (`icon`: `assets/images/wheel/` içine koyduğunuz kare PNG). Dilim sayısı, açılar, halka ve "Hepsini gör" penceresi öğe sayısından otomatik hesaplanır; kod ya da görsel üretmek gerekmez. `href`'siz öğe "يېقىندا" (yakında) olarak görünür.
- Bu dosyaları değiştirdikten sonra tarayıcı önbelleği için `assets/js/motion.js` başındaki `ASSET_V` değerini artırın.

**Ayarlar** (`assets/js/motion.js`, `buildWheel` içinde):
- `AUTO` — çarkın sürekli dönüş hızı (derece/saniye; negatif = saat yönünün tersi)
- `MAXPHI` — logoların en fazla sallanma açısı (radyan)
- `DAMP` — salınımın ne kadar çabuk durulacağı
- `WIND` — hafif rüzgâr salınımı (0 = kapalı)

## Geliştirme

Node.js gerekmez. Bir klasör sunucusu yeterli (veri `fetch` ile okunduğu için `file://` çalışmaz):

```bash
python3 -m http.server 8080      # kök dizinden → http://localhost:8080/preview/?lang=tr
```

- `assets/css/motion.css` — doğrudan düzenlenen düz CSS (`ew-` önekli sınıflar)
- `assets/js/motion.js` — tüm etkileşimler
- `preview/` — canlı ana sayfanın yerel kopyası, **yalnızca test içindir, sunucuya yüklemeyin.** `?lang=ug|ul|uc|tr|en|ar` ile dil denenir. Önizlemedeki ana sayfa metinleri statik olduğu için çoğu Uygurca kalır (canlı site de bunları çevirmez); çark, uygulama adları ve kartlar çevrilir. Eski modal iframe'i (`popup.php`) yalnızca Vercel'de çalışır (`vercel.json` → `rewrites`); yerelde `apps.json` yüklendiği sürece gerekmez.
- `preview/index.html` içindeki `motion.css?v=N` / `motion.js?v=N` değerlerini dosyalar değişince artırın.
- `tools/wheel/` — **isteğe bağlı**, yalnızca `menu.png` değişirse: `cd tools/wheel && npm install`, sonra kökten `node tools/wheel/build-wheel.mjs`. Çark halkasını (`ring.webp`), 12 yuvarlak logoyu, sabit göbeği, bacakları, başı ve `wheel.json`'u üretir; çıktılar commit'lidir, siteyi çalıştırmak için bu araca gerek yoktur.
