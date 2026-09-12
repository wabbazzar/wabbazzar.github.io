# wabbazzar.github.io

Minimalist portfolio site with a dark theme and electric blue accents.

## Development

```bash
# Start development server
make serve

# Run visual tests
make visual-test

# Debug render issues
make debug-render
```

## Brand assets

The approved WB crossover is `assets/brand/wb.svg`. Run `make brand-assets`
(Node + Playwright/Chromium) after changing it to regenerate the PNG/SVG/ICO
favicons, Apple icon, standard and maskable PWA icons, icon tile, and 1200×630
share image. Maskable exports scale the mark to 88% to fit the circular safe
area. Headers use the canonical SVG directly.

When replacing the mark, advance the `?v=wb1` references and service-worker
version together. The original logo is archived in
`docs/wb-logo-study/original.png`; that comparison must not read a live icon.
The Shipyard article is mirrored from `shipyard/docs/index.html`; its favicon
reference must also change at that source to survive the next mirror sync.

## Tech Stack

- Pure HTML5 & CSS3
- Inter font family
- No JavaScript framework required

## Design

- Pure black (#000) background
- White text with electric blue (#00D4FF) hover states
- Mobile-first responsive design
- Optimized for fast loading
