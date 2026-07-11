# Director's Screening #1 — 2026-07-10, build 96ff833 (live Pages)

*First screening under the QA-GATE release rule. Method: real chrome-devtools rendering tab (document.hidden=false confirmed), `window.__P1850` hook for date/camera control, canonical framings saved to app/screenings/2026-07-10/.*

## Verdict on sprint #25 (splat cleanup): its six fixes LAND. ✔
- Night lighting: streets/plaza properly dark at night (f2). The Dec 24 1849 fire frame is genuinely atmospheric — fire glow on building walls, embers, dark streets.
- Labels: legible, correctly aligned along streets, day and night (f1, f3d). Massive improvement over the garbled micro-text.
- Daytime street tone: worn brown, no longer near-black (f1b, f3d).
- Legacy strips: none observed at wrong skew in any framing.
- Plaza z-fight: no shimmer between consecutive moving-camera frames (f6a/f6b) — moderate confidence (orbit delta was small); needs on-device confirm.
- Drag swap: hint text + handlers confirm pan-primary.

## BUT: the whole-picture verdict is REJECT vs. the RuneScape bar. New defects found by the screening, in priority order:

### P0 — "the sim you see when you scrub is not the sim"
1. **Time-jump leaves the world unpopulated/stale.** Jump to 1849-06-15 while paused: tents 0/1440 spawned, sparse buildings; unpause ~10s → 1151→1440 tents appear and buildings backfill. Population/growth is computed by the *running* update loop, not at jump time. Users scrub → see an empty stale town. Fix: on jump, run the growth/spawn systems to the target date synchronously.
2. **The forest of masts does not render.** Hook reports 497 anchored ships in Sept 1849 but ~25 hulls visible in the cove (f5). Almost certainly the ships InstancedMesh cap (SHIP_CAP) is far below the data count. Sept 1849's signature image — the app's single most famous historical sight — is missing. Fix cap + anchorage packing layout.
3. **No people visible in ANY frame at ≤166m altitude.** Paused state appears to hide/never-spawn walkers; paused is also the post-scrub default state, so the "period drama" reads as a ghost town exactly when the user is looking closest. Decide + implement: paused = frozen-in-place people (a stopped moment), never an emptied world.
4. **Sept 1849 density is a fraction of history** even after catch-up: one dense cluster near Clay/Kearny-Montgomery; the rest of the grid near-empty (f3d). Documented reality: hundreds of structures + spillover past the surveyed grid. GrowthTargets curve badly low for 1849. (Overlaps #17 economy/story-fill work but is a fidelity P0.)

### P1 — cosmetics the screening confirms
5. Street wear-halo smear: soft underlay reads ~3x street width; intersection corner smudges (f6a). Tighten falloff.
6. Plaza dither/noise rectangle reads as texture corruption at 150-450m (f1,f3d,f6); block wear pattern is a repetitive fish-scale row that reads mechanical.
7. Floating pale quad artifact NW of town in multiple frames (f3d,f4,f5 ~same world spot) + scattered white micro-squares at night (f2). Find and kill.
8. T (sunrise/sunset) toggle is one-way — could not return to daylight in-session (4 presses); had to reload.
9. Ship/event label chips collide with the help/legend panel (f3d,f4) — declutter must treat UI panels as occupied rects.
10. "THE VILLAGE" district label still displayed in Sept 1849 (f5) — era-gate district names (Village → San Francisco core naming per date).

### Notes for the record
- Fire scene (f2) is the best-looking frame the app has ever produced.
- Geography at overview (f5): peninsula/cove/dune/green gradient + Mission road read well.
- Terrain low-poly facet banding visible on hills at 1500m (f5) — below-bar but tolerable this round; watch it.

## Screening #2 (same day, build 0e3ed3f — quartet round 1): REJECTED
Builder claimed all four P0s fixed with screenshots; live build showed P0-4 unchanged (~25 structures), P0-2 partial (hull confetti, no masts), P0-3 unverifiable (no identifiable walkers at 114m). Only P0-1 (jump state population) held. Evidence: s2-*.jpeg. Divergence cause (established in round 2): the data-layer fixes were correct but each had a second rendering-layer bug downstream — builder verified counters, not pixels.

## Screening #3 (same day, build 569012f — quartet round 2): ACCEPTED ✔
- P0-4: Sept 1849 town now renders hundreds of structures spilling across and beyond the grid + hillside tent camps (s4-town-480m). Root cause was growth-building color camouflage (~10 RGB units off the sand — the tent bug's twin).
- P0-2: the forest of masts renders — dense packed anchorage, visible masts/yards at 605m (s4-cove-600m). Masts had been 1/5 scale and half-submerged.
- P0-3: identifiable standing figures at 114m paused (s4-town-150m-people). Note: enlarged contact-shadow blobs in the dense cluster read smudgy — polish item.
- P0-1: not regressed (1440/1440 tents, 497 ships instantly post-jump).
- New task #27 filed: waterline terrain bug (village-pad blend overrides water; 1849 shoreline should reach Montgomery St — ships are placed correctly, terrain is wrong).
- Standing screening lesson now proven twice: builders must verify pixels on the live build, not debug counters.

## Screening #4 (build a1f280b — street-checkpoint reset): ACCEPTED w/ notes
Vioget-only faint survey streets at 1846 ✔; O'Farrell grid + era transition ✔; Market 120ft diagonal + Hundred Vara grid clash visible ✔; Clay/Washington corrected (+5 latent order bugs defused, incl. one that would have zeroed the Dec 1849 fire) ✔; plaza worn-earth replaces dither ✔. Notes → task #28: 95 ships Jan 1848 (pre-rush absurd), binary wear (new streets born worn), water-lot streets painted over water, dashed path artifacts. Evidence: s6-*.

## Screening #5 (build 74fb522 — shoreline + era-fidelity): ACCEPTED
Waterline: village-pad no longer overrides water east of the shoreline curve; town meets water near the documented line; storeships beached at the tideline ✔. Pre-rush cove: Jan 1848 = 12 anchored, quiet water ✔ (ghost-fleet rule now date-gated to Oct 1848 per timeline-spine). Sept 1849 mast forest intact (352 anchored, recalibrated) ✔. Water-lot streets render as dashed pier-hints, not land streets ✔. Cart-track artifact toned ✔. Evidence: s8-*.
Small new findings → polish tranche: (a) street LABELS for unfilled water-lot streets still float over open water — suppress until fill date; (b) the SW dune-leveling + street-stub cluster reads as a dark blur-smear mass at 500-600m; (c) storeship label chips stack/overlap slightly.

## Screening #6 (build a806f95 — polish tranche 1): ACCEPTED
Default-load acceptance test PASSES: July 1846 @1450m reads as landscape + tiny village + dirt tracks; the GPS-overlay plat is gone (s11-default-1846 vs s10-default-load). Street-level 1849 plaza @123m: figures cluster socially around the flag, wardrobe tints visible, fences/yards, tight wear halos, organic plaza ground — reads as an inhabited town frozen mid-day (s11-plaza-life-1849). Bonus root-cause: roster hard-expiry ~Jan 1849 had silently removed ALL at-work figures from late-era scenes — fixed. Hogs thin post-ordinance (CS18470123.1.4 receipt), no elk, no whales. Deferred (logged): catenary mooring lines, shorebirds/deer.

## Screening #7 (build a8045a1 — pop-curve P0 from reconciler round 2): ACCEPTED
POP_CURVE 1849-06-30 node 11,000→5,000 (timeline-spine clm:timeline:42, hard). Display pop verified live: 5,054 @ Jun 30, 13,967 @ Sept 20 (correct interpolation to documented Dec ~25k). Density/liveliness decoupled to DENSITY_CURVE (building-count calibration) — zero visual regression vs s11/s4 baselines (s13-density-check-480m). Reconciler round 2 report: data\GAPS-2026-07-10.md (4/12 round-1 items closed, 6 upgraded, 29 represented.jsonl corrections).

## Screening #8 (builds 8663430..d3ef7be — reconciler tranche: ranch/mud-winter/fauna): ACCEPTED
Mud winter @Dec 15 1849 plaza 123m: streets churned dark mud, plaza a brown morass, plank crossings at intersections, dry blocks contrasting, ticker carries the rainy-season receipt — the sim now has documented seasons (s15-mudwinter-plaza). Mission corral @Jun 1847 72m: post-and-rail corral in the oak pasture, grazing cattle readable (builder's s14 live shots). Fauna verified via __P1850.fauna debug (29 cattle at documented pastures, 6 pelicans, 3 herons, rats/cats/dogs era-gated) — speck-tier at map scale by honest true-scale, correct per grounding scale law. Note for polish backlog: bias grazers toward the corral so the pasture frame doesn't read empty; heron site is a terrain-forced approximation (no Mission Creek water arm in baked terrain — candidate for a terrain sprint).
5 orphaned occupations (farmer/rancher/dairyman/hunter/vaquero) now have real workplaces. Deferred: swallowed-animal vignette, walker mud-detours.

## Screening #9 (build 3828720 — street-label engine): ACCEPTED
User-reported iPad failure (constant-size billboard pileup at oblique angles) fixed via the slippy-map standard: screen-space placement along the street's projected run (≥90px + fits-text gate kills edge-on/far streets), CSS-rotated along screen direction, greedy priority declutter (class × length × center proximity, cap 14) sharing the existing chip collision system, 280ms hysteresis + fade (zero thrash across a 385-sample zoom sweep). Verified at the user's repro (Feb 1848 oblique 800m): 10-12 labels, all along-street, zero overlaps, hills clean (s17-labels-oblique-1848). Labels expose __P1850.streetLabels for future screenings.

## Screening #10 (2026-07-11, build 55ef88c — LIVE pace + pathing unification): ACCEPTED
User P0 (walkers zipping at default + mixed-speed pairs = two unsynced systems) fixed per grounding §10 LIVE-PACE LAW: default unpause = "LIVE — 1:1"; builder-measured on live build: 164/180 figures at 0.21-1.63 m/s (median ~1.5), zero >3 m/s; day/s timelapse = ambient-flow, spread 2.03x, no zipping; resample exact (0m drift paused, 0.64m max on unpause-after-jump); wall-clock walkT01 band-aid DELETED (one integrator). Director check: 8 real seconds at LIVE advanced the clock seconds, not days (date unchanged) — clock policy confirmed (s18-* builder evidence + s21-live-pace-plaza).

## Screening #11 (2026-07-11, builds 334ac40+509373e — ground authority/anti-shimmer): ACCEPTED
User P0 (nauseating view-level flicker + double/early/too-perfect roads). Root causes proven: (1) both tiers painted every street (double lines) → town rect now hard-cutout from world tier, one owner per pixel; (2) logarithmicDepthBuffer silently disabled polygonOffset → per-pixel depth war = THE flicker → decal drapes above terrain triangles; (3) mipmaps off → sparkle → POT+trilinear+aniso8. Era-wear law verified in pixels: June 1848 south-of-Market = Market/Bush/Pine/numbered ALL ghost whispers under labels (s23b), core worn; 1849 First(0.70)/Second(0.84) > Seventh/Eighth(0.28). DEFAULT_WORN_DELAY deleted; tents now count as frontage. Hand-worn strokes: 7m pieces, width jitter, meander, broken ruts. Regressions (night, mud, ghosts, pier-hints) PASS.
New finding → #32 scope: Mission road renders as bright crisp triple-stripe (reads modern highway; plank era is 1850+, out of window) — retone to single irregular dirt track (s23-market-ghost-1848).

## Screening #12 (2026-07-11, build 1275515 — shoreline truth): ACCEPTED
User reference framing (Feb 1849) re-shot: water at Montgomery's edge, fleet afloat (101/101 in water per __P1850.shipAudit; only mud-sitters across all dates are the documented beached storeships), ZERO dry blocks town→water, water-lot labels ghosts over water, Mission road single ragged track (s24-ref-framing-verify + builder s22-*). Two wrong-shoreline owners deleted (Rincon parabola 1.2km east of truth shielding modern SoMa fill via the Happy Valley protect circle; a second private mesh pad-blend missing the #27 gate). Shoreline now grid-anchored (derived from streets-geometry via gridToWorld at bake; TERRAIN_1846.shoreAnchors) — survives the coming #34 re-projection. Watch item: facet banding on the south beach at grazing sun. Note: tools/bake-terrain.js lives outside the app repo — changes on disk only.

## Screening #13 (2026-07-11 — GEOMETRY TRUTH re-projection, sprint #34): PASSED (builder sweep, s25-*)
The world re-projected to measured reality (map-scans VALIDATION-2026-07-11 §4): base grid rotation 2.5° → fitted -9.0° (VIOGET_SKEW is now base+2.5° = -6.5°, the O'Farrell swing eases -6.5°→-9.0°, verified live: skew -6.5 @1846-08, -7.74 @1847-05, -9.0 @1847-09); dataset re-projected to measured centerline spacing (block + per-pair street widths; Market re-anchored ~305m south onto its two measured crossings, the 36° bearing CONFIRMED; Battery at the measured 103.9m water-lot spacing); terrain re-registered (grid origin at its real lat/lon inside the bake frame, +110.66/+43.90 — bake re-run, shore anchors re-derived through the new gridToWorld).
**Objective acceptance: map-overlay.py RMS vs the georeferenced 1853 Coast Survey chart 30.64m → 1.13m** (per-point: montgomery_clay 32.7→1.1, montgomery_washington 6.6→1.0, kearny_clay 8.8→0.4, kearny_washington 22.1→0.6, market_kearny 12.0→0.6, market_montgomery 19.8→0.1, broadway_battery 47.1→1.5, sansome_clay 55.4→2.2); overlay composite visibly locks (streets on the chart's blocks, Market/Mission along the chart's own lines, shoreline through Clark's Pt).
Live sweep (chrome-devtools rendering tab, document.hidden=false, console clean):
- 1846 default 1450m ✔ (s25-default-1846-1450m — village + worn Vioget lanes only, splatStats: the same 10 streets at wear 0.6 as baseline; grid now visibly ~9° rotated, matching the real map)
- Jun 1848 south-of-Market ✔ (s25-somarket-ghosts — Market/Bush/Pine/Post ghost whispers under labels; numbered streets moved SE with the measured Market line, as expected)
- Feb 1849 reference framing ✔ (s25-ref-framing-feb1849 — water at Montgomery's east side, 103/103 hulls in water, zero dry blocks town→water)
- Sept 1849 town 480m + plaza 150m + cove 600m ✔ (s25-town-480m/plaza-150m/cove-600m — mast forest afloat, storeships at the tideline, plaza square between its four streets, labels on streets)
- Dec 1849 mud winter ✔ (s25-mudwinter-plaza — churned mud streets, plank crossings, plaza morass)
- __P1850.shipAudit at 1846-07-04 / 1848-02-18 / 1849-02-21 / 1849-09-20 / 1849-12-15: dry=[] at ALL five (Euphemia storeship nudged u 97→103 — the 31m heightmap's bilinear shore ridge had shifted under her 0.04m past the tideline threshold; verified back in wet mud h≈+0.1)
- Happy Valley ✔ (s25-happyvalley — tents on land; the re-anchored First/Second St now thread the documented tent ground, better than before)
Watch items (pre-existing, unchanged): terrain facet banding at grazing sun on the south beach; Eddy coarse overlays remain qualitative-only (hand-picked pixel anchors, documented ±150px uncertainty — the georeferenced Coast Survey chart is the instrument of record).
Note: tools/ (bake-terrain.js, map-overlay.py, build-streets-geo-js.js, new reproject-streets-2026-07-11.js), data/streets-geometry.json and research/map-scans/* live OUTSIDE the app repo — changes on disk only.

## Disposition
- Sprint #25: ACCEPTED (its scope verified).
- New sprint queued: P0 quartet (jump-population, ship cap/masts, paused-people, 1849 density curve) — **precedes** the street-checkpoint reset because every future screening depends on scrub-accuracy.
- P1 items 5-7 fold into the street-checkpoint reset sprint (#23, repaints ground anyway); 8-10 fold into polish tranche (#22) or nav follow-up.
