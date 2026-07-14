# s82 plaza-parcel measurements — numeric proof (user findings, live atelier, 2026-07-14)

Project law: alignment/geometry claims are proven numerically — audit output and
measurement tables are the proof; the screenshots in this directory only
illustrate the numbers. All measured in-engine on the built `atelier.html`
(worktree branch `s82-plaza`), audits via `__P1850.audits.runAll()`, harness via
`window.__wbMeasure()`.

## 1. The plaza parcel IS its cadastre block (finding 1a)

The `portsmouth-square` parcel polygon is now DERIVED from the publicReserve
block found by the plaza centroid (world −105.68, 78.17 inverted through the
resting base frame):

| quantity | measured | gate | verdict |
|---|---|---|---|
| reserve blocks claimed | **1** (`B|dupont|kearny|washington|clay`) | exactly 1 | PASS |
| block shape | standard 3×2, 125.70 × 83.81 m (100×150-vara std: 125.73 × 83.82) | — | matches the historical square |
| parcel-poly deviation outside block bounds | **0.000000 m** | ≤ 1e-6 | PASS (identity) |
| parcel edge → ROW edge offset, max | **0.0000 m** (24 stations: 3/edge × 4 edges × 2 frames) | ≤ 0.005 m (= the lots' exactness standard) | PASS (exact) |
| frames measured | 1846-07-01 (Vioget −6.5°) AND 1848-04-01 (base −9.0°) | both | PASS |

The old parcel was the hand-authored GEO.plaza rect spanning street
CENTERLINES in a two-frame union — it overlapped all four surrounding
rights-of-way by each street's half-width. The new parcel inherits the block's
centerline-minus-half-width inset, so overlap with any bounding ROW is 0 by
the same survey numbers the lots close against (audit: `placement.parcelIntegrity
.plazaBlockDerived`, in the standing suite).

## 2. Zero lots inside the public square (finding 1b)

| quantity | before | after |
|---|---|---|
| total plat lots | 386 | **380** (−6: the plaza block's six 50-vara lots) |
| lots intersecting the plaza poly | 6 | **0** (audited: `lotsInsidePlaza:0`) |
| vioget-1839-era lots | 90 | 84 |
| blocks | 66 | 66 (unchanged — the block exists, flagged `publicReserve`) |

`platClosure` now exempts publicReserve blocks from 6-lot closure and instead
FAILS if any such block holds a lot (`publicReserveWithLots:[]`).

## 3. Full suite — 31 audits, three gate dates

| date | ran | failed |
|---|---|---|
| 1846-07-01 | 31 | **0** |
| 1848-04-01 | 31 | **0** |
| 1849-09-01 | 31 | **0** |

`platFrame` still 0.0000° max deviation (15 blocks/30 edges at 1846, 64/128 at
1848 — the lot-less plaza block stays frame-audited via its block rect through
the same `lotWorldQuad` day-frame API). `__wbMeasure().lotVsRow`: median/p95/max
= **0.00 / 0.00 / 0.00 m** at 1846-07-01 (180 stations) and 1849-09-01 (768
stations) — the s81 standard is undisturbed.

## 4. Defect found BY the new audit (fixed in the same file)

`cadPointInPoly` only read `{x,z}` points, but uv-space parcel rings are
authored `{u,v}` — every uv-poly containment test compared against
`undefined` and returned false. Proof: pre-fix, `plazaCentroidInOwnParcel:
false` and the `platted-region` parcel matched no point in the world; post-fix
both correct (predicate disagreements 0 of 1587 sampled points). The reader now
accepts either key pair.

## 5. Observed, NOT fixed here (out of s82's two allowed layers)

`portsmouth-street` (spine data, `streets-geometry.js`) runs [−219.04,0]→[0,0]:
its western half starts at the CENTER of Portsmouth Square, so ground-paint
draws a road band across the east half of the reserved common (visible as the
dark slot under the translucent plaza tint in the 180 m shot). Spine data and
ground-paint are outside this sprint's layer allowance — reported for a
follow-up ruling (is "Portsmouth Street" in the record, and where does it
start?).

## Shots

- `plaza-parcel-hugging-block-1848-180m.jpeg` — parcels+lots+ROW at 1848-04-01,
  180 m: the gold plaza tint sits on exactly one block, measured edge-to-ROW
  offset **0.00 m** (tint edge raggedness is the 14 m/cell dev-overlay canvas,
  not geometry — see table 1).
- `plaza-parcel-hugging-block-1848.jpeg` — same at 300 m with the cove water
  lots in frame.
- `lots-1849-plaza-block-empty.jpeg` — PLAT LOTS view at 1849-09-01: dense plat
  everywhere, plaza block EMPTY; white lot lines with gold corner ticks (s82
  legibility), cyan water lots, magenta non-standard block.
- `atelier-rule-overlays-legend.png` — the RULE OVERLAYS panel: new PLAT LOTS
  legend and the rewritten "THE 1847 RE-SURVEY — before/after" toggle
  (Director-supplied copy, verbatim).
