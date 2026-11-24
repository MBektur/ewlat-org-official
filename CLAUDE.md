# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The user communicates in Turkish; reply in Turkish. README.md is in Turkish and is the user-facing install guide — keep it in sync when behavior changes.

## What this repo is

A drop-in animation/interaction layer for **ewlat.org**, a PHP + Bootstrap 5 (RTL) + jQuery site whose source is **not** in this repo. Nothing here modifies the site's own code; production install is two lines in the site's `index.php` (stylesheet after `app.css`, `motion.js` with `defer` before `</body>`) plus uploading the deliverables.

Deliverables (the only things that ship to ewlat.org):
- `assets/css/motion.css` — **compiled** output of `src/motion.css` (never edit by hand)
- `assets/js/motion.js` — all behavior, vanilla JS, no dependencies
- `assets/images/wheel/` — generated Ferris-wheel parts (`ring.webp`, `icon-N.png`, `hub.png`, `legs.png`, `head.png`, `wheel.json`)

The live site's `<meta name="viewport" content="width=1120">` forces phones to render a scaled-down desktop page (huge empty area below the footer). `preview/index.html` uses `width=device-width, initial-scale=1`, which activates `app.css`'s own mobile rules; the same one-line change is needed in production `index.php`.

`preview/` is a local mirror of the live homepage (`preview/index.html` + the site's own assets in `preview/assets/`) that loads the deliverables via `../assets/...`. It exists only for testing. The app-icon modal iframes `popup.php?id=N`, which ewlat.org serves with `X-Frame-Options: SAMEORIGIN`, so the preview must serve it from its own origin: `tools/serve.mjs` proxies it locally and `vercel.json` has a matching `rewrites` rule. A plain static server (e.g. `python -m http.server`) shows an empty modal.

## Commands

```bash
npm run build     # src/motion.css → assets/css/motion.css (minified). Required after ANY change to src/motion.css or to tw: classes in motion.js
npm run dev       # same, watch mode
npm run wheel     # menu.png → assets/images/wheel/* (tools/build-wheel.mjs; uses pngjs + sharp)
npm run preview   # tools/serve.mjs on :8080 (PORT=… to change) → http://localhost:8080/preview/; proxies popup.php to ewlat.org
```

There are no tests or linter. `node --check assets/js/motion.js` catches syntax errors. Verify visually in a browser (desktop, a <1023px window, mobile emulation, and with `prefers-reduced-motion: reduce`).

`preview/index.html` includes the deliverables as `motion.css?v=N` / `motion.js?v=N` — bump `N` when they change so browsers don't serve stale copies (`SCRIPT_BASE` tolerates the query string).

Deployment of the preview: Vercel (`vercel.json`) runs no install/build step — it just copies `preview/` and `assets/` into `dist/`. So the compiled `assets/css/motion.css` and generated wheel assets must be committed.

## CSS architecture (Tailwind v4) — the non-obvious rules

- `src/motion.css` imports only Tailwind's theme + utilities: **no preflight** (it would wreck Bootstrap) and every utility is prefixed **`tw:`** (e.g. `tw:absolute`, `tw:motion-safe:animate-ew-spin`).
- Tailwind scans **only** `assets/js/motion.js` (`@source`). Utility classes must appear literally in that file; JS-created elements get their styling this way.
- Tailwind utilities live in a cascade **layer**, so any **unlayered** site CSS (Bootstrap, `app.css`, inline `<style>`) beats them regardless of specificity. Anything that must override the site's existing selectors (`.mbtn`, `.icon`, `.modal`, `.chislaDiv`, Bootstrap's `button { border-radius: 0 }`, …) is written as plain unlayered CSS in `src/motion.css`. If a `tw:` class "doesn't apply", this is usually why.
- The site's `app.css` has an unlayered `* { margin: 0; padding: 0 }`, so **`tw:p-*` / `tw:m-*` utilities never apply** — give padding/margin to JS-created elements via hook classes in unlayered CSS (see `.ew-sites-*`, `.ew-seeall`). Same for `border-radius` on `<button>` (Bootstrap reboot) and colors on `<a>`.
- Scope overrides narrowly: e.g. `.menu > img:first-of-type` (not `.menu > img`), otherwise they hit images the JS appends.
- Never write `*/` inside a CSS comment (e.g. "p-*/m-*") — it ends the comment and `npm run build` fails (the CLI then prints only a box-drawing line; check for "Done").
- Custom keyframes/animations are declared in `@theme` (→ `tw:animate-ew-*`) or as plain `@keyframes` for unlayered rules.

## JS architecture (`assets/js/motion.js`)

