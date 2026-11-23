/*!
 * ewlat.org — Animasyon & Etkileşim Katmanı
 * Bağımlılık yok (vanilla JS). Stiller: assets/css/motion.css (Tailwind v4, "tw:" önekli).
 * Kurulum: </body> öncesine  <script src="assets/js/motion.js" defer></script>
 *
 * Her modül try/catch içinde çalışır; biri hata verirse site ve diğer modüller etkilenmez.
 * "Hareketi azalt" (prefers-reduced-motion) açıksa tüm hareket kapanır, sayfa statik kalır.
 */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var SCRIPT_BASE = (function () {
    var src = (doc.currentScript && doc.currentScript.src) || '';
    return src ? src.replace(/[^\/]*$/, '') : 'assets/js/';   // …/assets/js/
  })();

  function mq(q) { return !!(window.matchMedia && window.matchMedia(q).matches); }
  var MOTION = !mq('(prefers-reduced-motion: reduce)');
  var FINE = mq('(hover: hover) and (pointer: fine)');

  root.classList.add('ew-js');
  if (MOTION) root.classList.add('ew-motion');

  /* ------------------------------------------------------------------ */
  /* Yardımcılar                                                         */
  /* ------------------------------------------------------------------ */
  var LANG = (typeof window.pageLang === 'string' && window.pageLang) || 'ug';
  var I18N = {
    soon:    { ug: 'يېقىندا', ul: 'Yéqinda', uc: 'Йеқинда', tr: 'Yakında', en: 'Coming soon', ar: 'قريباً' },
    loading: { ug: 'يۈكلىنىۋاتىدۇ…', ul: 'Yüklüniwatidu…', uc: 'Йүклиниватиду…', tr: 'Yükleniyor…', en: 'Loading…', ar: 'جارٍ التحميل…' }
  };
  function t(key) { var m = I18N[key]; return m[LANG] || m.ug; }

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  function el(tag, cls, attrs) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function safe(name, fn) {
    try { fn(); } catch (e) { if (window.console) console.warn('[ewlat-motion] ' + name + ':', e); }
  }

  function debounce(fn, ms) {
    var id;
    return function () { clearTimeout(id); id = setTimeout(fn, ms); };
  }

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /** Hedef ekranda ve sekme görünürken çalışan requestAnimationFrame döngüsü. */
  function runWhileVisible(target, frame) {
    var running = false, inView = true, raf = 0, last = 0;
    function tick(now) {
      if (!running) return;
      var dt = last ? Math.min(64, now - last) : 16;
      last = now;
      frame(dt, now);
      raf = requestAnimationFrame(tick);
    }
    function update() {
      var should = inView && !doc.hidden;
      if (should && !running) { running = true; last = 0; raf = requestAnimationFrame(tick); }
      else if (!should && running) { running = false; cancelAnimationFrame(raf); }
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { inView = es[es.length - 1].isIntersecting; update(); }).observe(target);
    }
    doc.addEventListener('visibilitychange', update);
    update();
  }

  /** Canvas'ı CSS boyutuna ve ekran yoğunluğuna eşitler. */
  function fitCanvas(cv) {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = cv.clientWidth, h = cv.clientHeight;
    var W = Math.max(1, Math.round(w * dpr)), H = Math.max(1, Math.round(h * dpr));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    var ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  /** Görünür olunca .ew-in ekler (bir kez). */
  function revealOnScroll(nodes, threshold) {
    if (!nodes.length) return;
    if (!('IntersectionObserver' in window)) { nodes.forEach(function (n) { n.classList.add('ew-in'); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ew-in'); io.unobserve(e.target); }
      });
    }, { threshold: threshold || .15 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ------------------------------------------------------------------ */
  /* 2a. SLOGAN — kelime kelime açılış + altın parıltı                    */
  /* ------------------------------------------------------------------ */
  safe('title', function () {
    var tEl = $('.top > .title');
    if (!tEl || tEl.children.length) return;
    var text = tEl.textContent.trim();
    if (!text) return;
    tEl.setAttribute('dir', 'auto');        // Latin/İngilizce dillerde kelime sırası bozulmasın
    tEl.setAttribute('aria-label', text);
    tEl.textContent = '';
    var words = text.split(/\s+/);
    words.forEach(function (w, i) {
      var outer = el('span', 'ew-word', { 'aria-hidden': 'true' });
      var inner = el('span', 'ew-word-txt');
      outer.style.setProperty('--i', i);
      inner.style.setProperty('--i', i);
      inner.textContent = w;
      outer.appendChild(inner);
      tEl.appendChild(outer);
      if (i < words.length - 1) tEl.appendChild(doc.createTextNode(' '));
    });
    if (MOTION) {
      setTimeout(function () {
        $$('.ew-word-txt', tEl).forEach(function (n) { n.classList.add('ew-shine'); });
      }, 250 + words.length * 150 + 1100);
    }
  });

  /* ------------------------------------------------------------------ */
  /* 2b. HİCRİ AY EVRESİ — tarihin yanında bugünkü ayın şekli             */
  /* ------------------------------------------------------------------ */
  safe('moon', function () {
    if (typeof window.UQCal !== 'function') return;
    var ar = $('.chisla-ar');
    if (!ar) return;
    var d = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    var H = new window.UQCal(d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())).convert();
    var day = parseInt(H && H.Hday, 10);
    if (!day) return;

    var p = clamp((day - .5) / 29.53, 0, 1);          // 0 = yeni ay, .5 = dolunay
    var k = Math.cos(2 * Math.PI * p);
    var r = 11, rx = (Math.abs(k) * r).toFixed(2);
    var waxing = p < .5;
    var outer = waxing ? 1 : 0;
    var term = waxing ? (k > 0 ? 0 : 1) : (k > 0 ? 1 : 0);
    var lit = 'M14 3 A11 11 0 0 ' + outer + ' 14 25 A' + rx + ' 11 0 0 ' + term + ' 14 3 Z';

    var wrapM = el('span', 'tw:inline-flex tw:shrink-0 tw:items-center tw:motion-safe:animate-ew-pulse-soft', { 'aria-hidden': 'true' });
    wrapM.innerHTML =
      '<svg width="28" height="28" viewBox="0 0 28 28">' +
      '<circle cx="14" cy="14" r="11" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.35)" stroke-width="1"/>' +
      '<path d="' + lit + '" fill="#ffe9a8"/></svg>';
    ar.parentNode.insertBefore(wrapM, ar);
  });

  /* ------------------------------------------------------------------ */
  /* 3. YARIM DAİRE MENÜ — dönme dolap                                   */
  /* ------------------------------------------------------------------ */
  safe('menu', function () {
    var menu = $('.menu');
    var img = menu && $('img', menu);
    if (!img) return;
    var origBtns = $$('.mbtn', menu);
    if (!origBtns.length) return;
    var top = $('.top') || menu.parentNode;

    // tools/build-wheel.mjs çıktısı (assets/images/wheel/wheel.json) — menu.png piksel koordinatları
    var WHEEL = {
      size: [1409, 701], center: [704.5, 704.5], rIn: 397, rOut: 704,
      items: [
        { icon: [89.5, 626.5, 55.5],   label: [160, 613, 86, 57] },
        { icon: [128.5, 469.4, 55.4],  label: [204, 491, 66, 53] },
        { icon: [210.6, 324.5, 55.4],  label: [250, 365, 101, 58] },
        { icon: [327.6, 210.5, 55.4],  label: [352, 270, 81, 57] },
        { icon: [466.5, 130.4, 55.2],  label: [480, 210, 75, 50] },
        { icon: [623.5, 87.5, 55.4],   label: [604, 175, 68, 58] },
        { icon: [787.6, 86.5, 55.4],   label: [727, 177, 84, 56] },
        { icon: [945.5, 126.5, 55.4],  label: [863, 210, 69, 52] },
        { icon: [1083.5, 209.5, 55.3], label: [959, 268, 98, 58] },
        { icon: [1200.7, 325.6, 55.2], label: [1067, 373, 78, 51] },
        { icon: [1281.5, 465.5, 55.3], label: [1136, 482, 66, 58] },
        { icon: [1320.5, 623.6, 53.6], label: [1140, 616, 117, 54] }
      ]
    };
    var BASE = SCRIPT_BASE + '../images/wheel/';

    origBtns.forEach(function (b) {
      b.insertBefore(el('span', 'ew-slice', { 'aria-hidden': 'true' }), b.firstChild);
    });
    $$('a', menu).forEach(function (a) { a.setAttribute('draggable', 'false'); });
    img.setAttribute('draggable', 'false');

    // ---- Tooltip baloncuğu (.top içinde; çark dönse de düz kalır) ----
    var tip = el('div',
      'tw:absolute tw:z-30 tw:pointer-events-none tw:whitespace-nowrap tw:rounded-full tw:bg-white tw:px-4 tw:py-1.5 ' +
      'tw:text-[15px] tw:font-bold tw:text-ew-deep tw:shadow-[0_10px_30px_rgba(0,0,0,.3)] ' +
      'tw:opacity-0 tw:transition-opacity tw:duration-200 tw:ease-out tw:flex tw:items-center tw:gap-1.5',
      { role: 'tooltip', dir: 'auto' });
    var tipText = el('span');
    var tipIcon = el('span', 'tw:inline-flex tw:opacity-60');
    tipIcon.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>';
    var tipArrow = el('span', 'tw:absolute tw:left-1/2 tw:top-full tw:-translate-x-1/2 tw:border-[7px] tw:border-transparent tw:border-t-white');
    tip.appendChild(tipText); tip.appendChild(tipIcon); tip.appendChild(tipArrow);
    tip.style.transform = 'translate(-50%, -100%)';
    top.appendChild(tip);
    var tipFor = null;
    function placeTip() {
      if (!tipFor) return;
      var r = tipFor.getBoundingClientRect(), tr = top.getBoundingClientRect();
      tip.style.left = (r.left + r.width / 2 - tr.left) + 'px';
      tip.style.top = (r.top - tr.top - 10) + 'px';
    }
    function showTip(b) {
      var a = $('a', b);
      var txt = a && a.textContent.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
      tipText.textContent = txt || t('soon');
      tipIcon.style.display = txt ? '' : 'none';
      tipFor = b;
      placeTip();
      tip.classList.remove('tw:opacity-0');
    }
    function hideTip() { tipFor = null; tip.classList.add('tw:opacity-0'); }
    function bindTip(list) {
      list.forEach(function (b) {
        b.addEventListener('mouseenter', function () { showTip(b); });
        b.addEventListener('mouseleave', hideTip);
        b.addEventListener('focusin', function () { showTip(b); });
        b.addEventListener('focusout', hideTip);
      });
    }

    // ---- Okuyan çocuğun arkasında dönen ışık huzmeleri (sabit merkezde) ----
    var haloWrap = el('div',
      'tw:absolute tw:z-[1] tw:pointer-events-none tw:left-1/2 tw:top-[77%] tw:w-[30%] tw:aspect-square ' +
      'tw:-translate-x-1/2 tw:-translate-y-1/2 tw:opacity-0 tw:transition-opacity tw:duration-[1500ms]',
      { 'aria-hidden': 'true' });
    haloWrap.appendChild(el('div', 'ew-halo tw:size-full tw:rounded-full tw:motion-safe:animate-ew-spin-slow'));
    menu.insertBefore(haloWrap, img);
    function showHalo() { haloWrap.classList.remove('tw:opacity-0'); haloWrap.classList.add('tw:opacity-80'); }

    // ---- Sabit menü (hareket kapalıysa ya da çark parçaları yüklenemezse) ----
    var wheelOn = false;
    function staticMode() {
      if (wheelOn) return;
      bindTip(origBtns);
      var lay = function () {
        var W = img.clientWidth, H = img.clientHeight, src = img.currentSrc || img.src;
        origBtns.forEach(function (b) {
          var s = $('.ew-slice', b);
          s.style.backgroundImage = 'url("' + src + '")';
          s.style.backgroundSize = W + 'px ' + H + 'px';
          s.style.backgroundPosition = (-b.offsetLeft) + 'px ' + (-b.offsetTop) + 'px';
        });
      };
      if (img.complete && img.naturalWidth) lay(); else img.addEventListener('load', lay, { once: true });
      window.addEventListener('resize', debounce(lay, 150));
      showHalo();
    }
    if (!MOTION) { staticMode(); return; }

    // ---- Çark parçalarını önceden yükle ----
    var urls = [];
    WHEEL.items.forEach(function (_, i) { urls.push(BASE + 'icon-' + i + '.png', BASE + 'label-' + i + '.png'); });
    var pending = urls.length, failed = false;
    urls.forEach(function (u) {
      var im = new Image();
      im.onload = function () { if (--pending === 0 && !failed) whenReady(img, buildWheel); };
      im.onerror = function () { if (!failed) { failed = true; staticMode(); } };
      im.src = u;
    });
    function whenReady(image, fn) {
      if (image.complete && image.naturalWidth) fn(); else image.addEventListener('load', fn, { once: true });
    }

    /* ---- Dönme dolap ----
       clip    : menü boyutunda (+ yan pay); çarkın alt yarısını gizler
       wheel   : dönen iskelet — yumuşak renk halkası + SVG (göbek halkası, jantlar, ampuller)
       cabins  : 24 logo (12 bağlantı × 2, karşılıklı); her biri pime tam merkezinden takılı,
                 altındaki yazının ağırlığıyla dik durur ve çarkın ivmesine göre hafifçe sallanır.
       Ortadaki ay + kitap okuyan çocuk (orijinal görselin merkezi) sabit göbektir. */
    function buildWheel() {
      // RP: logo merkezlerinin (pimlerin) yarıçapı. Logo pime tam ortasından takılıdır.
      var SLOTS = 24, RP = 478, GW = 100, GH = 134, ICON = 84, LSCALE = .8;
      var DEG = Math.PI / 180;

      var clip = el('div', 'tw:absolute tw:top-0 tw:z-[2] tw:overflow-hidden tw:opacity-0 tw:transition-opacity tw:duration-500');
      var wheel = el('div', 'ew-wheel tw:absolute tw:top-0', { 'aria-hidden': 'true' });
      wheel.appendChild(el('div', 'ew-wheel-bg tw:absolute tw:inset-0 tw:rounded-full'));
      wheel.insertAdjacentHTML('beforeend', skeletonSVG());
      clip.appendChild(wheel);

      // Kabinler
      var cabins = [];
      for (var j = 0; j < SLOTS; j++) {
        var i = 11 - (j % 12);                 // dilim j ↔ menu_item_(11-j) (sağdan sola)
        var dup = j >= 12;
        var it = WHEEL.items[i];
        var b = dup ? origBtns[i].cloneNode(true) : origBtns[i];
        if (dup) $$('a', b).forEach(function (a) { a.tabIndex = -1; });
        var cab = el('div', 'ew-cabin', dup ? { 'aria-hidden': 'true' } : null);
        var gondola = el('div', 'ew-gondola');
        var lab = el('img', 'tw:absolute tw:pointer-events-none tw:select-none',
          { src: BASE + 'label-' + i + '.png', alt: '', draggable: 'false', 'aria-hidden': 'true' });
        var slice = $('.ew-slice', b);
        slice.style.backgroundImage = 'url("' + BASE + 'icon-' + i + '.png")';
        gondola.appendChild(b);
        gondola.appendChild(lab);
        cab.appendChild(gondola);
        clip.appendChild(cab);
        cabins.push({
          el: cab, gondola: gondola, btn: b, slice: slice, label: lab, it: it,
          th0: (7.5 + 15 * j) * DEG,            // matematiksel açı (saat yönü tersi, sağdan)
          phi: 0, dphi: 0, wind: Math.random() * 6.28
        });
      }

      menu.appendChild(clip);
      menu.classList.add('ew-wheel-on');
      img.classList.add('ew-center');            // orijinal görsel yalnızca sabit merkezi göstersin
      wheelOn = true;
      bindTip(cabins.map(function (c) { return c.btn; }));

      var geo = { W: 0, H: 0, s: 1, M: 0, cx: 0, cy: 0, rin: 0, rout: 0 };
      function layout() {
        var W = img.clientWidth, H = img.clientHeight;
        if (!W || !H) return;
        var s = W / 1120, M = Math.round(110 * s);
        geo = { W: W, H: H, s: s, M: M, cx: M + W / 2, cy: W / 2, rin: 316 * s, rout: 560 * s };
        clip.style.left = -M + 'px';
        clip.style.width = (W + 2 * M) + 'px';
        clip.style.height = H + 'px';
        wheel.style.left = M + 'px';
        wheel.style.width = wheel.style.height = W + 'px';
        menu.style.setProperty('--ew-rin', (WHEEL.rIn - 3) * (W / WHEEL.size[0]) + 'px');
        menu.style.setProperty('--ew-cdy', (WHEEL.center[1] - WHEEL.size[1]) * (W / WHEEL.size[0]) + 'px');
        cabins.forEach(function (c) {
          var gw = GW * s, gh = GH * s, d = ICON * s;
          c.el.style.width = gw + 'px';
          c.el.style.height = gh + 'px';
          c.el.style.transformOrigin = '50% ' + d / 2 + 'px';   // dönme noktası = logonun merkezi
          c.gondola.style.top = '0px';
          c.gondola.style.height = gh + 'px';
          // yuvarlak logo (bağlantı) — merkezi pime takılı
          var R = c.it.icon[2], f = d / (2 * R);
          var x0 = Math.floor(c.it.icon[0] - R - 1), y0 = Math.floor(c.it.icon[1] - R - 1), sz = Math.ceil(2 * R + 3);
          c.btn.style.left = (gw - d) / 2 + 'px';
          c.btn.style.top = '0px';
          c.btn.style.width = c.btn.style.height = d + 'px';
          c.slice.style.backgroundSize = sz * f + 'px ' + sz * f + 'px';
          c.slice.style.backgroundPosition = (x0 - (c.it.icon[0] - R)) * f + 'px ' + (y0 - (c.it.icon[1] - R)) * f + 'px';
          // yazı — ikonun hemen altında, onunla birlikte asılı
          var lw = c.it.label[2] * LSCALE * s, lh = c.it.label[3] * LSCALE * s;
          var areaTop = (ICON + 4) * s;
          c.label.style.width = lw + 'px';
          c.label.style.height = lh + 'px';
          c.label.style.left = (gw - lw) / 2 + 'px';
          c.label.style.top = areaTop + 'px';
        });
      }
      layout();
      window.addEventListener('resize', debounce(layout, 150));

      // ---- Dönüş: açılışta çevirme → yavaş, sürekli dönüş ----
      var AUTO = -3.2;              // derece/sn (negatif = saat yönünün tersi: kabinler sağdan sola akar)
      var angle = 0, omega = -150;
      var hover = false, drag = null;

      function center() {
        var r = menu.getBoundingClientRect();
        return { x: r.left + geo.W / 2, y: r.top + geo.cy };
      }
      function polar(e) {
        var c = center(), dx = e.clientX - c.x, dy = e.clientY - c.y;
        return { r: Math.sqrt(dx * dx + dy * dy), a: Math.atan2(dy, dx) * 180 / Math.PI, x: e.clientX, y: e.clientY, cy: c.y };
      }
      function norm(d) { while (d > 180) d -= 360; while (d < -180) d += 360; return d; }
      function inRing(p) { return p.r >= geo.rin && p.r <= geo.rout && p.y <= p.cy; }

      // Fare çarkın üzerindeyken yavaşlayıp durur → bağlantılara rahat tıklanır
      menu.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var on = inRing(polar(e));
        hover = on;
        menu.style.cursor = drag && drag.moved ? 'grabbing' : (on ? 'grab' : '');
      });
      menu.addEventListener('pointerleave', function () { hover = false; menu.style.cursor = ''; });

      // Sürükleyerek çevirme (fare + dokunmatik), bırakınca savrulma
      menu.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        var p = polar(e);
        if (!inRing(p)) return;
        drag = { sx: p.x, sy: p.y, lastA: p.a, lastT: e.timeStamp, v: 0, moved: false };
      });
      window.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var p = polar(e);
        if (!drag.moved) {
          if (Math.abs(p.x - drag.sx) + Math.abs(p.y - drag.sy) < 7) return;
          drag.moved = true;
          menu.classList.add('ew-grabbing');
          hideTip();
        }
        var d = norm(p.a - drag.lastA);
        angle += d;
        var dt = (e.timeStamp - drag.lastT) / 1000;
        if (dt > 0) drag.v = drag.v * .5 + (d / dt) * .5;
        drag.lastA = p.a; drag.lastT = e.timeStamp;
      });
      function endDrag(cancelled) {
        if (!drag) return;
        if (drag.moved) {
          omega = cancelled ? 0 : clamp(drag.v, -180, 180);
          var block = function (ev) { ev.preventDefault(); ev.stopPropagation(); };   // sürükleme bağlantı açmasın
          menu.addEventListener('click', block, true);
          setTimeout(function () { menu.removeEventListener('click', block, true); }, 80);
        }
        menu.classList.remove('ew-grabbing');
        drag = null;
      }
      window.addEventListener('pointerup', function () { endDrag(false); });
      window.addEventListener('pointercancel', function () { endDrag(true); });
      menu.addEventListener('dragstart', function (e) { e.preventDefault(); });

      // ---- Kabin fiziği: hareketli pime asılı sarkaç ----
      // φ'' = (g_eff.x·cosφ − g_eff.y·sinφ)/L − c·φ' ,  g_eff = g − a_pim
      var G = 3000, INERTIA = .35, DAMP = 2.4, WIND = 55, MAXPHI = .7;   // MAXPHI ≈ 40°: kabin tamponu
      var prevAngle = 0, wS = 0, aS = 0, clock = 0;

      clip.classList.remove('tw:opacity-0');
      showHalo();
      runWhileVisible(top, function (dtMs) {
        var dt = Math.min(.05, dtMs / 1000);
        clock += dt;
        if (!drag || !drag.moved) {
          var target = hover ? 0 : AUTO;
          omega += (target - omega) * (1 - Math.exp(-dt / .9));
          angle += omega * dt;
        }
        // gerçek açısal hız ve ivme (sürükleme dahil), yumuşatılmış
        var wNow = norm(angle - prevAngle) / dt * DEG;
        prevAngle = angle;
        var wPrev = wS;
        wS += (wNow - wS) * .35;
        aS += (clamp((wS - wPrev) / dt, -6, 6) - aS) * .25;
        angle %= 360;
        wheel.style.setProperty('--ew-a', angle.toFixed(3) + 'deg');

        var s = geo.s, Rp = RP * s, L = 45 * s, g = G * s, A = angle * DEG;   // L: pim → ağırlık merkezi (yazı tarafında)
        var gw = GW * s, half = ICON * s / 2;
        for (var k = 0; k < cabins.length; k++) {
          var c = cabins[k];
          var beta = -c.th0 + A;                 // ekran açısı (y aşağı)
          var cb = Math.cos(beta), sb = Math.sin(beta);
          var px = geo.cx + Rp * cb, py = geo.cy + Rp * sb;
          // pim ivmesi: merkezcil + teğetsel
          var ax = Rp * (-wS * wS * cb - aS * sb) * INERTIA;
          var ay = Rp * (-wS * wS * sb + aS * cb) * INERTIA;
          var gx = -ax + WIND * s * Math.sin(clock * .8 + c.wind), gy = g - ay;
          var acc = (gx * Math.cos(c.phi) - gy * Math.sin(c.phi)) / L - DAMP * c.dphi;
          c.dphi += acc * dt;
          c.phi += c.dphi * dt;
          if (c.phi > MAXPHI) { c.phi = MAXPHI; if (c.dphi > 0) c.dphi *= -.3; }       // tampona yumuşak çarpma
          else if (c.phi < -MAXPHI) { c.phi = -MAXPHI; if (c.dphi < 0) c.dphi *= -.3; }
          // Ufkun altında kalan kabinleri çizme
          var hidden = py - half > geo.H;
          if (hidden !== c.hidden) { c.hidden = hidden; c.el.style.visibility = hidden ? 'hidden' : ''; }
          if (hidden) continue;
          c.el.style.transform = 'translate(' + (px - gw / 2).toFixed(2) + 'px,' + (py - half).toFixed(2) + 'px) rotate(' + (-c.phi).toFixed(4) + 'rad)';
        }
        placeTip();
      });

      function skeletonSVG() {
        var R_HUB = 316, R_IN = 524, R_OUT = 548, R_BULB = 536, k;
        var o = '<svg class="ew-skeleton" width="100%" height="100%" viewBox="-560 -560 1120 1120">';
        var P = function (r, deg) { var a = deg * DEG; return (r * Math.cos(a)).toFixed(1) + ' ' + (-r * Math.sin(a)).toFixed(1); };
        // jantlar ve göbek halkası
        o += '<g fill="none" stroke="rgba(255,255,255,.92)">' +
             '<circle r="' + R_OUT + '" stroke-width="3.5"/><circle r="' + R_IN + '" stroke-width="3.5"/>' +
             '<circle r="' + R_HUB + '" stroke-width="5"/><circle r="' + (R_HUB - 9) + '" stroke-width="1.5" stroke="rgba(255,255,255,.4)"/></g>';
        // ampuller (sırayla yanıp söner)
        o += '<g class="ew-bulbs">';
        for (k = 0; k < 72; k++) {
          var a = k * 5 * DEG;
          o += '<circle cx="' + (R_BULB * Math.cos(a)).toFixed(1) + '" cy="' + (-R_BULB * Math.sin(a)).toFixed(1) + '" r="3.4" style="animation-delay:' + (-(k % 12) * .2).toFixed(1) + 's"/>';
        }
        o += '</g>';
        o += '</svg>';
        return o;
      }
    }
  });

  /* ------------------------------------------------------------------ */
  /* 4. Hero → Uygulamalar arası akan dalgalar                           */
  /* ------------------------------------------------------------------ */
  safe('waves', function () {
    var top = $('.top');
    if (!top || !top.parentNode) return;
    function path(a, base, ph) {
      var d = 'M0 0 L2880 0';
      for (var x = 2880; x >= 0; x -= 40) d += ' L' + x + ' ' + (base + a * Math.sin(2 * Math.PI * x / 720 + ph)).toFixed(1);
      return d + ' Z';
    }
    var holder = el('div', 'tw:relative tw:h-0 tw:pointer-events-none', { 'aria-hidden': 'true' });
    var box = el('div', 'tw:absolute tw:inset-x-0 tw:top-0 tw:h-[46px] tw:overflow-hidden');
    [
      { a: 7, b: 26, ph: 0,   fill: 'rgba(12,72,92,.30)',   cls: 'tw:motion-safe:animate-ew-wave-a' },
      { a: 6, b: 18, ph: 1.7, fill: 'rgba(12,72,92,.22)',   cls: 'tw:motion-safe:animate-ew-wave-b' },
      { a: 5, b: 11, ph: 3.1, fill: 'rgba(255,255,255,.10)', cls: 'tw:motion-safe:animate-ew-wave-c' }
    ].forEach(function (w) {
      var wrap = el('div', 'tw:absolute tw:left-0 tw:top-0 tw:h-full tw:w-[200%] ' + w.cls);
      wrap.innerHTML = '<svg width="100%" height="100%" viewBox="0 0 2880 46" preserveAspectRatio="none">' +
        '<path d="' + path(w.a, w.b, w.ph) + '" fill="' + w.fill + '"/></svg>';
      box.appendChild(wrap);
    });
    holder.appendChild(box);
    top.parentNode.insertBefore(holder, top.nextSibling);
  });

  /* ------------------------------------------------------------------ */
  /* 5. UYGULAMALAR — beliriş, süzülme, 3D eğim, parlama, dalga, harfler  */
  /* ------------------------------------------------------------------ */
  safe('apps', function () {
    var apps = $('.apps');
    if (!apps) return;
    var items = $$('.item', apps);

    items.forEach(function (it, i) {
      it.style.setProperty('--i', i);
      var icon = $('.icon', it), img = icon && $('img', icon);
      if (!img) return;

      // Görsel + parlama katmanı aynı kapta süzülsün diye sarmalanır
      var floater = el('span', 'ew-floater tw:relative tw:block');
      icon.insertBefore(floater, img);
      floater.appendChild(img);

      var mask = el('span', 'ew-iconmask tw:absolute tw:inset-0 tw:pointer-events-none tw:overflow-hidden', { 'aria-hidden': 'true' });
      mask.style.setProperty('--ew-mask', 'url("' + (img.currentSrc || img.src) + '")');
      var glare = el('span', 'ew-glare tw:absolute tw:inset-0 tw:opacity-0 tw:transition-opacity tw:duration-300 tw:group-hover:opacity-100');
      mask.appendChild(glare);
      floater.appendChild(mask);
      icon.classList.add('tw:group');

      if (FINE) {
        if (MOTION) icon.classList.add('ew-tilt');
        icon.addEventListener('mousemove', function (e) {
          var r = icon.getBoundingClientRect();
          var px = clamp((e.clientX - r.left) / r.width, 0, 1), py = clamp((e.clientY - r.top) / r.height, 0, 1);
          icon.style.setProperty('--ry', ((px - .5) * 24).toFixed(2) + 'deg');
          icon.style.setProperty('--rx', ((.5 - py) * 24).toFixed(2) + 'deg');
          icon.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
          icon.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
        });
        icon.addEventListener('mouseleave', function () {
          icon.style.setProperty('--rx', '0deg');
          icon.style.setProperty('--ry', '0deg');
        });
      }

      if (MOTION) {
        it.addEventListener('pointerdown', function (e) {
          var r = mask.getBoundingClientRect();
          var dot = el('span', 'tw:absolute tw:size-5 tw:-ml-2.5 tw:-mt-2.5 tw:rounded-full tw:bg-white/70 tw:animate-ew-ripple');
          dot.style.left = (e.clientX - r.left) + 'px';
          dot.style.top = (e.clientY - r.top) + 'px';
          mask.appendChild(dot);
          setTimeout(function () { dot.remove(); }, 800);
        });
      }
    });

    if (!MOTION) return;
    revealOnScroll(items, .15);

    // Arka planda yükselen Uygur harfleri — "harfler nesilden nesile"
    var LETTERS = 'ئا ئە ب پ ت ج چ خ د ر ز ژ س ش غ ف ق ك گ ڭ ل م ن ھ ئو ئۇ ئۆ ئۈ ۋ ئې ئى ي'.split(' ');
    var cv = el('canvas', 'tw:absolute tw:inset-0 tw:size-full tw:pointer-events-none', { 'aria-hidden': 'true' });
    apps.insertBefore(cv, apps.firstChild);
    var size = fitCanvas(cv), parts = [];

    function make(anyY) {
      return {
        ch: pick(LETTERS), x: rand(0, size.w), y: anyY ? rand(0, size.h) : size.h + rand(10, 60),
        s: rand(16, 44), v: rand(9, 22), a: rand(.05, .16), ph: rand(0, 6.28), rot: rand(-.3, .3), vr: rand(-.08, .08)
      };
    }
    function populate() {
      size = fitCanvas(cv);
      var n = clamp(Math.round(size.w * size.h / 11000), 10, 36);
      while (parts.length < n) parts.push(make(true));
      parts.length = n;
    }
    populate();
    window.addEventListener('resize', debounce(populate, 200));

    runWhileVisible(apps, function (dt, now) {
      var ctx = size.ctx, w = size.w, h = size.h;
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y -= p.v * dt / 1000;
        p.rot += p.vr * dt / 1000;
        if (p.y < -p.s) { parts[i] = p = make(false); }
        var x = p.x + Math.sin(now / 1600 + p.ph) * 10;
        var edge = clamp(Math.min(p.y, h - p.y) / 50, 0, 1);
        ctx.globalAlpha = p.a * edge;
        ctx.save();
        ctx.translate(x, p.y);
        ctx.rotate(p.rot);
        ctx.font = p.s.toFixed(0) + "px UKIJ, uyghur, 'Noto Naskh Arabic', sans-serif";
        ctx.fillText(p.ch, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    });
  });

  /* ------------------------------------------------------------------ */
  /* 6. MODAL — yükleniyor animasyonu                                    */
  /* ------------------------------------------------------------------ */
  safe('modal', function () {
    var modal = $('#appMpdal'), frame = $('#myframe');
    var body = modal && $('.modal-body', modal);
    if (!frame || !body) return;

    var loader = el('div',
      'tw:absolute tw:inset-0 tw:z-10 tw:flex tw:flex-col tw:items-center tw:justify-center tw:gap-4 ' +
      'tw:bg-white tw:text-ew-deep tw:transition-opacity tw:duration-300 tw:opacity-0 tw:pointer-events-none',
      { 'aria-live': 'polite' });
    var spinner = el('div', 'tw:size-12 tw:rounded-full tw:border-4 tw:border-ew-teal/25 tw:border-t-ew-teal tw:motion-safe:animate-ew-spin');
    var txt = el('div', 'tw:text-base');
    txt.textContent = t('loading');
    loader.appendChild(spinner);
    loader.appendChild(txt);
    body.appendChild(loader);

    var timer;
    function show() {
      loader.classList.remove('tw:opacity-0', 'tw:pointer-events-none');
      clearTimeout(timer);
      timer = setTimeout(hide, 10000);
    }
    function hide() {
      clearTimeout(timer);
      loader.classList.add('tw:opacity-0', 'tw:pointer-events-none');
    }
    frame.addEventListener('load', function () { if (frame.getAttribute('src')) hide(); });
    modal.addEventListener('show.bs.modal', show);
    modal.addEventListener('hidden.bs.modal', hide);
  });

  /* ------------------------------------------------------------------ */
  /* 7. FOOTER — sosyal ikonlar: sırayla beliriş + manyetik hover        */
  /* ------------------------------------------------------------------ */
  safe('social', function () {
    var icons = $$('.footer-social .social-icon');
    icons.forEach(function (a, i) {
      a.style.setProperty('--i', i);
      a.addEventListener('animationend', function () { a.classList.add('ew-done'); });
      if (!(MOTION && FINE)) return;
      var cx = 0, cy = 0;
      a.addEventListener('mouseenter', function () {
        a.style.transform = '';
        var r = a.getBoundingClientRect();
        cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      });
      a.addEventListener('mousemove', function (e) {
        a.style.transform = 'translate(' + ((e.clientX - cx) * .4).toFixed(1) + 'px,' + ((e.clientY - cy) * .4).toFixed(1) + 'px) scale(1.18)';
      });
      a.addEventListener('mouseleave', function () { a.style.transform = ''; });
    });
    if (MOTION) revealOnScroll(icons, .3);
  });
})();
