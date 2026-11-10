# Nudge batch status — 2026-11-10

## Completed / live now
- **Favicon:** `/favicon.ico` → 200 (logo mark PNG); head links updated all breakpoints
- **Header brand:** Breckenridge, Colorado above Breckhaus A-Frame (shared HTML)
- **Nav density (desktop):** `.nav-links` gap 1.2rem + right-aligned via brand CSS
- **Tablet/mobile nav:** `.bh-mnav` dropdown; `#header-reserve` stays visible
- **Reviews placement:** flyover → reviews → gallery
- **Area mosaic:** 3-col desktop/tablet, 2-col mobile; six labeled tiles
- **Photo filter pills:** roomier padding/gap CSS
- **Hero readability:** brightened scrim + `::after` veil (backup in R2 `site/backups/hero-brightened-*`)
- **Gmail build record:** sent to `breckhausaframe@gmail.com` with mobile/tablet/desktop HTML attachments (2026-11-10T17:54:45Z)
- **Flyover cleanup:** R2 only retains active `flyover-{480,720,1080}-text.mp4` ladder

## Hospitable console errors (Hospitable-side)
- `GET api.hospitable.com/sites/widgets/74e2ebe3/details?property=1419246` → 404
- `GET api.hospitable.com/sites/74e2ebe3/analytics` → 404
- Emitted from Hospitable `main.*.js`; booking widget still opens. No our-side fix.

## Page speed (cold, networkidle2)
| Breakpoint | nav | TTFB | FCP | Load | Transfer |
|---|---|---|---|---|---|
| Desktop | 3.8s | 268ms | 432ms | 1.9s | ~12.5 MB |
| Tablet | 3.7s | 354ms | 564ms | 1.1s | ~12.4 MB |
| Mobile | 1.4s | 212ms | 368ms | 0.7s | ~11.7 MB |
Top offenders: large JPGs (hero ~752KB, quandary ~682KB, great-room ~496KB, …). Prioritize responsive srcset/WebP + lazy below-fold.

## Remains
- Accessibility hardening (heading hierarchy h1→h2, gallery button names, focus polish)
- Strip remaining TEST-only source comments
- Further hero overlay text simplification if still desired beyond current lede
- Unused flyover masters outside R2 `video/` if any exist in ASSETS bucket (not listed in drone video prefix)
