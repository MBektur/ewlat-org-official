# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The user communicates in Turkish; reply in Turkish. README.md is in Turkish and is the user-facing install guide — keep it in sync when behavior changes.

## What this repo is

A drop-in animation/interaction layer for **ewlat.org**, a PHP + Bootstrap 5 (RTL) + jQuery site whose source is **not** in this repo. Nothing here modifies the site's own code; production install is two lines in the site's `index.php` (stylesheet after `app.css`, `motion.js` with `defer` before `</body>`) plus uploading the deliverables.

**There is no build step and Node is not needed.** CSS, JS and JSON are hand-written and served as-is. (The project used to compile Tailwind; that was removed on purpose — the site is simple, do not reintroduce a bundler or a CSS build.)

Deliverables (the only things that ship to ewlat.org):
- `assets/css/motion.css` — plain CSS, edited directly
- `assets/js/motion.js` — all behavior, vanilla JS, no dependencies
- `assets/data/ui.json` — UI data: `wheel.items[]` (one per wheel entry: per-language `label`, optional `href`/`icon` for entries that have no markup on the site), `wheel.slotsPerItem` (`normal: 2`, `compact: 1`) and `strings` (UI texts, incl. `hubTitle` = the text under the boy) and `calendar` (Hijri/Gregorian month and weekday names plus date formats per language/script). All text values are per-language maps `{ug,ul,uc,tr,en,ar}`; a missing language falls back to `ug`
- `assets/data/apps.json` — the 7 app detail cards (`name`, `title`, `description`, `downloads[].label` are per-language maps; plus image, store/website links, site social links). Edit this file to change app content, not the page
- `assets/images/apps/` — app icons (`1.png`…`7.png`) and store badges (`ios.png`, `android.png`)
- `assets/fonts/UKIJEkran.ttf` — UKIJ Ekran font used by the app cards (`@font-face` 'EwUKIJ' in `motion.css`)
- `assets/images/wheel/` — generated Ferris-wheel parts (`ring.webp` = 24 identical wedges, `icon-N.png`, `hub.png`, `legs.png`, `head.png`) and `wheel.json` (positions/radii and `hubText` = where the hub title sits, **read directly by motion.js**)

The live site itself only translates the tagline, the language picker and the dates (per `?lang=`). App names under the icons, card texts, the "apps" heading, the modal close button, wheel labels and all UI strings are translated by motion.js from `ui.json` / `apps.json`. The ul/uc/tr/en/ar texts are drafts that a native editor should review.

The live site's `<meta name="viewport" content="width=1120">` forces phones to render a scaled-down desktop page (huge empty area below the footer). `preview/index.html` uses `width=device-width, initial-scale=1`, which activates `app.css`'s own mobile rules; the same one-line change is needed in production `index.php`.