- Single IIFE. Each feature is a `safe('name', fn)` module wrapped in try/catch so one failure can't break the site or other modules.
- On load it adds `html.ew-js`, and `html.ew-motion` only when `prefers-reduced-motion` is not `reduce`. All hidden-initial-state/animation CSS is gated on `html.ew-motion`, so with JS off or reduced motion the page looks like the original site.
- `LANG` comes from the page's global `pageLang` (ug/ul/uc/tr/en/ar); UI strings live in `I18N`.
- Asset URLs are derived from the script's own URL (`SCRIPT_BASE` via `document.currentScript`), so the same file works on production and in `preview/`.

### The Ferris wheel (menu module) — read before touching the menu

The original menu is a single image (`menu.png`, 1409×701) with 12 transparent absolutely-positioned link hotspots (`.menu_item_0…11` / `.mbtn`, positions from the site's `app.css`). The wheel replaces its visuals while reusing the site's own link elements:

- `menu.png` stays in the DOM for layout but is hidden (`img.ew-center`); `hub.png` (crescent + boy, with lower legs and head removed) is shown in its place, with `legs.png` swinging from the knee and `head.png` tilting at the neck (CSS keyframes `ew-legs`, `ew-head`; pivots set as `transform-origin` from `WHEEL.knee`/`WHEEL.neck`).
- `.ew-wheel` contains `ring.webp` and rotates via the CSS variable `--ew-a`.
- 24 "cabins" (each of the 12 links appears twice, opposite each other, so all 12 are visible in the upper half). The original `.mbtn` elements are **moved** into the first 12 cabins (links keep working); the other 12 are clones with `aria-hidden` and `tabindex=-1`. Each cabin = round logo (`.ew-slice` background = `icon-N.png`) + a real-text label from `WHEEL.labels`. Cabins are positioned every frame on a circle and swing with a damped pendulum physics model (`G`, `DAMP`, `MAXPHI`, `INERTIA`, `WIND`); rotation speed `AUTO`, arrow-button behavior `STEER_SPEED`/`KICK`.
- Coordinates: the menu is designed at 1120px CSS width; everything scales by `s = menuWidth / 1120`. The wheel center is 3.5 image-px below `menu.png`'s bottom edge. Clipping to the upper half is done by a wrapper the size of the menu.
- `COMPACT` mode (menu narrower than 700px, i.e. phones): 12 slots at 30° (each link once, no clones), logos/labels ~1.55× larger (`Z`), and `FULL` = the **whole circle** is shown instead of the upper half: `.menu`/clip height becomes `W`, and the hub group (hub/legs/head sprites, halo, `.ew-hubbtn`) is shifted down by `HUB_DY` (menu.png px) to the circle's center. So all 12 logos are visible at once.
- Wedge separators must match logo spacing: each logo sits at its wedge's center (`SLOT_DEG / 2 + SLOT_DEG * j`). So there are two rings — `ring.webp` (24 wedges) for normal mode and `ring-12.webp` (12 wedges) for `COMPACT`; the tool generates both and the slot counts must stay in sync.
- Arrow buttons and the "see all" pill are appended to `.top`, **not** `.menu`: below 1023px the site's `app.css` sets `.menu { overflow: hidden }`, which would clip them. They're positioned from `menu.offsetLeft` / `top.offsetHeight` and re-laid out via a `ResizeObserver` on `.top`.
- "See all" (`openSites`): the pill button or a transparent `.ew-hubbtn` over the boy/crescent opens a custom dialog (not Bootstrap's modal) listing all 12 links as cards (logo `icon-N.png`, `WHEEL.labels`, hostname; the link-less item gets a "soon" badge). Built lazily; Esc/backdrop/close button; works in static mode too.
- If any wheel asset fails to load (or reduced motion), `staticMode()` keeps the original menu image with hover effects.

The modal module also resizes the site's fixed-height (440px) popup iframe to its content (capped to the viewport) on load — only possible same-origin, i.e. on production or through the preview proxy.

### Regenerating wheel assets

`tools/build-wheel.mjs` extracts everything from `preview/assets/images/menu.png`: detects icon circles by edge-scan + circle fit, rebuilds a clean wedge texture (icons/labels inpainted) into `ring.webp`, cuts out legs/head and repaints the crescent behind them from a fitted two-circle crescent model. When changing it or `menu.png`:
1. `npm run wheel`
2. Copy the relevant values from `assets/images/wheel/wheel.json` into the `WHEEL` constant in `motion.js` (icons, hub, legs/knee, head/neck).
3. `RING_INNER`/`RING_OUTER` in the tool must equal `R_HUB`/`R_EDGE` in `motion.js`.
4. Bump `ASSET_V` in `motion.js` (cache-busting query on all wheel assets).
