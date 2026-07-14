# s80a — THE GROUND PLAN CADASTRE — admission evidence (2026-07-14)

Layer: **core** (the dated cadastre, beside the spine) + **workbench** (atelier overlay).
Branch `s80a-groundplan` off origin/main @ 758f0c3. building-spawn-spec.md §1 v1.2 / v1.1.

## Audit suite — ALL GREEN at the three canonical noon dates

Run via `__P1850.audits.runAll()` in atelier.html (fresh load, natural render loop):

| Date | ran | failed |
|---|---|---|
| 1846-08-01 (Vioget) | 30 | **0** |
| 1848-04-01 (O'Farrell) | 30 | **0** |
| 1849-09-20 (Eddy/cove) | 30 | **0** |

Full per-audit table @1849-09-20 — every audit PASS:

```
core.geodeticLock=PASS
ground-paint.constantWidth=PASS  ground-paint.eraPaint=PASS  ground-paint.oneOwner=PASS  ground-paint.roadDarkerThanGround=PASS
placement.addressed=PASS  placement.anchorageHeading=PASS  placement.fauna=PASS  placement.fences=PASS
placement.footprints=PASS  placement.footprintsOBB=PASS  placement.frontageOpenness=PASS  placement.grounding=PASS
placement.hullOverlap=PASS  placement.intertidal=PASS  placement.moorings=PASS  placement.orientation=PASS
placement.props=PASS  placement.rowEra=PASS  placement.scatter=PASS  placement.signs=PASS  placement.storeshipMud=PASS
placement.tents=PASS  placement.trees=PASS  placement.wharfContinuity=PASS
placement.lotDeterminism=PASS  placement.parcelIntegrity=PASS  placement.platClosure=PASS  placement.platDates=PASS   <- the four s80a cadastre audits
terrain.luminance=PASS
```

26 inherited audits (geodeticLock + 25) unchanged and green; +4 new cadastre audits, all green (26 → 30).

### The four cadastre audits (details)
- **placement.platClosure** — 45 standard blocks, 6 lots tile each exactly (0 closure failures, area conservation to 0.01 m²). 21 non-standard blocks flagged with counts (17 cove 2×2 water blocks, 4 bush→post 3×4 tall blocks where Sutter St is absent from the surveyed dataset), never failed.
- **placement.lotDeterminism** — two derivations byte-identical; **rngConsumed = 0** (the seeded-dice counter RNG_CALL_COUNT does not move — the plat is a pure function of the spine).
- **placement.platDates** — 0 violations: no lot before its block's survey checkpoint; every block's birth ≥ its four bounding streets' earliest appearance; blocksAt() monotone. Era snapshot: vioget(1846)=15 · ofarrell(1848-04)=64 · eddy(1849-09)=64.
- **placement.parcelIntegrity** — 8 parcels, all closed rings; folded predicates (inIntertidalBand / inBeachBand / inPublicSquare) agree with their original inline formulas at 529×3 fixed sample points — **0 disagreements** (behavior-preserving fold).

## Cadastre census
```
blocks 66 · lots 386 · water lots 61 · standard blocks 45 · non-standard 21 · parcels 8
max lot deviation-from-50-vara-standard: 0.02% (the reprojected spine already
  carries the surveyed spacing; lots divide it proportionally and close to 41.90 m)
per era (birth):
  vioget-1839 : 15 blocks,  90 lots,   0 water,  0 non-standard  (the documented 3×5 original survey)
  ofarrell-1847: 49 blocks, 288 lots,  53 water, 19 non-standard  (grid + the 1847 beach-and-water cove lots)
  eddy-1849   :  2 blocks,   8 lots,   8 water,  2 non-standard  (sacramento→front extension, born 1849-12-31)
```

## Era progression (the plat being born at survey dates — atelier lot overlay, timeline-scrubbed)
```
1846-08 (Vioget)   : 15 blocks / 90 lots / 0 water   — original survey only
1848-04 (O'Farrell): 64 blocks / 378 lots / 53 water — full grid + cove water lots
1849-09 (Eddy)     : 64 blocks / 378 lots / 53 water — (+2 Eddy blocks appear 1849-12-31)
```

## Probe cards (groundPlanAt — the sign-off query)
```
plaza-ring lot  B|kearny|montgomery|washington|clay#0,0 · 41.90×41.91 m · dev 0.02% · CORNER · dry
cove water lot  B|montgomery|sansome|jackson|washington#1,0 · 41.90×41.90 m · WATER LOT
                parcels here: yerba-buena-cove · storeship-mud-band · beach-band   (folded zone truth)
corner lot      B|powell|stockton|vallejo|broadway#0,0 · 41.90×41.90 m · CORNER
```

## Screenshot note (honest)
The automated preview browser used for this pass cannot composite/screenshot this
heavy WebGL app (the browser-pane screenshot path hangs at any viewport size), and
the atelier side-panel throws before creation in this specific headless WebGL context
(verified identical on the untouched origin/main atelier — pre-existing, environmental).
All verification above is via the offscreen-rendering audit suite + the exposed
`__P1850.groundPlan` API, which run correctly. The visual overlay screenshots
(1846/1848/1849 lot fabric, probe popup, parcel tints) should be captured by the user
in a normal browser on the live Pages deployment — the atelier "GROUND PLAN" overlay
rows and probe integration are wired and were confirmed to build a correct LineSegments
overlay from the real cadastre data (era-gated, colour-keyed water/corner/non-standard).

Atelier steps for the visual sign-off:
1. open atelier.html, scrub the timeline; check "GROUND PLAN — plat lots" — the plat
   appears at survey dates (1846 Vioget region only → 1847 full fabric + cove water lots).
2. check "GROUND PLAN — named parcel tints" — plaza / cove / mud+beach bands / camp /
   mission / presidio.
3. arm the PROVENANCE PROBE, click any platted lot — the ground-plan card shows the lot
   id, dims, deviation-from-standard, birth date, water flag, and containing parcels.
