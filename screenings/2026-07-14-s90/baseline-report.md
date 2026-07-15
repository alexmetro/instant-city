# P1850 Verification Report

- Generated: 2026-07-15T00:06:09.309Z
- Overall: **RED**
- Canonical noon dates: 1846-07-01, 1848-04-01, 1849-09-15, 1849-12-20
- Geodesic fixture: OSM Overpass way-intersection nodes (shared node between the two named street ways), fetched 2026-07-11. Canonical source of record: tools/map-overlay.py CONTROL_POINTS (docs repo) and the core.geodeticLock audit (src/core/06-debug.js), verbatim. SF's downtown grid is unchanged since O'Farrell 1847, so modern intersections are valid 1846-56 ground truth.

## index — RED
`http://127.0.0.1:49995/index.html`

**Boot:** green (veilCleared=true, consoleErrorsAtBoot=0)

**Noon protocol:**

| date | verdict | audits | failed | unexpected-skip | allowed-skip | new errors |
|---|---|---|---|---|---|---|
| 1846-07-01 | green | 33 | 0 | 0 | 4 | 0 |
| 1848-04-01 | green | 33 | 0 | 0 | 4 | 0 |
| 1849-09-15 | green | 33 | 0 | 0 | 4 | 0 |
| 1849-12-20 | RED | 33 | 1 | 0 | 4 | 0 |

Failing audits (RED):
- 1849-12-20: ground-paint.constantWidth

Allowed structural skips (foundation branch, not red):
- placement.anchorageHeading — fewer than 2 anchored ships
- placement.fences — no yard fences built
- placement.moorings — Central Wharf not yet built at this date
- placement.wharfContinuity — Central Wharf not yet built at this date

**Measurement tables:** green — geo=true paint=true lot=true

- Geodetic fit: datasetFitRMS 1.128 m, canonical end-to-end RMS 1.232 m (max 1.861 m @ broadway_battery), azimuth drift 0°, round-trip 3.18e-14 m
- Paint-vs-centerline: constantWidth=ok, eraPaint=ok, oneOwner=ok, roadDarkerThanGround=ok
- Lot-vs-ROW: platClosure=ok, lotDeterminism=ok, parcelIntegrity=ok, platFrame=ok

**Screenshots:**
- overview-1500m (1500m @ 1849-09-15, region/zone band): shots\index-overview-1500m.png
- town-500m (500m @ 1849-09-15, street band): shots\index-town-500m.png
- plaza-150m (150m @ 1849-12-20, lot band): shots\index-plaza-150m.png

## atelier — RED
`http://127.0.0.1:49995/atelier.html`

**Boot:** green (veilCleared=true, consoleErrorsAtBoot=0)

**Noon protocol:**

| date | verdict | audits | failed | unexpected-skip | allowed-skip | new errors |
|---|---|---|---|---|---|---|
| 1846-07-01 | green | 33 | 0 | 0 | 4 | 0 |
| 1848-04-01 | green | 33 | 0 | 0 | 4 | 0 |
| 1849-09-15 | green | 33 | 0 | 0 | 4 | 0 |
| 1849-12-20 | RED | 33 | 1 | 0 | 4 | 0 |

Failing audits (RED):
- 1849-12-20: ground-paint.constantWidth

Allowed structural skips (foundation branch, not red):
- placement.anchorageHeading — fewer than 2 anchored ships
- placement.fences — no yard fences built
- placement.moorings — Central Wharf not yet built at this date
- placement.wharfContinuity — Central Wharf not yet built at this date

**Measurement tables:** green — geo=true paint=true lot=true

- Geodetic fit: datasetFitRMS 1.128 m, canonical end-to-end RMS 1.232 m (max 1.861 m @ broadway_battery), azimuth drift 0°, round-trip 3.18e-14 m
- Paint-vs-centerline: constantWidth=ok, eraPaint=ok, oneOwner=ok, roadDarkerThanGround=ok
- Lot-vs-ROW: platClosure=ok, lotDeterminism=ok, parcelIntegrity=ok, platFrame=ok

**Screenshots:**
- overview-1500m (1500m @ 1849-09-15, region/zone band): shots\atelier-overview-1500m.png
- town-500m (500m @ 1849-09-15, street band): shots\atelier-town-500m.png
- plaza-150m (150m @ 1849-12-20, lot band): shots\atelier-plaza-150m.png