`preview/` is a local mirror of the live homepage (`preview/index.html` + the site's own assets in `preview/assets/`) that loads the deliverables via `../assets/...`. It exists only for testing. Its inline script reads `?lang=` into `pageLang` (the live PHP does that in production) and replicates the tagline translation and picker label; the rest of the mirror stays Uyghur because the live site doesn't translate it either.

## Running / testing

```bash
python3 -m http.server 8080     # from the repo root → http://localhost:8080/preview/?lang=tr
```

Any static server works (data is loaded with `fetch`, so `file://` does not). The old app modal iframe fallback (`popup.php?id=N`, served by ewlat.org with `X-Frame-Options: SAMEORIGIN`) only works on Vercel (`vercel.json` rewrite); locally it shows an empty modal, but the native cards replace it whenever `apps.json` loads.

There are no tests or linter. `node --check assets/js/motion.js` catches syntax errors. Verify visually in a browser (desktop, a <1023px window, mobile emulation, `prefers-reduced-motion: reduce`, and a few `?lang=` values). Headless Chrome cannot go below ~500px wide.

`preview/index.html` includes the deliverables as `motion.css?v=N` / `motion.js?v=N` — bump `N` when they change so browsers don't serve stale copies (`SCRIPT_BASE` tolerates the query string). Data/assets use `ASSET_V` in motion.js the same way (bump when `ui.json`, `apps.json`-adjacent assets or anything in `assets/images/wheel/` changes).

Deployment of the preview: Vercel (`vercel.json`) runs no install/build step — it just copies `preview/` and `assets/` into `dist/` (git-ignored, regenerated on deploy).

## CSS architecture (`assets/css/motion.css`)

- Everything is **unlayered, class-based** CSS with an `ew-` prefix. The site's `app.css` has `* { margin: 0; padding: 0 }` and Bootstrap has `button { border-radius: 0 }`; a class selector beats both, so padding/margin/radius on JS-created elements just work. Where the site has a class rule to beat (`.mbtn:hover { transform: scale(.7) }`, `.menu_item_N`, `.icon`, `.modal`, `.chislaDiv`) the selector is strengthened with `html.ew-js …`.
- JS-created elements carry `ew-*` classes (see `assets/js/motion.js`); state is toggled with classes (`ew-on`, `ew-show`, `ew-ready`, `ew-in`). Where JS sets an inline `transform`, hover/active effects use the individual `scale`/`rotate`/`translate` properties so they compose (`.ew-arrow:hover { scale: 1.1 }`).
- Everything that moves is gated on `html.ew-motion`; with JS off or reduced motion the page looks like the original site.
- Scope overrides narrowly: e.g. `.menu > img:first-of-type` (not `.menu > img`), otherwise they hit images the JS appends.

## JS architecture (`assets/js/motion.js`)

- Single IIFE. Each feature is a `safe('name', fn)` module wrapped in try/catch so one failure can't break the site or other modules.
- On load it adds `html.ew-js`, and `html.ew-motion` only when `prefers-reduced-motion` is not `reduce`.
- `LANG` comes from the page's global `pageLang` (ug/ul/uc/tr/en/ar). `loc(map)` picks the current language from a per-language map (fallback `ug`); `t(key)` reads `UI.strings`.
- Data loading: `dataReady` fetches `assets/data/ui.json` (→ `UI`) and `assets/images/wheel/wheel.json` (→ `WHEEL`) in parallel; modules that need them run inside `whenData(fn, name)`. If either fails, the wheel is not built and the site keeps its original menu; the app modal falls back to the iframe. `t()` returns `''` until `UI` is loaded.
- Asset URLs are derived from the script's own URL (`SCRIPT_BASE` via `document.currentScript`), so the same file works on production and in `preview/`.

### The Ferris wheel (menu module) — read before touching the menu

The original menu is a single image (`menu.png`, 1409×701) with transparent absolutely-positioned link hotspots (`.menu_item_N` / `.mbtn`, positions from the site's `app.css`). The wheel replaces its visuals while reusing the site's own link elements. **It is data-driven**: the number of entries is `UI.wheel.items.length` (`N`), slots = `N × slotsPerItem` (24 on desktop, 12 compact for N = 12), and slot angle, logo positions, ring wedges and the hover sector are all derived from that — adding an entry needs no code or image generation.

- Entry `i` ↔ `btns[i]`: the site's `.mbtn` if the page has one, otherwise `createBtn(i)` builds one from `items[i].href`. Logo image: `icon-i.png` (menu.png crops, circle coordinates in `WHEEL.icons[i]`) or, for new entries, `items[i].icon` (square PNG in `assets/images/wheel/`, drawn with `background-size: cover`).
- `menu.png` stays in the DOM for layout but is hidden (`img.ew-center`); `hub.png` (crescent + boy, with lower legs, head **and the baked-in "ئەۋلاد گۇرۇپپىسى" text removed**) is shown in its place — the text is drawn as real, per-language text (`.ew-hubtext`, `strings.hubTitle`, size fitted to `wheel.json → hubText`) — with `legs.png` swinging from the knee and `head.png` tilting at the neck (CSS keyframes `ew-legs`, `ew-head`; pivots from `WHEEL.knee`/`WHEEL.neck`).
- `.ew-wheel` contains the ring and the hover sector and rotates via the CSS variable `--ew-a`.
- Ring texture: `ring.webp` is 24 identical wedges. For 24 slots it is used as an `<img>`; for any other slot count `makeRing()` warps one source wedge polar-wise onto a canvas (1440px, 1024px compact) — no generated per-count files. Wedge separators must match logo spacing: each logo sits at its wedge's center (`SLOT_DEG / 2 + SLOT_DEG * j`). If canvas reading fails it falls back to the 24-wedge image.
- Hover: the **logo has no hover effect** (the site's `.mbtn:hover` shrink is neutralized in CSS). Instead the wedge under the pointer is darkened: pointer polar angle − wheel angle → wedge index → an SVG path (`.ew-sector`, drawn inside `.ew-wheel`, recomputed every frame). Wedge `j` spans `−(j+1)·S … −j·S` in the unrotated screen angle.
- Cabins (`.ew-cabin`): each entry appears `slotsPerItem` times (extra ones are `cloneNode` copies, `aria-hidden`, `tabindex=-1`) so all entries are visible in the upper half. Each cabin = round logo (`.ew-slice`) + a real-text label from `items[i].label`. Cabins are positioned every frame on a circle and swing with a damped pendulum model (`G`, `DAMP`, `MAXPHI`, `INERTIA`, `WIND`); rotation speed `AUTO`, arrow-button behavior `STEER_SPEED`/`KICK`. The site's original `.mbtn` elements are **moved** into the cabins (links keep working).
- Coordinates: the menu is designed at 1120px CSS width; everything scales by `s = menuWidth / 1120`. Band radii `R_HUB`/`R_EDGE` come from `wheel.json → ring`. The wheel center is 3.5 image-px below `menu.png`'s bottom edge. Clipping to the upper half is done by a wrapper the size of the menu (`.ew-clip`). The semicircle must touch the hero's bottom edge on every width: the site's `@media (max-width:1023px) .top { padding-bottom: 10px }` left a gap, so wheel mode adds `.ew-wheel-top` to `.top` (zero bottom padding) and `menu.png` becomes `display:block`; the clip height is `ceil` of the image's real (fractional) height, not `clientHeight`.
- `COMPACT` mode (menu narrower than 700px, i.e. phones): each entry once (30° for 12 entries), logos/labels ~1.55× larger (`Z`). The upper half is shown (`FULL = false`), same as desktop. `FULL = true` would instead show the **whole circle** (hub group shifted down by `HUB_DY`); disabled on purpose — the user asked for the half circle on phones too.
- Arrow buttons and the "see all" pill are appended to `.top`, **not** `.menu`: below 1023px the site's `app.css` sets `.menu { overflow: hidden }`, which would clip them. They're positioned from `menu.offsetLeft` / `top.offsetHeight` and re-laid out via a `ResizeObserver` on `.top`.
- "See all" (`openSites`): the pill button or a transparent `.ew-hubbtn` over the boy/crescent opens a custom dialog (not Bootstrap's modal) listing all entries as cards (logo, label, hostname; entries without a link get a "soon" badge). Built lazily; Esc/backdrop/close button.
- If a wheel asset fails to load, or `ui.json`/`wheel.json` is missing, or reduced motion is on, `staticMode()` leaves the original menu image untouched.

The modal module renders app cards from `assets/data/apps.json` instead of the site's `popup.php?id=N` iframe: a capture-phase click listener on `.apps .item.appN` stops the site's own jQuery handler and opens the card via `jQuery(modal).modal('show')`. Under the icons it also rewrites the app names, the "apps" heading and the modal close button for non-`ug` languages. If the JSON is missing or the id is unknown, the original iframe flow runs unchanged (the iframe is resized to its content only same-origin). Share buttons use the stable `popup.php?id=N` URL. The modal gets a header added by JS (`.ew-modal-head`: app title + X, only in card mode; the site's modal has none); the body scrolls while header/footer stay visible.

### Dates (`dates` module)

The site's own `initDates()` mishandles `ul`/`uc` (falls into the Arabic-script branch) and leaves a stray bidi dot in LTR languages. The `dates` module rewrites `.chisla-ar` (Hijri, via the site's `UQCal`) and `.chisla-ug` (Gregorian) after the site's code ran (on data load and on `load`) from `ui.json → calendar`, and sets `dir`/`lang` on both. Add a language by adding its month/weekday arrays and the two formats.

### Adding a wheel entry

Append `{ "label": { "ug": "…", "tr": "…", … }, "href": "https://…", "icon": "icon-12.png" }` to `wheel.items` in `assets/data/ui.json` (put the square PNG in `assets/images/wheel/`), then bump `ASSET_V` in `motion.js`. Nothing else: slot count, angles, ring wedges, labels and the "see all" dialog follow. Entries beyond the site's own `.mbtn` markup get their link from `href` (omit it for a "soon" entry).

### Regenerating wheel assets (rare)

Only needed if `menu.png` changes. `tools/wheel/build-wheel.mjs` (its own `package.json`; the repo root has none) extracts everything from `preview/assets/images/menu.png`: detects icon circles by edge-scan + circle fit, rebuilds a clean wedge texture (icons/labels inpainted) into `ring.webp`, cuts out legs/head and repaints the crescent behind them from a fitted two-circle crescent model, and writes `wheel.json`.
1. `cd tools/wheel && npm install` (once), then from the repo root `node tools/wheel/build-wheel.mjs`
2. Bump `ASSET_V` in `motion.js`. (`wheel.json` is read by motion.js directly; there is nothing to copy.)
