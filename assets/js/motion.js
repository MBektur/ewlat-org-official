/*!
 * ewlat.org — Animasyon & Etkileşim Katmanı
 * Bağımlılık yok (vanilla JS). Stiller: assets/css/motion.css (düz CSS, derleme yok).
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
  var COARSE = mq('(pointer: coarse)');

  root.classList.add('ew-js');
  if (MOTION) root.classList.add('ew-motion');

  /* ------------------------------------------------------------------ */
  /* Yardımcılar                                                         */
  /* ------------------------------------------------------------------ */
  var LANG = (typeof window.pageLang === 'string' && window.pageLang) || 'ug';
  if (LANG !== 'ug') root.classList.add('ew-i18n-wait');
  /* Veri: arayüz metinleri + çark öğeleri → assets/data/ui.json (elle düzenlenir);
     çark konumları → assets/images/wheel/wheel.json (araçla üretilir). Yüklenemezse çark ve kartlar
     devreye girmez, site olduğu gibi kalır. */
  var ASSET_V = '?v=11';        // data/ ve images/wheel/ dosyaları değiştiğinde artırın (önbellek)
  var UI = null, WHEEL = null, APPS_DATA = null;
  function getJSON(url) {
    return fetch(url + ASSET_V).then(function (r) {
      if (!r.ok) throw new Error(r.status + ' ' + url);
      return r.json();
    });
  }
  var dataReady = (function () {
    try {
      return Promise.all([getJSON(SCRIPT_BASE + '../data/ui.json'), getJSON(SCRIPT_BASE + '../images/wheel/wheel.json')])
        .then(function (r) { UI = r[0]; WHEEL = r[1]; return true; })
        .catch(function (e) { if (window.console) console.warn('[ewlat-motion] veri yüklenemedi:', e); return false; });
    } catch (e) { return Promise.resolve(false); }
  })();
  var appsReady = (function () {
    try {
      return getJSON(SCRIPT_BASE + '../data/apps.json')
        .then(function (d) { APPS_DATA = d && d.apps ? d : null; return APPS_DATA; })
        .catch(function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  })();
  if (LANG !== 'ug') {
    var clearI18nWait = function () { root.classList.remove('ew-i18n-wait'); };
    Promise.all([dataReady, appsReady]).then(function () {
      requestAnimationFrame(clearI18nWait);
    });
    setTimeout(clearI18nWait, 1000);
  }
  /** Veri yüklenince fn çalışır (modül hatası diğerlerini etkilemesin diye safe içinde). */
  function whenData(fn, name) { dataReady.then(function (ok) { if (ok) safe(name || 'data', fn); }); }
  function t(key) {
    var m = UI && UI.strings && UI.strings[key];
    return m ? (m[LANG] || m.ug || '') : '';
  }
  /** Dile göre değer: {ug, ul, uc, tr, en, ar} haritası (apps.json) ya da düz değer; eksik dilde ug. */
  function loc(v) { return v && typeof v === 'object' && !Array.isArray(v) ? (v[LANG] || v.ug) : v; }
  var RTL_LANG = LANG === 'ug' || LANG === 'ar';
  var LABEL_LANG = { ug: 'ug', ul: 'ug-Latn', uc: 'ug-Cyrl', tr: 'tr', en: 'en', ar: 'ar' };   // lang özniteliği

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  function el(tag, cls, attrs) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function svgEl(tag, attrs) {
    var n = doc.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  /** Halka dokusu: ring.webp tek bir dilimin gerilmesiyle üretilmiş 24 özdeş dilimdir. Başka dilim sayısında
      aynı dilim kutupsal olarak çarpıtılıp (açı → dilim genişliği) tuvale çizilir; araç gerekmez.
      24 dilimde null döner (ring.webp doğrudan kullanılır). inner: iç/dış yarıçap oranı, outPx: tuval boyutu. */
  function makeRing(src, slots, inner, outPx) {
    var SRC_SLOTS = 24;
    if (slots === SRC_SLOTS) return null;
    try {
      var sw = src.naturalWidth, S = Math.min(outPx, sw);
      var c0 = doc.createElement('canvas'); c0.width = c0.height = sw;
      var x0 = c0.getContext('2d'); x0.drawImage(src, 0, 0);
      var sd = x0.getImageData(0, 0, sw, sw).data;
      var cv = doc.createElement('canvas'); cv.width = cv.height = S;
      var ctx = cv.getContext('2d'), out = ctx.createImageData(S, S), od = out.data;
      var ro = S / 2, ri = ro * inner, k = sw / S, SLOT = 360 / slots, SRC = 360 / SRC_SLOTS, W0 = 3 * SRC;
      for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) {
        var dx = x + .5 - ro, dy = ro - (y + .5), rho = Math.sqrt(dx * dx + dy * dy);
        if (rho > ro + 1 || rho < ri - 2) continue;
        var th = Math.atan2(dy, dx) * 180 / Math.PI; if (th < 0) th += 360;
        var j = Math.floor(th / SLOT); if (j >= slots) j = slots - 1;
        var a = (W0 + (th - j * SLOT) / SLOT * SRC) * Math.PI / 180;     // kaynak dilimdeki açı
        var sx = sw / 2 + rho * k * Math.cos(a) - .5, sy = sw / 2 - rho * k * Math.sin(a) - .5;
        var ix = Math.floor(sx), iy = Math.floor(sy);
        if (ix < 0 || iy < 0 || ix >= sw - 1 || iy >= sw - 1) continue;
        var fx = sx - ix, fy = sy - iy, p0 = (iy * sw + ix) * 4, p1 = p0 + 4, p2 = p0 + sw * 4, p3 = p2 + 4;
        var w0 = (1 - fx) * (1 - fy), w1 = fx * (1 - fy), w2 = (1 - fx) * fy, w3 = fx * fy;
        var a0 = sd[p0 + 3] * w0, a1 = sd[p1 + 3] * w1, a2 = sd[p2 + 3] * w2, a3 = sd[p3 + 3] * w3, A = a0 + a1 + a2 + a3;
        if (A < .5) continue;
        var o = (y * S + x) * 4;                                        // alfa ağırlıklı (kenarda kararma olmasın)
        od[o] = (sd[p0] * a0 + sd[p1] * a1 + sd[p2] * a2 + sd[p3] * a3) / A;
        od[o + 1] = (sd[p0 + 1] * a0 + sd[p1 + 1] * a1 + sd[p2 + 1] * a2 + sd[p3 + 1] * a3) / A;
        od[o + 2] = (sd[p0 + 2] * a0 + sd[p1 + 2] * a1 + sd[p2 + 2] * a2 + sd[p3 + 2] * a3) / A;
        od[o + 3] = A;
      }
      ctx.putImageData(out, 0, 0);
      cv.className = 'ew-ring-img';
      return cv;
    } catch (e) { return null; }
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

  /* Çark tıkırtısı: boşta dönerken ve hızlı çevirmede her dilim geçişinde çevirmeli telefon tarzı bir "tık" (Web Audio, ses dosyası yok).
     AudioContext, sayfadaki ilk kullanıcı etkileşiminde oluşturulur/açılır (tarayıcılar ses için kullanıcı hareketi ister). */
  var ratchet = (function () {
    var ctx = null, noise = null;
    var unlockEvents = ['pointerdown', 'touchstart', 'click', 'keydown', 'wheel', 'scroll', 'pointermove'];
    function detach() {
      unlockEvents.forEach(function (ev) {
        window.removeEventListener(ev, unlock, true);
      });
    }
    function unlock() {
      try {
        if (!ctx) {
          var AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          ctx = new AC();
          // Kısa, hızla sönen gürültü patlaması: tek seferlik buffer, her tık için yeniden kullanılır
          var n = Math.floor(ctx.sampleRate * .022), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
          for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 6);
          noise = buf;
        }
        if (ctx.state === 'running') {
          detach();
        } else if (ctx.state === 'suspended') {
          ctx.resume().then(function () {
            if (ctx && ctx.state === 'running') detach();
          }).catch(function () { });
        }
      } catch (e) { /* ses yoksa sessiz devam */ }
    }
    // Çevirmeli telefonun numara çevirme diski gibi: mekanik vuruş + metalik çınlama + kontak tıkı
    function click(vol) {
      if (!ctx || ctx.state !== 'running') return;
      try {
        var t = ctx.currentTime;
        var out = ctx.createGain(); out.gain.value = vol; out.connect(ctx.destination);
        // 1) mekanik vuruş: hızla düşen kısa sinüs
        var o = ctx.createOscillator(), e = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(260, t + .02);
        e.gain.setValueAtTime(.5, t); e.gain.exponentialRampToValueAtTime(.001, t + .022);
        o.connect(e); e.connect(out); o.start(t); o.stop(t + .025);
        // 2) metalik çınlama: daha yüksek ve daha kısa iki kısmi
        [1800, 3600].forEach(function (f, i) {
          var o2 = ctx.createOscillator(), e2 = ctx.createGain();
          o2.type = 'sine'; o2.frequency.value = f;
          e2.gain.setValueAtTime(i ? .12 : .3, t); e2.gain.exponentialRampToValueAtTime(.001, t + .035);
          o2.connect(e2); e2.connect(out); o2.start(t); o2.stop(t + .04);
        });
        // 3) kontak tıkı: kısa, dar filtreli gürültü
        var src = ctx.createBufferSource(); src.buffer = noise;
        var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 4200; bp.Q.value = 3;
        src.connect(bp); bp.connect(out); src.start(t);
      } catch (e) { /* yoksay */ }
    }
    var lastHoverT = 0;
    // Hover sesi: menü dilimlerine veya etkileşimli öğelere fareyle gelindiğinde hafif, zarif dokunsal "tık"
    function hover(vol) {
      if (!ctx || ctx.state !== 'running') return;
      try {
        var t = ctx.currentTime;
        if (t - lastHoverT < .035) return;
        lastHoverT = t;
        var out = ctx.createGain(); out.gain.value = vol || .025; out.connect(ctx.destination);
        // 1) hafif ve daha tiz mekanik vuruş (480Hz → 300Hz)
        var o = ctx.createOscillator(), e = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(480, t); o.frequency.exponentialRampToValueAtTime(300, t + .016);
        e.gain.setValueAtTime(.4, t); e.gain.exponentialRampToValueAtTime(.001, t + .018);
        o.connect(e); e.connect(out); o.start(t); o.stop(t + .02);
        // 2) zarif çınlama
        var o2 = ctx.createOscillator(), e2 = ctx.createGain();
        o2.type = 'sine'; o2.frequency.value = 2400;
        e2.gain.setValueAtTime(.15, t); e2.gain.exponentialRampToValueAtTime(.001, t + .022);
        o2.connect(e2); e2.connect(out); o2.start(t); o2.stop(t + .025);
        // 3) kontak çıtırtısı
        if (noise) {
          var src = ctx.createBufferSource(); src.buffer = noise;
          var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 4200; bp.Q.value = 3.5;
          var ng = ctx.createGain(); ng.gain.setValueAtTime(.2, t); ng.gain.exponentialRampToValueAtTime(.001, t + .015);
          src.connect(bp); bp.connect(ng); ng.connect(out);
          src.start(t);
        }
      } catch (e) { /* yoksay */ }
    }
    unlockEvents.forEach(function (ev) {
      window.addEventListener(ev, unlock, { capture: true, passive: true });
    });
    try { unlock(); } catch (e) { }
    return { click: click, hover: hover, unlock: unlock };
  })();

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

    var wrapM = el('span', 'ew-moon-wrap', { 'aria-hidden': 'true' });
    wrapM.innerHTML =
      '<svg width="28" height="28" viewBox="0 0 28 28">' +
      '<circle cx="14" cy="14" r="11" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.35)" stroke-width="1"/>' +
      '<path d="' + lit + '" fill="#ffe9a8"/></svg>';
    ar.parentNode.insertBefore(wrapM, ar);
  });

  /* ------------------------------------------------------------------ */
  /* 2c. TARİHLER — Hicri + Miladi, 6 dilde ve 3 Uygur yazısında          */
  /* ------------------------------------------------------------------ */
  // Sitenin kendi kodu ul/uc'yi Arap harfli Uygurcaya düşürüyor ve LTR dillerde noktalama ters yöne kayıyor;
  // bu yüzden iki satır da burada, ui.json → calendar verisiyle yeniden yazılır (Hicri hesap: sitenin UQCal'ı).
  safe('dates', function () {
    var ar = $('.chisla-ar'), gr = $('.chisla-ug');
    if (!ar || !gr) return;
    function fill(tpl, v) { return tpl.replace(/\{(\w+)\}/g, function (_, k) { return v[k] == null ? '' : v[k]; }); }
    function render() {
      var C = UI && UI.calendar;
      if (!C) return;
      var d = new Date();
      var months = loc(C.months) || [], weekdays = loc(C.weekdays) || [];
      gr.textContent = fill(loc(C.gregorianFormat), {
        y: d.getFullYear(), mn: d.getMonth() + 1, d: d.getDate(), m: months[d.getMonth()], w: weekdays[d.getDay()]
      });
      if (typeof window.UQCal === 'function') {
        try {
          var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
          var H = new window.UQCal(d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())).convert();
          var hm = loc(C.hijriMonths) || [];
          if (H && hm[H.Hmonth - 1]) ar.textContent = fill(loc(C.hijriFormat), { y: H.Hyear, m: hm[H.Hmonth - 1], d: H.Hday });
        } catch (e) { /* hesaplanamazsa sitenin kendi metni kalır */ }
      }
      [ar, gr].forEach(function (n) {
        n.setAttribute('dir', RTL_LANG ? 'rtl' : 'ltr');
        n.setAttribute('lang', LABEL_LANG[LANG] || 'ug');
      });
    }
    // Sitenin kendi initDates()'i jQuery ready'de çalışır; veri geldikten sonra ve sayfa yüklenince bir kez daha yazılır
    whenData(render, 'dates-render');
    window.addEventListener('load', render);
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

    whenData(function () {   // ui.json + wheel.json yüklenince kurulur (sonu: modülün sonundaki "}, 'menu');")
      var ITEMS = UI.wheel.items, N = ITEMS.length;
      // Öğe sayısı, dilim sayısı ve açılar ITEMS.length'ten hesaplanır. Logo altı yazısı: items[i].label (dile göre).
      // Simge: ilk 12 öğe için icon-N.png (menu.png'den kesilmiş; daire koordinatı WHEEL.icons'ta), yeni öğeler için items[i].icon (kare PNG).
      function wheelLabel(i) { return loc(ITEMS[i].label); }
      function iconFile(i) { return ITEMS[i].icon || ('icon-' + i + '.png'); }
      var BASE = SCRIPT_BASE + '../images/wheel/';
      function asset(name) { return BASE + name + ASSET_V; }

      // Her öğenin bağlantı düğmesi: sitenin kendi .mbtn öğesi; sitede karşılığı olmayan yeni öğeler için oluşturulur
      function createBtn(i) {
        var it = ITEMS[i];
        var b = el('div', 'mbtn ' + (it.href ? 'mbtn-active' : 'mbtn-inactive'));
        b.style.position = 'absolute';
        b.style.borderRadius = '50%';
        if (it.href) {
          var a = el('a', null, { href: it.href, target: '_blank', rel: 'noopener' });
          a.textContent = it.href;
          b.appendChild(a);
        }
        return b;
      }
      var btns = [];
      for (var bi = 0; bi < N; bi++) btns.push(origBtns[bi] || createBtn(bi));
      btns.forEach(function (b) {
        b.insertBefore(el('span', 'ew-slice', { 'aria-hidden': 'true' }), b.firstChild);
        $$('a', b).forEach(function (a) { a.setAttribute('draggable', 'false'); });
      });
      img.setAttribute('draggable', 'false');

      // ---- Okuyan çocuğun arkasında dönen ışık huzmeleri (sabit merkezde) ----
      var haloWrap = el('div', 'ew-halo-wrap', { 'aria-hidden': 'true' });
      haloWrap.style.clipPath = 'inset(0 0 12.5% 0)';   // huzmeler hero'nun alt kenarından aşağı taşmasın
      haloWrap.appendChild(el('div', 'ew-halo'));
      menu.insertBefore(haloWrap, img);
      function showHalo() { haloWrap.classList.add('ew-on'); }

      // ---- "Hepsini gör": tüm siteler kartlarla bir pencerede (düğme + çocuğa tıklama) ----
      var sites = null;
      var hubShift = 0;                     // tam daire modunda göbeğin (çocuk + hilal) aşağı kayması (menu.png pikseli)
      function buildSites() {
        var overlay = el('div', 'ew-sites',
          { role: 'dialog', 'aria-modal': 'true', 'aria-label': t('sitesTab') || t('sitesTitle'), hidden: '' });
        var panel = el('div', 'ew-sites-panel');
        var head = el('div', 'ew-sites-head');
        var tabs = el('div', 'ew-sites-tabs', { role: 'tablist' });
        var tabSites = el('button', 'ew-sites-tab ew-on', { type: 'button', role: 'tab', 'aria-selected': 'true' });
        tabSites.textContent = t('sitesTab') || t('sitesTitle');
        var tabApps = el('button', 'ew-sites-tab', { type: 'button', role: 'tab', 'aria-selected': 'false' });
        tabApps.textContent = t('appsTab') || (t('appsTitle') || '').replace(/[:：]\s*$/, '');
        tabs.appendChild(tabSites); tabs.appendChild(tabApps);
        var close = el('button', 'ew-sites-close', { type: 'button', 'aria-label': t('close') });
        close.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
        head.appendChild(tabs); head.appendChild(close);

        var sitesGrid = el('div', 'ew-sites-grid', { role: 'tabpanel' });
        // Çarktaki sırayla (sağdan sola): son öğe … 0
        for (var i = N - 1; i >= 0; i--) {
          var a = $('a', btns[i]);
          var href = a && a.getAttribute('href');
          var card = el(href ? 'a' : 'div', 'ew-site-card' + (href ? '' : ' ew-off'),
            href ? { href: href, target: '_blank', rel: 'noopener' } : { 'aria-disabled': 'true' });
          var logo = el('img', 'ew-site-logo', { src: asset(iconFile(i)), alt: '', loading: 'lazy' });
          logo.onerror = function () { this.style.visibility = 'hidden'; };
          var name = el('span', 'ew-site-name', { dir: 'auto' });
          name.textContent = wheelLabel(i);
          card.appendChild(logo); card.appendChild(name);
          if (href) {
            var host = el('span', 'ew-site-host', { dir: 'ltr' });
            try { host.textContent = new URL(href, location.href).hostname.replace(/^www\./, ''); } catch (e) { host.textContent = href; }
            card.appendChild(host);
          } else {
            var soon = el('span', 'ew-soon');
            soon.textContent = t('soon');
            card.appendChild(soon);
          }
          sitesGrid.appendChild(card);
        }

        var appsGrid = el('div', 'ew-sites-grid', { role: 'tabpanel', hidden: '' });
        var platIcons = {
          ios: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.96 6.33c.67-.81 1.12-1.94 1-3.08-.96.04-2.13.64-2.82 1.45-.62.71-1.16 1.86-1.02 2.96 1.08.08 2.17-.55 2.84-1.33"/></svg>',
          android: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.43 11.43 0 0 0-8.94 0L5.65 5.67c-.19-.28-.54-.37-.83-.22-.3.16-.42.54-.26.85l1.84 3.18C4.08 10.78 2.54 13.06 2.15 16h19.7c-.39-2.94-1.93-5.22-4.25-6.52zM8.5 13.75a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm7 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>',
          win: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 5.5L10.5 4.4v7.1H3V5.5zm8.5-1.2L21 3v8.5h-9.5V4.3zM3 12.5h7.5v7.1L3 18.5v-6zm8.5 0H21V21l-9.5-1.3v-7.2z"/></svg>',
          web: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
        };
        function appPlatforms(app) {
          var tags = [];
          if (app.stores && app.stores.length) {
            app.stores.forEach(function (s) {
              if (s.platform === 'ios') tags.push({ key: 'ios', cls: 'ew-plat-ios', text: 'iOS' });
              else tags.push({ key: 'android', cls: 'ew-plat-android', text: 'Android' });
            });
          }
          if (!tags.length && app.downloads && app.downloads.length) tags.push({ key: 'win', cls: 'ew-plat-win', text: 'Windows' });
          if (app.website) tags.push({ key: 'web', cls: 'ew-plat-web', text: 'Web' });
          return tags;
        }
        function renderAppsGrid() {
          appsGrid.innerHTML = '';
          var list = APPS_DATA && APPS_DATA.apps ? APPS_DATA.apps : null;
          if (list) {
            list.forEach(function (app) {
              var card = el('button', 'ew-site-card ew-app-card', { type: 'button' });
              var logo = el('img', 'ew-app-logo', { src: SCRIPT_BASE + '../' + app.image + ASSET_V, alt: '', loading: 'lazy' });
              logo.onerror = function () { this.style.visibility = 'hidden'; };
              var name = el('span', 'ew-site-name', { dir: 'auto' });
              name.textContent = loc(app.name);
              card.appendChild(logo); card.appendChild(name);
              var plats = appPlatforms(app);
              if (plats.length) {
                var badges = el('div', 'ew-app-badges', { dir: 'ltr' });
                plats.forEach(function (p) {
                  var b = el('span', 'ew-plat-badge ' + p.cls, { title: p.text, 'aria-label': p.text });
                  b.innerHTML = platIcons[p.key] || '';
                  badges.appendChild(b);
                });
                card.appendChild(badges);
              }
              card.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') ratchet.hover(); });
              card.addEventListener('click', function () {
                hide(true);
                var item = $('.apps .item.app' + app.id);
                if (item) item.click();
              });
              appsGrid.appendChild(card);
            });
          } else {
            $$('.apps .item').forEach(function (item) {
              var im = $('img', item), tx = $('.item-text', item);
              var card = el('button', 'ew-site-card ew-app-card', { type: 'button' });
              if (im) {
                var logo = el('img', 'ew-app-logo', { src: im.currentSrc || im.src, alt: '', loading: 'lazy' });
                card.appendChild(logo);
              }
              if (tx) {
                var name = el('span', 'ew-site-name', { dir: 'auto' });
                name.textContent = tx.textContent.trim();
                card.appendChild(name);
              }
              card.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') ratchet.hover(); });
              card.addEventListener('click', function () {
                hide(true);
                item.click();
              });
              appsGrid.appendChild(card);
            });
          }
        }
        renderAppsGrid();
        appsReady.then(function (d) { if (d) renderAppsGrid(); });

        var bodyWrap = el('div', 'ew-sites-body');
        bodyWrap.appendChild(sitesGrid);
        bodyWrap.appendChild(appsGrid);

        var foot = el('div', 'ew-sites-foot');
        var footInfo = el('span', 'ew-sites-foot-info');
        footInfo.textContent = t('hubTitle');
        var footClose = el('button', 'ew-sites-foot-close', { type: 'button' });
        footClose.textContent = t('close');
        foot.appendChild(footInfo); foot.appendChild(footClose);

        function switchTab(which) {
          var isApps = which === 'apps';
          tabSites.classList.toggle('ew-on', !isApps);
          tabApps.classList.toggle('ew-on', isApps);
          tabSites.setAttribute('aria-selected', isApps ? 'false' : 'true');
          tabApps.setAttribute('aria-selected', isApps ? 'true' : 'false');
          sitesGrid.hidden = isApps;
          appsGrid.hidden = !isApps;
          overlay.setAttribute('aria-label', isApps ? tabApps.textContent : tabSites.textContent);
          bodyWrap.scrollTop = 0;
        }
        tabSites.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') ratchet.hover(); });
        tabApps.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') ratchet.hover(); });
        tabSites.addEventListener('click', function () { switchTab('sites'); });
        tabApps.addEventListener('click', function () { switchTab('apps'); });

        panel.appendChild(head); panel.appendChild(bodyWrap); panel.appendChild(foot);
        overlay.appendChild(panel);
        doc.body.appendChild(overlay);

        var lastFocus = null;
        function open() {
          lastFocus = doc.activeElement;
          switchTab('sites');
          overlay.hidden = false;
          doc.documentElement.classList.add('ew-sites-open');
          requestAnimationFrame(function () { overlay.classList.add('ew-show'); });
          close.focus();
        }
        function hide(skipFocus) {
          overlay.classList.remove('ew-show');
          doc.documentElement.classList.remove('ew-sites-open');
          setTimeout(function () { overlay.hidden = true; }, MOTION ? 300 : 0);
          if (!skipFocus && lastFocus && lastFocus.focus) lastFocus.focus();
        }
        close.addEventListener('click', function () { hide(false); });
        footClose.addEventListener('click', function () { hide(false); });
        overlay.addEventListener('click', function (e) { if (e.target === overlay) hide(false); });
        doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !overlay.hidden) hide(false); });
        return { open: open };
      }
      function openSites() { (sites = sites || buildSites()).open(); }

      var seeAll = el('button', 'ew-seeall', { type: 'button' });
      seeAll.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg><span></span>';
      seeAll.lastChild.textContent = t('seeAll');
      seeAll.addEventListener('click', openSites);
      seeAll.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') ratchet.hover(); });
      top.appendChild(seeAll);

      // Çocuğa (hilal + çocuk) tıklayınca da aynı pencere
      var hubBtn = el('button', 'ew-hubbtn', { type: 'button', 'aria-label': t('seeAll'), title: t('seeAll') });
      hubBtn.addEventListener('click', openSites);
      menu.appendChild(hubBtn);

      function placeExtras() {
        var W = img.clientWidth;
        if (!W) return;
        var k = W / WHEEL.size[0], s = W / 1120;
        // çocuk + hilal: menu.png'de merkez ≈ (700, 535), yarıçap ≈ 110
        hubBtn.style.left = (700 - 110) * k + 'px'; hubBtn.style.top = (535 - 110 + hubShift) * k + 'px';
        hubBtn.style.width = hubBtn.style.height = 220 * k + 'px';
        var h = Math.max(44 * s, COARSE ? W * .11 : 34, 34);
        seeAll.style.height = h + 'px';
        seeAll.style.fontSize = Math.max(13, Math.min(16, h * .36)) + 'px';
        seeAll.style.left = (menu.offsetLeft + W / 2) + 'px';
        seeAll.style.transform = 'translateX(-50%)';
        seeAll.style.top = (top.offsetHeight + 8 * s) + 'px';
      }
      if (img.complete && img.naturalWidth) placeExtras(); else img.addEventListener('load', placeExtras, { once: true });
      window.addEventListener('resize', debounce(placeExtras, 150));
      if ('ResizeObserver' in window) new ResizeObserver(debounce(placeExtras, 50)).observe(top);

      // ---- Sabit menü (hareket kapalıysa ya da çark parçaları yüklenemezse) ----
      var wheelOn = false;
      function staticMode() {
        if (wheelOn) return;
        showHalo();                  // çark yok: sitenin kendi menüsü (menu.png) olduğu gibi kalır
      }
      if (!MOTION) { staticMode(); return; }

      // ---- Çark parçalarını önceden yükle ----
      // Dar ekran (telefon): her öğe bir kez; geniş ekran: her öğe karşılıklı iki kez (ui.json → slotsPerItem)
      var COMPACT = (menu.clientWidth || img.clientWidth) < 700;
      // FULL: çarkın tamamı (tam daire) mı, yoksa üst yarısı mı gösterilsin. Telefonda da yarım daire
      // gösteriliyor; true yapılırsa tam daire açılır ve göbek (çocuk + hilal + yazı) dairenin merkezine kayar.
      var FULL = false, HUB_DY = FULL ? 150 : 0;
      var urls = [asset('ring.webp'), asset('hub.png'), asset('legs.png'), asset('head.png')];
      for (var ui = 0; ui < N; ui++) urls.push(asset(iconFile(ui)));
      var ringSrc = null, pending = urls.length, failed = false;
      urls.forEach(function (u, idx) {
        var im = new Image();
        if (idx === 0) ringSrc = im;
        im.onload = function () { if (--pending === 0 && !failed) whenReady(img, buildWheel); };
        im.onerror = function () { if (!failed) { failed = true; staticMode(); } };
        im.src = u;
      });
      function whenReady(image, fn) {
        if (image.complete && image.naturalWidth) fn(); else image.addEventListener('load', fn, { once: true });
      }

      /* ---- Dönme dolap ----
         clip    : menü boyutunda (+ yan pay); çarkın alt yarısını gizler
         wheel   : dönen halka — orijinal dilimlerden üretilmiş ring.webp (sınır gölgeleri dahil)
         cabins  : 24 logo (12 bağlantı × 2, karşılıklı); her biri pime tam merkezinden takılı,
                   altındaki yazının ağırlığıyla dik durur ve çarkın ivmesine göre hafifçe sallanır.
         Ortadaki ay + kitap okuyan çocuk (orijinal görselin merkezi) sabit göbektir. */
      function buildWheel() {
        // Çarkın bandı: iç kenar (sabit göbek) → dış kenar (wheel.json → ring; araçtaki RING_INNER / RING_OUTER).
        var R_HUB = WHEEL.ring.inner, R_EDGE = WHEEL.ring.outer;
        // Dar ekranda (telefon): her logo bir kez (12 yer, 30° arayla), logolar/yazılar ~1.55 kat büyük →
        // okunur ve parmakla basılabilir. Geniş ekranda: her logo karşılıklı iki kez (24 yer, 15° arayla).
        var PER = UI.wheel.slotsPerItem, SLOTS = N * (COMPACT ? PER.compact : PER.normal), SLOT_DEG = 360 / SLOTS, Z = COMPACT ? 1.55 : 1;
        var GW = 120 * Z, GH = 94 * Z, ICON = 72 * Z, FONT = 13.5 * (COMPACT ? 1.9 : 1);
        // RP: logo merkezlerinin yarıçapı. Logo + altındaki yazı (grup) bandın içinde ortalanır:
        // grubun üstü dış çembere, altı iç çembere eşit uzaklıkta. (Masaüstündeki değer ≈ 436.)
        var GROUP = ICON + 3 + FONT * 1.25;
        var RP = (R_HUB + R_EDGE) / 2 + GROUP / 2 - ICON / 2 + (COMPACT ? 0 : 8);
        var DEG = Math.PI / 180;

        var clip = el('div', 'ew-clip');
        var wheel = el('div', 'ew-wheel', { 'aria-hidden': 'true' });
        // Halka dokusu: 24 dilimde ring.webp doğrudan; başka dilim sayısında aynı dilim tuvale çarpıtılarak çizilir
        var ringImg = (ringSrc && makeRing(ringSrc, SLOTS, R_HUB / R_EDGE, COMPACT ? 1024 : 1440)) ||
          el('img', 'ew-ring-img', { src: asset('ring.webp'), alt: '', draggable: 'false' });
        wheel.appendChild(ringImg);
        // Üzerine gelinen dilim (sektör): halkayla birlikte döner, koyu bir örtüyle vurgulanır.
        // Yolu (SVG, halka koordinatlarında) önceden hesaplanır; her dilim için bir kez.
        function sectorD(q) {
          var a1 = -(q + 1) * SLOT_DEG * DEG, a2 = -q * SLOT_DEG * DEG;
          function P(r, a) { return (r * Math.cos(a)).toFixed(2) + ' ' + (r * Math.sin(a)).toFixed(2); }
          return 'M' + P(R_EDGE, a1) + ' A' + R_EDGE + ' ' + R_EDGE + ' 0 0 1 ' + P(R_EDGE, a2) +
            ' L' + P(R_HUB, a2) + ' A' + R_HUB + ' ' + R_HUB + ' 0 0 0 ' + P(R_HUB, a1) + ' Z';
        }
        var sectorPaths = [];
        for (var q = 0; q < SLOTS; q++) sectorPaths.push(sectorD(q));
        var sector = svgEl('svg', { 'class': 'ew-sector', viewBox: (-R_EDGE) + ' ' + (-R_EDGE) + ' ' + (2 * R_EDGE) + ' ' + (2 * R_EDGE), 'aria-hidden': 'true', focusable: 'false' });
        var sectorPath = svgEl('path', { d: '' });
        sector.appendChild(sectorPath);
        wheel.appendChild(sector);
        var lastSector = -2;
        clip.appendChild(wheel);

        // Kabinler
        var cabins = [];
        for (var j = 0; j < SLOTS; j++) {
          var i = N - 1 - (j % N);               // dilim j ↔ menu_item_(N-1-j) (sağdan sola)
          var dup = j >= N;                      // ikinci tur: karşılıklı kopya (aria-hidden)
          var icon = WHEEL.icons[i];             // yalnızca menu.png'den kesilen ilk 12'de var; yeni öğelerde undefined
          var b = dup ? btns[i].cloneNode(true) : btns[i];
          if (dup) $$('a', b).forEach(function (a) { a.tabIndex = -1; });
          var cab = el('div', 'ew-cabin', dup ? { 'aria-hidden': 'true' } : null);
          var gondola = el('div', 'ew-gondola');
          var txt = wheelLabel(i);
          var lab = el('div', 'ew-label', { lang: LABEL_LANG[LANG] || 'ug', dir: /[؀-ۿ]/.test(txt) ? 'rtl' : 'ltr' });
          if (dup) lab.setAttribute('aria-hidden', 'true');
          lab.textContent = txt;
          var slice = $('.ew-slice', b);
          slice.style.backgroundImage = 'url("' + asset(iconFile(i)) + '")';
          gondola.appendChild(b);
          gondola.appendChild(lab);
          cab.appendChild(gondola);
          clip.appendChild(cab);
          cabins.push({
            el: cab, gondola: gondola, btn: b, slice: slice, label: lab, icon: icon,
            th0: (SLOT_DEG / 2 + SLOT_DEG * j) * DEG,   // matematiksel açı (saat yönü tersi, sağdan); dilimin tam ortası
            phi: 0, dphi: 0, wind: Math.random() * 6.28
          });
        }

        menu.appendChild(clip);
        // Sabit göbek + dizden sallanan bacaklar + boyundan kalkıp inen baş (hilalde oturan çocuk)
        var hub = el('img', 'ew-sprite',
          { src: asset('hub.png'), alt: '', draggable: 'false', 'aria-hidden': 'true' });
        var legs = el('img', 'ew-legs ew-sprite',
          { src: asset('legs.png'), alt: '', draggable: 'false', 'aria-hidden': 'true' });
        var head = el('img', 'ew-head ew-sprite',
          { src: asset('head.png'), alt: '', draggable: 'false', 'aria-hidden': 'true' });
        menu.appendChild(hub);
        menu.appendChild(legs);
        menu.appendChild(head);
        // Çocuğun altındaki yazı: hub.png'den silindi, dile göre gerçek metin olarak çizilir (ui.json → strings.hubTitle)
        var hubText = el('div', 'ew-hubtext', { 'aria-hidden': 'true', lang: LABEL_LANG[LANG] || 'ug', dir: RTL_LANG ? 'rtl' : 'ltr' });
        hubText.textContent = t('hubTitle');
        menu.appendChild(hubText);

        // Ok düğmeleri: dış çemberin sol-alt ve sağ-alt ucunda. Üzerine gelince çark o yöne döner,
        // tıklayınca o yöne bir itme verir. (dir −1: saat yönünün tersi → öğeler sola akar)
        var arrows = [-1, 1].map(function (dir) {
          var btn = el('button', 'ew-arrow', { type: 'button', 'aria-label': t(dir < 0 ? 'turnLeft' : 'turnRight') });
          btn.innerHTML = '<svg width="55%" height="55%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' +
            (dir < 0 ? '<path d="M15 5l-7 7 7 7"/>' : '<path d="M9 5l7 7-7 7"/>') + '</svg>';
          btn.addEventListener('pointerenter', function (e) {
            if (e.pointerType === 'mouse') { steer = dir; ratchet.hover(); }
          });
          btn.addEventListener('pointerleave', function () { steer = 0; });
          btn.addEventListener('click', function () { omega = dir * KICK; });
          top.appendChild(btn);
          return { el: btn, dir: dir };
        });
        menu.classList.add('ew-wheel-on');
        top.classList.add('ew-wheel-top');         // çemberin altı ile çizgi arasındaki boşluğu kapatır (CSS)
        img.classList.add('ew-center');            // orijinal görsel yalnızca sabit merkezi göstersin
        wheelOn = true;

        var geo = { W: 0, H: 0, s: 1, M: 0, cx: 0, cy: 0, rin: 0, rout: 0 };
        function layout() {
          // H: kırpma yüksekliği. Kesirli piksellerde (ör. 712.5) clientHeight aşağı yuvarlar ve çemberle çizgi arasında
          // ince bir aralık kalır; bu yüzden gerçek yüksekliği yukarı yuvarlıyoruz.
          var W = img.clientWidth, H = Math.ceil(img.getBoundingClientRect().height - .01);
          if (!W || !H) return;
          // M: kırpma kutusunun yan payı. 0 olmalı — pay, overflow:clip desteklemeyen tarayıcılarda
          // (ör. Safari < 16) sayfayı yana taşırıyor. Logolar menü genişliğinin içinde kalıyor.
          var s = W / 1120, M = 0;
          var CH = FULL ? W : H;                   // görünen yükseklik: tam daire ya da üst yarı
          geo = { W: W, H: CH, s: s, M: M, cx: M + W / 2, cy: W / 2, rin: R_HUB * s, rout: R_EDGE * s };
          menu.style.height = FULL ? CH + 'px' : '';
          clip.style.left = -M + 'px';
          clip.style.width = (W + 2 * M) + 'px';
          clip.style.height = CH + 'px';
          wheel.style.left = M + 'px';
          wheel.style.width = wheel.style.height = W + 'px';
          var rd = R_EDGE * s;                     // halkanın dış yarıçapı
          ringImg.style.left = ringImg.style.top = (W / 2 - rd) + 'px';
          ringImg.style.width = ringImg.style.height = 2 * rd + 'px';
          sector.style.left = sector.style.top = (W / 2 - rd) + 'px';
          sector.style.width = sector.style.height = 2 * rd + 'px';
          var k = W / WHEEL.size[0], hb = WHEEL.hub, lg = WHEEL.legs;
          var dy = HUB_DY * k;
          hub.style.left = hb[0] * k + 'px'; hub.style.top = hb[1] * k + dy + 'px';
          hub.style.width = hb[2] * k + 'px'; hub.style.height = hb[3] * k + 'px';
          legs.style.left = lg[0] * k + 'px'; legs.style.top = lg[1] * k + dy + 'px';
          legs.style.width = lg[2] * k + 'px'; legs.style.height = lg[3] * k + 'px';
          legs.style.transformOrigin = (WHEEL.knee[0] - lg[0]) * k + 'px ' + (WHEEL.knee[1] - lg[1]) * k + 'px';
          if (FULL) {                              // huzmeler çocuğun arkasında, kaydırılmış göbeğe göre
            haloWrap.style.top = (540 + HUB_DY) * k + 'px';
            haloWrap.style.clipPath = 'none';
          }
          var ht = WHEEL.hubText;                  // [merkez x, merkez y, en geniş genişlik] (menu.png px)
          if (ht) {
            hubText.style.left = ht[0] * k + 'px';
            hubText.style.top = ht[1] * k + dy + 'px';
            hubText.style.fontSize = 40 * k + 'px';
            var tw = hubText.scrollWidth, maxW = ht[2] * k;
            if (tw > maxW) hubText.style.fontSize = (40 * k * maxW / tw) + 'px';   // uzun metin sığsın
          }
          var hd = WHEEL.head;
          head.style.left = hd[0] * k + 'px'; head.style.top = hd[1] * k + dy + 'px';
          head.style.width = hd[2] * k + 'px'; head.style.height = hd[3] * k + 'px';
          head.style.transformOrigin = (WHEEL.neck[0] - hd[0]) * k + 'px ' + (WHEEL.neck[1] - hd[1]) * k + 'px';
          // ok düğmeleri: .top içinde (dar ekranda .menu taşanı gizliyor), bandın sol/sağ ucunun altında,
          // hero'nun alt kenarının hemen altında. Dokunmatikte parmakla basılabilecek büyüklükte.
          var ab = Math.max(44 * s, COARSE ? W * .11 : 34);
          arrows.forEach(function (a) {
            a.el.style.width = a.el.style.height = ab + 'px';
            a.el.style.left = (menu.offsetLeft + W / 2 + a.dir * (R_HUB + R_EDGE) / 2 * s - ab / 2) + 'px';
            a.el.style.top = (top.offsetHeight + 8 * s) + 'px';
          });
          cabins.forEach(function (c) {
            var gw = GW * s, gh = GH * s, d = ICON * s;
            c.el.style.width = gw + 'px';
            c.el.style.height = gh + 'px';
            c.el.style.transformOrigin = '50% ' + d / 2 + 'px';   // dönme noktası = logonun merkezi
            c.gondola.style.top = '0px';
            c.gondola.style.height = gh + 'px';
            // yuvarlak logo (bağlantı) — merkezi pime takılı
            c.btn.style.left = (gw - d) / 2 + 'px';
            c.btn.style.top = '0px';
            c.btn.style.width = c.btn.style.height = d + 'px';
            var ic = c.icon;
            if (ic) {                              // menu.png'den kesilmiş logo: daire koordinatına göre ölçeklenir
              var R = ic[2], f = d / (2 * R);
              var x0 = Math.floor(ic[0] - R - 1), y0 = Math.floor(ic[1] - R - 1), sz = Math.ceil(2 * R + 3);
              c.slice.style.backgroundSize = sz * f + 'px ' + sz * f + 'px';
              c.slice.style.backgroundPosition = (x0 - (ic[0] - R)) * f + 'px ' + (y0 - (ic[1] - R)) * f + 'px';
            } else {                               // yeni öğe: kare PNG, daireyi doldurur
              c.slice.style.backgroundSize = 'cover';
              c.slice.style.backgroundPosition = 'center';
            }
            // yazı — logonun hemen altında tek satır, onunla birlikte asılı
            c.label.style.top = (ICON + 3) * s + 'px';
            c.label.style.fontSize = FONT * s + 'px';
          });
        }
        hubShift = HUB_DY;
        layout();
        if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(layout);   // yazı tipi yüklenince hub yazısı yeniden sığdırılır
        window.addEventListener('resize', debounce(layout, 150));
        placeExtras();
        // hero yüksekliği font yüklenince / tarih satırı kırılınca değişebilir → okları yeniden yerleştir
        if ('ResizeObserver' in window) new ResizeObserver(debounce(layout, 50)).observe(top);

        // ---- Dönüş: açılışta çevirme → yavaş, sürekli dönüş ----
        var SOUND_MIN = 0.5, travel = 0;  // deg/s: çark dönerken (boşta yavaş dönüş dahil) her dilim geçişinde tık sesi
        var AUTO = 6.0;              // derece/sn (pozitif = saat yönü: kabinler soldan sağa akar)
        var angle = 0, omega = 150;
        var hover = false, drag = null, steer = 0, STEER_SPEED = 40, KICK = 150;

        function center() {
          var r = menu.getBoundingClientRect();
          return { x: r.left + geo.W / 2, y: r.top + geo.cy };
        }
        function polar(e) {
          var c = center(), dx = e.clientX - c.x, dy = e.clientY - c.y;
          return { r: Math.sqrt(dx * dx + dy * dy), a: Math.atan2(dy, dx) * 180 / Math.PI, x: e.clientX, y: e.clientY, cy: c.y };
        }
        function norm(d) { while (d > 180) d -= 360; while (d < -180) d += 360; return d; }
        function inRing(p) { return p.r >= geo.rin && p.r <= geo.rout && (FULL || p.y <= p.cy); }

        // Fare çarkın üzerindeyken yavaşlayıp durur → bağlantılara rahat tıklanır
        // ptr: sektör vurgusu için son fare konumu (yalnızca halkanın üzerindeyken)
        var ptr = null;
        menu.addEventListener('pointerenter', ratchet.unlock);
        menu.addEventListener('pointermove', function (e) {
          if (e.pointerType !== 'mouse') return;
          var on = inRing(polar(e));
          hover = on;
          ptr = on ? { clientX: e.clientX, clientY: e.clientY } : null;
          menu.style.cursor = drag && drag.moved ? 'grabbing' : (on ? 'grab' : '');
        });
        menu.addEventListener('pointerleave', function () { hover = false; ptr = null; menu.style.cursor = ''; });

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

      clip.classList.add('ew-ready');
      showHalo();
      runWhileVisible(top, function (dtMs) {
        var dt = Math.min(.05, dtMs / 1000);
        clock += dt;
        if (!drag || !drag.moved) {
          var target = steer ? steer * STEER_SPEED : (hover ? 0 : AUTO);   // ok üzerindeyken o yöne döner
          omega += (target - omega) * (1 - Math.exp(-dt / .9));
          angle += omega * dt;
        }
        // gerçek açısal hız ve ivme (sürükleme dahil), yumuşatılmış
        var wNow = norm(angle - prevAngle) / dt * DEG;
        prevAngle = angle;
        var wPrev = wS;
        wS += (wNow - wS) * .35;
        aS += (clamp((wS - wPrev) / dt, -6, 6) - aS) * .25;
        // Tık sesi: elle çevirme, oklar ve açılış dönüşünde her SLOT_DEG kadar yol bir dilim geçişi sayılır
        var spd = Math.abs(wS) / DEG;                          // deg/s (yumuşatılmış)
        var modalOpen = root.classList.contains('ew-sites-open') || doc.body.classList.contains('modal-open');
        if (spd > SOUND_MIN && !modalOpen) {
          travel += spd * dt;
          var vol = clamp((spd - SOUND_MIN) / 120, .35, 1) * .055;
          while (travel >= SLOT_DEG) { travel -= SLOT_DEG; ratchet.click(vol); }
        } else {
          travel = 0;
        }
        angle %= 360;
        wheel.style.setProperty('--ew-a', angle.toFixed(3) + 'deg');
        // Fare hangi dilimin üzerinde? Dilim j: çarkın (dönmemiş) ekran açısında −(j+1)·S … −j·S
        var sec = -1;
        if (ptr && !(drag && drag.moved)) {
          var pp = polar(ptr);
          if (inRing(pp)) sec = Math.floor((((-(pp.a - angle)) % 360) + 360) % 360 / SLOT_DEG) % SLOTS;
        }
        if (sec !== lastSector) {
          lastSector = sec;
          sectorPath.setAttribute('d', sec < 0 ? '' : sectorPaths[sec]);
          if (sec >= 0) ratchet.hover();
        }

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
      });

    }
    }, 'menu');
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
    var floater = el('span', 'ew-floater');
    icon.insertBefore(floater, img);
    floater.appendChild(img);

    var mask = el('span', 'ew-iconmask', { 'aria-hidden': 'true' });
    mask.style.setProperty('--ew-mask', 'url("' + (img.currentSrc || img.src) + '")');
    var glare = el('span', 'ew-glare');
    mask.appendChild(glare);
    floater.appendChild(mask);
    icon.classList.add('ew-group');

    if (FINE) {
      if (MOTION) icon.classList.add('ew-tilt');
      it.addEventListener('pointerenter', function (e) {
        if (e.pointerType === 'mouse') ratchet.hover();
      });
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
        var dot = el('span', 'ew-ripple-dot');
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
  var cv = el('canvas', 'ew-letters', { 'aria-hidden': 'true' });
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

  var loader = el('div', 'ew-loader', { 'aria-live': 'polite' });
  var spinner = el('div', 'ew-spinner');
  var txt = el('div', 'ew-loader-text');
  loader.appendChild(spinner);
  loader.appendChild(txt);
  body.appendChild(loader);

  var timer;
  function show() {
    loader.classList.add('ew-on');
    clearTimeout(timer);
    timer = setTimeout(hide, 10000);
  }
  function hide() {
    clearTimeout(timer);
    loader.classList.remove('ew-on');
  }
  // iframe yüksekliğini içeriğe uydur: sitenin iframe'i 440px'e sabit, popup.php içeriği ise ~600–700px →
  // mağaza düğmeleri ve paylaşım bölümü kesiliyordu. Pencere ekrana sığacak kadar; fazlası iframe içinde kayar.
  // (Yalnızca aynı kökende okunabilir: canlı sitede ve proxy'li önizlemede çalışır, aksi halde 440px kalır.)
  var BASE_H = parseInt(frame.getAttribute('height'), 10) || 440;
  function fit() {
    try {
      var d = frame.contentDocument;
      if (!d || !d.documentElement) return;
      var h = Math.max(d.documentElement.scrollHeight, d.body ? d.body.scrollHeight : 0);
      // üst sınır: ekran yüksekliği − (pencere kenar boşlukları + "تاقاش" altlığı ≈ 150px)
      if (h > 0) frame.style.height = Math.min(h, Math.max(BASE_H, window.innerHeight - 150)) + 'px';
    } catch (e) { /* farklı köken: ölçülemez */ }
  }
  frame.addEventListener('load', function () {
    if (!frame.getAttribute('src')) return;
    hide();
    fit();
    setTimeout(fit, 400);                          // fontlar/görseller yüklendikten sonra yeniden ölç
    try {
      var w = frame.contentWindow;
      w.addEventListener('load', fit);
      if (w.ResizeObserver) new w.ResizeObserver(fit).observe(w.document.documentElement);
    } catch (e) { }
  });
  /* ---- Uygulama kartları: iframe yerine assets/data/apps.json'dan çizilir ----
     popup.php içeriğinin (görsel, açıklama, indirme/mağaza bağlantıları, paylaşım) verisi JSON'da tutulur.
     Veri yüklenemezse ya da kimlik bulunamazsa eski iframe akışı (popup.php) aynen çalışır. */
  var DATA = null, card = null, head = null, headTitle = null, native = false;
  var DATA_URL = SCRIPT_BASE + '../data/apps.json';
  var ASSET_ROOT = SCRIPT_BASE + '../';            // …/assets/ (görseller: images/apps/…)
  // Ug dışındaki dillerde: "ئەۋلاد ئەپ دېتاللىرى:" başlığı, "تاقاش" düğmesi ve simge altı uygulama adları
  // (canlı site bunları çevirmiyor; metinler ui.json ve apps.json içinde)
  function applyAppTexts() {
    if (LANG === 'ug' || !UI) return;
    var closeBtn = $('.modal-footer button', modal);
    if (closeBtn) closeBtn.textContent = t('close');
    var appsTitle = $('.apps .item-title');
    if (appsTitle) { appsTitle.textContent = t('appsTitle'); appsTitle.setAttribute('dir', RTL_LANG ? 'rtl' : 'ltr'); }   // ":" sona gelsin
    if (!DATA) return;
    DATA.apps.forEach(function (app) {
      var item = $('.apps .item.app' + app.id);
      if (!item) return;
      var name = loc(app.name), tx = $('.item-text', item), im = $('img', item);
      if (tx) tx.textContent = name;
      if (im) im.setAttribute('alt', name);
    });
  }
  whenData(function () { txt.textContent = t('loading'); applyAppTexts(); }, 'modal-i18n');
  appsReady.then(function (d) { DATA = d; applyAppTexts(); });

  function findApp(id) {
    if (!DATA) return null;
    for (var i = 0; i < DATA.apps.length; i++) if (DATA.apps[i].id === id) return DATA.apps[i];
    return null;
  }
  function textEl(tag, cls, text) {
    var n = el(tag, cls);
    n.textContent = text;
    return n;
  }
  function linkEl(href, text, cls) {
    var a = el('a', cls, { href: href, target: '_blank', rel: 'noopener noreferrer' });
    a.textContent = text;
    return a;
  }
  function copyText(s) {
    try {
      if (navigator.clipboard) return navigator.clipboard.writeText(s).then(function () { return true; }, function () { return false; });
    } catch (e) { }
    return Promise.resolve(false);
  }
  function renderApp(app) {
    var site = DATA.site, enc = encodeURIComponent;
    var url = site.url + '/popup.php?id=' + app.id;          // paylaşım bağlantısı: değişmez popup adresi
    var text = '@' + site.handle + ' — ' + loc(app.name) + ' — ' + site.url;
    card.textContent = '';

    card.appendChild(el('img', 'ew-app-img', { src: ASSET_ROOT + app.image, alt: '', width: '132', height: '132' }));
    loc(app.description).forEach(function (p) { card.appendChild(textEl('p', 'ew-app-desc', p)); });

    var acts = el('div', 'ew-app-actions');
    app.downloads.forEach(function (d) { acts.appendChild(linkEl(d.url, loc(d.label), 'ew-app-btn')); });
    if (app.stores.length) {
      var stores = el('div', 'ew-app-stores');
      app.stores.forEach(function (s) {
        var a = el('a', null, { href: s.url, target: '_blank', rel: 'noopener noreferrer' });
        a.appendChild(el('img', null, {
          src: ASSET_ROOT + 'images/apps/' + s.platform + '.png',
          alt: s.platform === 'ios' ? 'App Store' : 'Google Play', loading: 'lazy'
        }));
        stores.appendChild(a);
      });
      acts.appendChild(stores);
    }
    if (acts.childNodes.length) card.appendChild(acts);
    if (app.website) {
      var webLink = el('a', 'ew-app-web', {
        href: app.website.url, target: '_blank', rel: 'noopener noreferrer', dir: 'ltr'
      });
      webLink.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>' +
        '<span></span>' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M7 7h10v10"/></svg>';
      webLink.children[1].textContent = app.website.label;
      card.appendChild(webLink);
    }

    // Paylaş: eşit boyutlu, marka renkli daireler + altında kısa ad (hepsi aynı satır/aralıkta)
    card.appendChild(textEl('p', 'ew-app-share-title', t('shareTitle')));
    var share = el('div', 'ew-app-share');
    function shareItem(href, label, color, svgAttrs, pathD) {
      var a = el('a', 'ew-app-sh', { href: href, target: '_blank', rel: 'noopener noreferrer', title: label, 'aria-label': label });
      var ico = el('i', null, { 'aria-hidden': 'true' });
      ico.style.background = color;
      ico.innerHTML = '<svg viewBox="0 0 24 24" focusable="false"' + svgAttrs + '><path d="' + pathD + '"/></svg>';
      a.appendChild(ico);
      a.appendChild(textEl('span', null, label));
      return a;
    }
    var FILL = ' fill="currentColor"', STROKE = ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
    share.appendChild(shareItem('https://wa.me/?text=' + enc(text + ' ' + url), 'WhatsApp', '#25d366', FILL,
      'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z'));
    share.appendChild(shareItem('https://www.facebook.com/sharer/sharer.php?u=' + enc(url), 'Facebook', '#1877f2', FILL,
      'M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.6V4.3c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.5H8.6V14h2.7v8z'));
    share.appendChild(shareItem('https://x.com/intent/post?text=' + enc(text) + '&url=' + enc(url), 'X', '#111', FILL,
      'M18.2 2.3h3.3l-7.2 8.2 8.5 11.2h-6.6l-5.2-6.8-5.9 6.8H1.8l7.7-8.8L1.3 2.3h6.8l4.7 6.2zm-1.2 17.5h1.8L7.1 4.2H5.1z'));
    share.appendChild(shareItem('https://t.me/share/url?url=' + enc(url) + '&text=' + enc(text), 'Telegram', '#229ed9', FILL,
      'M9.8 15.2l-.4 4.3c.6 0 .8-.3 1.1-.6l2.7-2.5 5.6 4.1c1 .6 1.8.3 2-1L22.6 4c.3-1.4-.5-2-1.5-1.6L2.3 9.6c-1.4.5-1.3 1.3-.2 1.7l5.2 1.6L19 6.4c.6-.4 1.1-.2.7.2z'));
    // Bağlantı kopyala (düğme; sonuç durum satırında)
    var status = el('p', 'ew-app-status', { 'aria-live': 'polite' });
    var copy = el('button', 'ew-app-sh', { type: 'button', title: t('copyLink'), 'aria-label': t('copyLink') });
    var copyIco = el('i', null, { 'aria-hidden': 'true' });
    copyIco.style.background = '#44acbf';
    copyIco.innerHTML = '<svg viewBox="0 0 24 24" focusable="false"' + STROKE + '><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.2 1.2"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.2-1.2"/></svg>';
    copy.appendChild(copyIco);
    copy.appendChild(textEl('span', null, t('copyShort')));
    copy.addEventListener('click', function () {
      copyText(url).then(function (ok) { status.textContent = ok ? t('copied') : ''; });
    });
    share.appendChild(copy);
    card.appendChild(share);
    card.appendChild(status);
    // Sosyal medya bağlantıları sitenin alt bilgisinde zaten var; modalda tekrarlanmaz.
  }
  function openApp(app) {
    if (!card) {
      card = el('div', 'ew-app', { lang: LABEL_LANG[LANG] || 'ug', dir: RTL_LANG ? 'rtl' : 'ltr' });
      body.insertBefore(card, body.firstChild);
    }
    // Başlık: uygulamanın adı + X düğmesi. Sitenin modalında başlık yok; gövde kayarken yerinde kalır.
    if (!head) {
      head = el('div', 'ew-modal-head');
      headTitle = el('div', 'ew-modal-title');
      var x = el('button', 'ew-modal-close', { type: 'button', 'data-bs-dismiss': 'modal', 'aria-label': t('close') });
      x.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
      head.appendChild(headTitle);
      head.appendChild(x);
      body.parentNode.insertBefore(head, body);
    }
    head.setAttribute('dir', RTL_LANG ? 'rtl' : 'ltr');
    head.setAttribute('lang', LABEL_LANG[LANG] || 'ug');
    headTitle.textContent = loc(app.title);
    head.style.display = '';
    renderApp(app);
    native = true;
    frame.style.display = 'none';
    card.style.display = '';
    if (window.jQuery && window.jQuery.fn && window.jQuery.fn.modal) window.jQuery(modal).modal('show');
    else if (window.bootstrap && window.bootstrap.Modal) window.bootstrap.Modal.getOrCreateInstance(modal).show();
  }
  // Sitenin kendi tıklama işleyicisi (iframe'e popup.php?id=N yazar) yerine kartı aç.
  doc.addEventListener('click', function (e) {
    var target = e.target;
    var item = target && target.closest && target.closest('.apps .item');
    var m = item && /(?:^|\s)app(\d+)(?=\s|$)/.exec(item.className || '');
    var app = m && findApp(parseInt(m[1], 10));
    if (!app) return;                              // veri yok: iframe akışı
    e.preventDefault();
    e.stopImmediatePropagation();
    openApp(app);
  }, true);

  modal.addEventListener('show.bs.modal', function () {
    if (native) return;                            // kart açılıyor: iframe/yükleyici yok
    frame.style.display = '';
    if (card) card.style.display = 'none';
    if (head) head.style.display = 'none';
    frame.style.height = BASE_H + 'px';
    show();
  });
  modal.addEventListener('hidden.bs.modal', function () { hide(); native = false; });
});

