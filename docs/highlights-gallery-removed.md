# Highlights gallery removal

## Removed
- Entire photo gallery group `#gallery-highlights` / `.gallery-group.gallery-highlights`
- Markup size: 5441 bytes
- Title: Highlights
- Carousel of 12 shots (images themselves retained — reused by other gallery groups)

### Image refs that were in Highlights (files kept)
- img/hero-poster.jpg
- img/looking-up-to-loft.jpg
- img/kitchen-wide.jpg
- img/king-primary-east-bc47.jpg
- img/king-barn.jpg
- img/bunk-bc47.jpg
- img/bath-primary-bc47.jpg
- img/loft-looking-west.jpg
- img/hottub-quandary-bc34.jpg
- img/sauna-barrel-bc36.jpg
- img/aframe-side-sauna-bc36.jpg
- img/airbnb-exterior-twilight-snow.jpg

## Where it lived
- Live Worker static asset `index.html` (ASSETS) for `breckhaus-basecamp-test` — this was the only source that still contained the group
- One responsive HTML file serves mobile / tablet / desktop (CSS breakpoints), so there were not separate device HTML files to edit
- Repo `index.html` / `index3.html` never contained this photo Highlights group (only amenity `.am-group-highlight` Standout Features, which was left alone)

## What replaced it
- Cleaned `index.html` (hash `e0e1dbfef17a73e82563b9ad6fb88262`, 214156 bytes) stored at R2 `breckhaus-drone` key `site/index-no-highlights.html`
- Worker now serves that R2 object for `/` and `/index.html` (`X-BH-Index-Source: r2-clean`)
- Worker also strips any leftover `#gallery-highlights` block if an old ASSETS HTML were ever served
- Removed Worker CSS hide (`bh-hide-highlights`) and temp `/__agent/raw-assets` dump route

## Remaining gallery groups
Exterior; Deck, hot tub & sauna; Living & kitchen; Bedrooms; Baths; The loft; Around the home
