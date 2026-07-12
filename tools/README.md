# tools/build-app.js — THE GREAT SPLIT assembler

The app's source of truth is `src/` (see `../../layers-spec.md`, the binding contract):

- `src/shell.html` — markup + CSS (the whole HTML document, with `<!-- @P1850:APP-JS -->`
  standing in for the app module between the existing `<script></script>` pair).
- `src/core/*.js` — shared plumbing + interfaces (boot/RNG, geography + street spine,
  scene/helpers/placement, sim clock + curves, road lifecycle, routing, `__P1850` debug
  + audit registry, render loop).
- `src/layers/*.js` — one file per layers-spec draw-order slot (terrain, ground-paint,
  zones-tint, buildings, doodads, people, ships, fauna, effects, labels-inspect,
  camera-input, director, ui-chrome). Each file header carries its OWNS/READS/NEVER
  contract.

## Build

```
node tools/build-app.js          # writes app/index.html + app/index.dev.html
node tools/build-app.js --check  # assemble in memory, diff against app/index.html (CI guard)
```

No dependencies, Node >= 12, ~15ms. Output is **byte-stable**: identical sources always
produce identical bytes.

## The chunk system (READ BEFORE EDITING src/)

The app is ONE IIFE module whose top-level statements execute in sequence, with
cross-layer data dependencies accumulated over 60+ sprints. The Great Split was PURE
CODE MOTION (pixel-identical, layers-spec Phase B) — so every source file is a series
of chunks:

```
/* @P1850-CHUNK NN — note */
...code...
```

`build-app.js` collects every chunk from every declared file and concatenates them in
GLOBAL chunk-number order — the original module statement order — regardless of which
file a chunk lives in. Layer files therefore hold their layer's code exclusively, while
the assembled module replays the exact original execution order.

Rules:
- Edit code freely INSIDE a chunk; the build keeps its position.
- NEVER reorder, renumber, or merge chunk markers without a full pixel re-verification
  at the canonical six framings (QA-GATE).
- New code for a layer goes in that layer's file, inside an existing chunk of that
  layer (or a new chunk number appended at the END of the global sequence if it has no
  ordering dependency).
- Anything before a file's first chunk marker is a preamble comment — ignored by the build.

## Dev mode

`app/index.dev.html` (also emitted by the build) loads the same `src/` files at runtime
via a fetch loader and assembles the identical module in the browser — edit a layer
file, reload, no build step. Requires an http server (`fetch()`), e.g.:

```
cd app && python -m http.server 8080   # then open http://localhost:8080/index.dev.html
```

The baked data sidecars (`terrain-1846.js`, `streets-geometry.js`, `events-*.js`, ...)
are untouched by all of this — separate files consumed by both variants, exactly as before.

## Audit registry

Layers register executable seed-rule audits (layers-spec rules block) from their own
files via `registerAudit(layer, name, fn)` (defined in `src/core/00-boot.js`).
`src/core/06-debug.js` exposes them as `window.__P1850.audits.<layer>.<name>()` plus
`__P1850.audits.runAll()` → `{ pass, ran, failed, results }`. Screenings run
`runAll()` wholesale; a failing audit fails the landing.
