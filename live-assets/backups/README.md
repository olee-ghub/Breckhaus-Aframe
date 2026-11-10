# Live treatment backups

## hero-brightened-scrim-v1.css
Brightened hero scrim (`bh-hero-scrim-v1`) saved before the readability veil (`bh-hero-read-veil-v1`).

Also stored in R2 bucket `breckhaus-drone`:
- `site/backups/hero-brightened-scrim-v1.css`
- `site/backups/hero-brightened-treatment-2026-11-10.json`

To revert the brightening itself, re-inject this CSS as `#bh-hero-scrim-v1`.
To remove only the later readability veil, drop `#bh-hero-read-veil-v1` from the Worker injects.
