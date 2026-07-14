# s83 — THE SINGLE-FRAME SIMPLIFICATION (2026-07-14)

Deletes the Vioget(-6.5°)→O'Farrell(-9.0°) grid-swing machinery per the SINGLE-FRAME
AMENDMENT (road-master-spec.md). O'Farrell -9.0° is now the ONE frame for the entire
sim window; the 1847 correction was a paper event, not a physical rotation.

## Evidence shots (atelier, 1846-07-01, overlays: spine + ROW + lots + parcels)
- 01-1846-plaza-parcels.png — grid at -9.0°; ground-paint (brown), plat lot lines (white),
  corner ticks (gold), street ROW boundaries (CYAN — single frame, no magenta Vioget),
  and Portsmouth Square parcel (GOLD) are all mutually aligned. The plaza tint is now a
  CLEAN RECTANGLE hugging its block (was a stair-stepped raster blob).
- 02-1846-cove-parcel.png — Yerba Buena Cove water parcel as a CLEAN TRANSLUCENT POLYGON
  (triangulated + draped); boundary follows the shoreline as a draped polyline, not pixel
  stairs. tint = exact parcel geometry (was cell-raster). (The crinkly tan line is the
  real baked natural high-water shoreline, not the overlay.)

## Numeric alignment proof (window.__wbMeasure, single frame at both dates)
Both dates resolve to activeSkewDeg = -9.000, singleFrame = true.

1846-07-01 (grid now at -9.0° — must STILL align internally):
  lot-fabric edge vs ROW boundary : n=180 (15 blocks)  median 0.00  p95 0.00  max 0.00 m
  paint-band center vs centerline : n=89  (10 streets) median 0.10  p95 0.32  max 0.42 m
                                    (tolerance ±2.08 m = half canvas pixel)
1849-09-01:
  lot-fabric edge vs ROW boundary : n=768 (64 blocks)  median 0.00  p95 0.00  max 0.00 m
  paint-band center vs centerline : n=165 (16 streets) median 0.16  p95 0.37  max 0.60 m

At 1846 everything sits at -9.0° and aligns internally to 0.00 m (lots vs ROW) /
within half a canvas pixel (paint vs spine).

## Audit table (window.__P1850.audits.runAll — 3 noon dates)
  1846-07-01 : 31 ran, 0 failed — ALL GREEN
  1848-04-01 : 31 ran, 0 failed — ALL GREEN
  1849-09-01 : 31 ran, 0 failed — ALL GREEN
Count unchanged (31→31): no audit was deleted with the machinery. platFrame,
core.geodeticLock, placement.parcelIntegrity all RETAINED and simplified (single-frame,
no dual-frame branches). (terrain.luminance is a live-framebuffer pixel-readback audit and
reads black on the very first frame before a composite; green once a frame composites —
unrelated to geometry, untouched by this sprint.)

## LOC delta vs origin/main (1b4166d)
  Single-frame deletion (src/core + src/layers/ground-paint) : +150 / -199  = net -49
  workbench (single-frame removal + parcel-tint addendum)     : +121 /  -62  = net +59
    - the framecmp overlay + swing/frame branches were deleted (negative);
    - the Director parcel-tint addendum added a polygon triangulator + draped
      fill (~+100 lines of new code) — that is net-additive NEW work.
  src total : +271 / -261 = net +10  (deletion strongly negative; masked by the
              triangulation addendum riding on this landing)
  Many "added" lines are replacement liberty-tag comments; executable machinery
  removed is larger than the raw counts suggest.

## Liberty tag locations
  - src/core/01-geography.js: GRID_ROT_BASE_DEG comment + the old updateGridSwing site
  - src/core/03-sim.js: the old OFARRELL_SWING_START/END site
  - road-master-spec.md SINGLE-FRAME AMENDMENT (the binding ruling)
