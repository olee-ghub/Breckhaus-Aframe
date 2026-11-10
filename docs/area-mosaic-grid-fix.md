# Area mosaic 3-column grid fix

## Cause
At `min-width: 1280px`, global gallery CSS sets `.mosaic .s4 { grid-column: span 4 }` for the 12-column photo mosaics. The area strip (`.around .mosaic`) is only a 3-column grid, so `span 4` forced each tile full-width (stacked ultra-wide rows).

A Worker inject that applied the labeled `bh-area-mosaic` markup/CSS was also skipped once a style id was already present in R2 HTML, leaving a plain `.mosaic` without the column reset.

## Fix
- `bh-area-around-v3` CSS: force 3 columns from 768px up, `grid-column: auto !important` on `.around .mosaic` / `.bh-area-mosaic` shots
- Worker inject updated to keep that CSS and restore the six labeled area photos when missing
- R2 `site/index-no-highlights.html` updated with the six-photo mosaic + v3 CSS

## Verify
Desktop/tablet: 3 columns × 2 rows. Mobile: 2 columns × 3 rows.
