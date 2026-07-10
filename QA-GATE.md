# Map-Asset QA Gate (standing — run before reporting ANY sprint that adds/changes world objects)

**RECONCILIATION ENGINE (standing, est. 2026-07-09 — the discovery system; supersedes inspection as the primary audit):** data\claims.jsonl holds every representable assertion extracted from the research (regenerated as research grows). Builders maintain data\represented.jsonl (claim ids their sprints satisfy + how). The recurring RECONCILER pass diffs claims minus representations → ranked gap report (by icon score × era visibility) → gaps auto-queue as build items. Statistical claims get behavioral spot-checks (sample the sim, compare to the documented number). Discovery must never depend on the user noticing; absence is arithmetic.

**INDEPENDENT AUDITOR (standing role, est. 2026-07-09):** every 2-3 sprints, a read-only auditor agent flies the running app (desktop + mobile emulation, multiple eras/altitudes/times) with this gate + the research as its rubric and writes AUDIT-<date>.md — prioritized, builder-actionable defects (P0/P1/P2). Audit findings are automatically queued as fix sprints. The auditor never edits code; builders never grade their own work.

*Established 2026-07-09 by user directive. Every build brief must include this gate in its verification cycle. Findings go in the report; failures block "done."*

For EVERY new or changed on-map asset class, answer all six:

1. **PLACEMENT FIDELITY** — is it where the record puts it? Cite the research file + bearing/distance (peninsula-1846.md style). If placement is a guess, say so in the report.
2. **SCALE HONESTY** — is it true-scale? State the real-world dimensions used and their source. NEVER inflate geometry to make something visible (grounding.md scale rule).
3. **FINDABILITY** — if true scale makes it small (<~15m) or low-contrast, it MUST get a semantic-zoom affordance: label chip, tint zone, indicator dot, or ticker/paper mention that click-flies to it. Test: can a user who doesn't know it exists discover it from 2,000m? (Known failure this rule exists for: Happy Valley tents invisible against sand.)
4. **LEGIBILITY OF SILHOUETTE** — at 3 distances (bubble ~100m, mid ~500m, far ~1500m): does it read as the thing it is? Not as boxes-in-a-parking-lot (ships), not as people (old hitching posts), not as filter noise (old ripple patch). Contrast against its background checked in BOTH day and night lighting.
5. **INTEGRATION** — terrain-conformed (no floating, no submersion, no clipping through streets/buildings/other assets); respects masks (village box, streets, roads); appears/disappears at era-correct dates if time-bound.
6. **PERF** — instanced where >10 copies; draw-call delta stated; 60fps maintained.

7. **DENSITY & LIFE (no dead space)** — inside inhabited zones (village, waterfront, tent districts, Mission/Presidio clusters), any camera frame at 100-500m must contain visible evidence of life and use: people, worn ground, objects, smoke, animals, activity. Wide-open emptiness is REJECTED by default; it passes only if the record documents that spot as empty (then it should read as *meaningfully* empty: dunes, scrub, distance — not untextured void). The gaps BETWEEN things need as much authorship as the things: paths, litter of daily use, transitions. Test: pause at 5 random village/waterfront framings — if any reads as "boxes on a bare plane," the sprint fails this check.

Report format per asset class: `ASSET — placement(src) / scale(dims,src) / findability(affordance) / silhouette(day+night verdict) / integration / +N draw calls`.

## Current known debts against this gate (fix opportunistically)
- Happy Valley tents: fail findability + silhouette (blend into sand; need contrast + the tint zone is there but tents themselves invisible).
- Ships: fail silhouette at mid distance ("squares in a parking lot") — need hull shear, bowsprit, rigging hint, varied types (ship/brig/schooner), weathered sail tones.
- Town core: sparse object density for a real town (needs Phase-4-era fences, sheds, outhouses, woodsmoke, signage on true-scale buildings).
