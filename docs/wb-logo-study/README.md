# WB crossover study

Review `index.html` locally. The crossover proposal was approved and promoted to `assets/brand/wb.svg`.
The original raster is frozen in `original.png` to preserve this comparison.

The design thesis is to make Wesley's WB monogram immediately readable while
retaining its angular, interlocking ribbon construction. The W's central
downstroke passes in front of the B spine; the shapes rejoin at the lower foot.
The B's final rising arm remains shared with the W.

## Files

- `wb-crossover.svg`: preferred draft, transparent background, four named paths
  with an explicit SVG mask describing the crossover. Recolor through the root
  `color` attribute. No embedded raster, fonts, or external dependencies.
- `wb-joined.svg`: the same coordinates with the separating reveal removed.
- `construction.svg`: gold W, teal B, 64-unit grid, key x/y handles.
- `portavec-trace.svg`: actual Portavec output from the original raster.
- `faithful-trace.svg`: six-component coordinate cleanup of that original.
- `trace-metrics.json`: pipeline parameters and extracted contour coordinates.
- `comparison.png` / `mobile.png`: Chromium review captures.

## Geometry

Coordinates use the original 512 × 512 canvas. The B's three polygons retain
the original geometry to approximately one pixel. The rewritten W is:

```svg
M63 128H128L177 319L212 210H242L300 395H260L228 295L195 395H134Z
```

The central crest spans `(212,210)` to `(242,210)`. The internal lower notch
is `(228,295)`; the second foot spans `(260,395)` to `(300,395)`. The mask
subtracts a 10-unit outline around the foreground W from the B, leaving a
five-unit reveal outside its edge. The B is restored below `y=338` to join
the foot. The original B counter floor is `y=337`.

Rebuild SVGs and trace data from the site root:

```sh
../portavec/node_modules/.bin/tsx tools/build-wb-study.ts
```

Requires the adjacent Portavec checkout and its existing dependencies. The
study used Portavec revision `0b91cc7`, with its algorithm files unchanged.
The generator reads `original.png`, inverts it, then calls `runPipeline` with
manual threshold 55, polyline fitting, and tolerance 1.4. This deliberately
excludes the background texture and the gray corner sparkle. It does not
alter the original raster. All generated art is deterministic; screenshots
are separate browser captures.

## Review evidence

- Portavec extracted 6 contours, 701 points, and 35 fitted line segments.
- At 512 px, foreground intersection-over-union against the original (RGB
  cutoff 200 on black): raw Portavec 0.97471; coordinate cleanup 0.98295.
  These numbers establish trace fidelity, not subjective letter recognition.
- Inspected Chromium renders at 1100 × 1100 and 390 × 844. All images load;
  no horizontal overflow at either viewport. Desktop sample rows align.
- Compared 16, 22, 32, 48, and 64 px samples. The W's silhouette is clearer
  to the author; the narrow overpass reveal becomes subpixel at favicon sizes.
  `wb-joined.svg` is a useful small-size alternative. Human preference remains
  the deciding criterion for the final identity.
- Both comparison controls, the changing SVG download target, the coordinate
  disclosure, and Space-key checkbox operation were exercised. No motion.
- The shape no longer depends on a detached kite to suggest the W. Trials
  that merely tidied the original slash still read as a V and were discarded.

## Review surface decisions

Original → proposal → real-size samples → optional construction is the reading
order. Two desktop columns become a vertical comparison on mobile. Native
checkboxes and disclosure preserve keyboard access, with explicit focus rings.
The comparison itself is the signature element; no decorative badge is added.

Palette: paper `#f1eee6`, ink `#252522`, secondary text `#626660`, links/focus
`#226c59`, dividers `#d6d3ca`, preview ground `#0b0b0b`. The construction diagram
alone adds W gold `#f4c56c` and B teal `#79d5ca`. Display type is Georgia; body
and controls use system sans; coordinate labels use monospace. There is no
status workflow. Body/link text contrast against paper exceeds 4.5:1.
