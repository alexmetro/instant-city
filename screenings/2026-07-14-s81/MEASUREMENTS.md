# s81 alignment measurements — numeric proof (Director intervention, 2026-07-14)

Eyeball claims are banned; every alignment claim below is measured in-engine by
`window.__wbMeasure()` (atelier dev harness, `src/layers/workbench.js`) and by the
`placement.platFrame` audit (`src/core/08-cadastre.js`). Method: perpendicular
offsets sampled at stations every ~40 m of street arc-length, clear of junctions
(±halfW+6 m of any other street) and of wet ground; paint-band center estimated
as the ALPHA-WEIGHTED centroid of a 0.25 m perpendicular scan (sub-pixel across
the antialiased stroke edges); lot-edge offset = |dist(edge station → street
centerline) − halfW| at 3 stations per block edge, all 4 edges, every block
present at the date. World geometry from the cadastre day-frame API
(`lotWorldQuad`), street frames from core's `CURRENT_STREET_SKEW` — the harness
contains zero frame math of its own.

**Paint canvas resolution: 4.15 m/pixel** (4096 px over the 17 km world axis) —
honest tolerance for any paint-pixel measurement is ±2.08 m (half a pixel).

## (a) Paint-band center vs active-frame centerline

| date | active skew | streets | stations n | median | p95 | max | tolerance | verdict |
|---|---|---|---|---|---|---|---|---|
| 1846-07-01 | −6.5° (Vioget) | 10 | 89 | **0.08 m** | 0.21 m | 0.27 m | ±2.08 m | PASS |
| 1849-09-01 | −9.0° (base) | 16 | 165 | **0.16 m** | 0.37 m | 0.60 m | ±2.08 m | PASS |

## (b) Plat-lot block edge vs ROW boundary

Blocks are derived by insetting each street's constant half class width from its
centerline, so the lot boundary and the ROW edge are the SAME survey number —
measured to confirm no drift was introduced anywhere in the chain:

| date | blocks | edge stations n | median | p95 | max | verdict |
|---|---|---|---|---|---|---|
| 1846-07-01 | 15 | 180 | **0.00 m** | 0.00 m | 0.00 m | PASS (exact) |
| 1849-09-01 | 64 | 768 | **0.00 m** | 0.00 m | 0.00 m | PASS (exact) |

## (c) 1846 Vioget-frame conformance (the 2.5° question)

`placement.platFrame` audit (runs in the standing suite): for EVERY block
present, lot-edge azimuths (both axes, from `lotWorldQuad` at the queried day)
vs the bounding streets' rendered polyline azimuths:

| date | resolved skew | blocks | edges checked | max deviation | gate | verdict |
|---|---|---|---|---|---|---|
| 1846-07-01 | −6.500° | 15 | 30 | **0.0000°** | 0.2° | PASS |
| 1848-04-01 | −9.000° | 64 | 128 | **0.0000°** | 0.2° | PASS |

The frame fix lives IN THE CADASTRE (Director ruling): `cadSkewAt(day)` +
`lotWorldQuad(lot, day)` + day-frame point queries in `core/08-cadastre.js`;
consumers do zero frame math.

## Findings surfaced by measurement

1. **REPORTED (signed-off layer, not fixed here): `_gpAlphaAtWorld` half-pixel
   readback bias.** Ground-paint's audit readback helper samples pixel
   `Math.round(c)` where a continuous canvas coordinate `c` lies inside pixel
   `floor(c)` — a systematic −0.5 px = −2.08 m shift in every probe. Measured
   proof: with round-sampling the paint-vs-spine median reads 2.13–2.20 m at
   both dates (≈ exactly half a pixel, falsely over tolerance); with correct
   floor-sampling it drops to 0.08–0.16 m. Affects only audit probes (their
   loose tolerances still pass); zero rendered pixels. Ground-paint v1 is
   user-signed-off — the one-character fix (`Math.round` → `Math.floor`, two
   call sites in `_gpAlphaAtWorld`) must go through its own re-admission gate.

2. **EXPLAINED (spec-conformant, what the transcript screenshot showed): lot
   lines crossing a road band.** The mid-block lanes (`water-street`,
   `portsmouth-street`, `commercial`) are EXCLUDED from the plat lattice by
   spec (building-spawn §1: "a diagonal or a short lane is not a plat
   parallel") — 4 painted lane segments legitimately run INSIDE block
   interiors, so lot fabric crosses their bands. Not an alignment defect;
   subdivision of lane-split blocks is the documented fast-follow.

## Evidence frames (one claim per frame, shot AFTER the fixes)

- `M1-paint-vs-spine-1849.png` — claim (a): spine over paint only, 1849.
  Measured: median 0.16 m, p95 0.37 m, max 0.60 m over 165 stations / 16
  streets (tolerance ±2.08 m).
- `M2-lot-vs-row-1849.png` — claim (b): plat lots + ACTIVE-frame ROW, 1849.
  Measured: 0.00 m median/p95/max over 768 edge stations / 64 blocks.
- `M3-vioget-1846.png` — claim (c): spine + ROW + lots at 1846-07-01, every
  system in the ONE active Vioget frame (−6.5°); platFrame max deviation
  0.0000° over 30 edges; lot-vs-ROW 0.00 m over 180 stations.
- `M4-frame-comparison.png` — the FRAME COMPARISON toggle (default OFF,
  reference-only): both survey frames rendered simultaneously for divergence
  inspection — the ONLY view where two frames appear at once.
