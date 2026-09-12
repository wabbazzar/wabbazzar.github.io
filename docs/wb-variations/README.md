# Five WB directions

These are review proposals, not replacements for the approved live mark.
Open `index.html` to compare the six silhouettes and toggle gold W / teal B
construction. PNGs provide portable previews; SVGs retain exact editable paths.

The brief separates two decisions: whether the W reaches the B's outside,
and whether its diagonals use a consistent grid. The baseline's rising W edge
is about 70.4°, while the upper B cleft is about 55.1° and the lower is about
59.2°. Those inherited differences are the problem this study explores.

| Version | Reach | Ascending diagonal family | Intent |
| --- | --- | --- | --- |
| 00 | Inner spine | Original mixed angles | Approved live reference |
| 01 | Inner spine | 70.388°; dx/dy = 62/174 | Narrow, upright parallel cuts |
| 02 | Inner spine | 60°; dx/dy = 1/√3 | Broader, paired B chevrons |
| 03 | Outer bowl | Original B retained | Isolate the longer W arm |
| 04 | Outer bowl | 56.310°; dx/dy = 2/3 | Combine reach and a rational grid |
| 05 | Outer bowl | 45°; dx/dy = 1 | Wider, more abstract lattice |

01, 02, 04, and 05 also use parallel 75° W downstrokes. Their B descending
folds use a repeated dx/dy ratio: 3/4 for 01 and 04, 1/√3 for 02, and 1 for
05. The intent is a small deliberate set of angle families, not forcing every
stroke of two different letters to the same inclination. 03 deliberately
preserves the old B, so it is not an angle-normalized proposal.

The B is masked behind the foreground W with a five-unit reveal; the lower
heel rejoins at y=338. A separate negative-space mask keeps B fragments out of
the W notch. 05 uses a uniform 0.79 scale to accommodate its wider proportions
within the same 512-square comparison frame; it is not horizontally squashed.

Regenerate the vectors, PNGs, review HTML, and `geometry.json`:

```sh
node tools/build-wb-variations.mjs
```

This uses the adjacent environment's Playwright/Chromium. Comparison and
construction contact sheets are separate browser screenshots at 1320 px.

Verification: measured every ascending polygon edge in the four normalized
versions against its declared ratio, with tolerance 0.0001 after coordinate
rounding. All 34 edges passed (8, 8, 9, 9). Browser review at 1320×1600 and
390×844 found no horizontal overflow or unloaded images; construction toggle
and Space-key operation passed. Examined 22, 32, and 64 px samples. Fine reveal
gaps still become subpixel at the smallest sizes; readability is a visual
judgment, not proved by the angle checks.

My preference is 03 for retaining the familiar character, or 04 if the longer
arm and disciplined diagonal family should both define the final identity.
01's steeper clefts narrow the B; 05 is the most radical and least compact.

Review surface: the live baseline starts a three-column comparison, collapsing
to two and then one column. Image → description → size samples → downloads is
the hierarchy. The inherited study palette is paper #f1eee6, ink #252522,
secondary #626660, links/focus #226c59, divider #d6d3ca, and preview #0a0a09.
Gold/teal and dashed guides appear only in construction mode. Georgia handles
the title, system sans the body, monospace the size labels. No animation or
unrelated decoration is added.