/* ------------------------------------------------------------------ */
/* 7. FOOTER — sosyal ikonlar: sırayla beliriş                          */
/* ------------------------------------------------------------------ */
safe('social', function () {
  var icons = $$('.footer-social .social-icon');
  // Sosyal medya simgeleri: sitedeki düşük çözünürlüklü ve kenarları bozuk PNG/JPG'ler yerine
  // her platform için temiz, keskin vektörel SVG'ler ve resmi marka renkleri uygulanır.
  var svgs = {
    yt: '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true" focusable="false"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true" focusable="false"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    fb: '<svg viewBox="0 0 24 24" width="25" height="25" fill="currentColor" aria-hidden="true" focusable="false"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
    ig: '<svg viewBox="0 0 24 24" width="25" height="25" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
    li: '<svg viewBox="0 0 24 24" width="23" height="23" fill="currentColor" aria-hidden="true" focusable="false"><path d="M6.94 5a2 2 0 1 1-4-.002 2 2 0 0 1 4 .002zM7 8.48H3V21h4V8.48zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.68-2.91V8.48z"/></svg>',
    wa: '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true" focusable="false"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>'
  };
  var bgs = {
    yt: '#ff0000',
    x: '#000000',
    fb: '#1877f2',
    ig: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%)',
    li: '#0a66c2',
    wa: '#25d366'
  };

  icons.forEach(function (a) {
    for (var key in svgs) {
      if (new RegExp('\\b' + key + '\\b').test(a.className)) {
        if (a.querySelector('img') || !a.querySelector('svg')) {
          a.innerHTML = svgs[key];
        }
        a.style.background = bgs[key];
        break;
      }
    }
  });
  icons.forEach(function (a, i) {
    a.style.setProperty('--i', i);
    a.addEventListener('animationend', function () { a.classList.add('ew-done'); });
  });
  if (MOTION) revealOnScroll(icons, .3);
});
}) ();
