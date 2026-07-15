#!/usr/bin/env node
/* =====================================================================
   tools/build-app.js — THE GREAT SPLIT assembler (layers-spec.md).

   Source of truth: app/src/shell.html (markup+CSS) + app/src/core/*.js +
   app/src/layers/*.js. Each source file is a sequence of chunks:

     /* @P1850-CHUNK NN — note *​/
     ...code...

   Assembly: every chunk from every declared file is collected and sorted
   by its GLOBAL chunk number — the original module statement order. The
   sorted bodies are spliced into shell.html at <!-- @P1850:APP-JS -->
   between the existing <script></script> pair. Output is byte-stable:
   the same sources always produce the same app/index.html.

   WHY global chunk order and not file order: the app is one IIFE module
   whose top-level statements execute in sequence with cross-layer data
   dependencies accumulated over 60+ sprints. The Great Split is PURE
   CODE MOTION (pixel-identical, spec Phase B) — so the assembly replays
   the original order exactly while the source of truth lives per-layer.
   A layer file's chunks are contiguous *per layer's own timeline*; the
   chunk numbers interleave across files. Never renumber without a full
   pixel re-verification at the canonical framings.

   Also emits app/index.dev.html — same shell, but a loader that fetches
   the same source files (mirroring the data-sidecar pattern: sources
   stay separate files on disk) and assembles the identical module in
   the browser, so layers can be edited and reloaded without a build.
   Serve app/ locally (e.g. `python -m http.server`) — fetch() needs http.

   Usage: node tools/build-app.js [--check]
     --check  build to memory and diff against the existing app/index.html
              (exit 1 on mismatch) without writing anything.

   No dependencies. Node >= 12.
   ===================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

const t0 = Date.now();
const APP = path.join(__dirname, "..");   // repo root = app/
const SRC = path.join(APP, "src");

/* Declared assembly inputs (layers-spec.md inventory). Order here is the
   DECLARED layer order (core plumbing first, then draw-order slots 1..13);
   the byte order of the output is governed by the global chunk numbers. */
/* s79 THE FOUNDATION CUT (foundation-reset.md §2): the assembly is stripped
   to the substrate. Removed layers (buildings, doodads, people, ships, fauna,
   effects, director, zones-tint, labels-inspect + the legacy splat ground-paint)
   are gone from this list; their sources are deleted on this branch (the `legacy`
   branch preserves every byte). ground-paint is a REWRITE (fresh minimal uniform
   renderer — foundation-reset §3, admission #1). Removed layers re-enter one at a
   time through the admission gate (foundation-reset §3-§4), each re-adding its
   file here. Because whole layers are now absent, the global chunk numbers are
   SPARSE (gaps where removed layers' chunks were) — assembleJS tolerates gaps and
   only rejects duplicates/mis-order (see below). */
const FILES = [
  "vendor/polybool.js",      // s87 — VENDORED polybooljs@1.2.2 (MIT), chunk 00: installs window.PolyBool BEFORE the app IIFE (foundation-reset §4b, the vendored-solved-problems policy; first consumer). Self-contained, zero-dep, deterministic.
  "vendor/rbush.js",         // s90 — VENDORED rbush@3.0.1 (MIT), chunk 07: R-tree screen-box index for labels declutter (module-local RBush). §4b, second consumer.
  "vendor/polylabel.js",     // s90 — VENDORED polylabel@1.1.0 + tinyqueue (ISC), chunk 09: polygon pole-of-inaccessibility for label anchors (module-local polylabel). §4b.
  "core/00-boot.js",
  "core/01-geography.js",
  "core/02-scene.js",
  "core/08-cadastre.js",     // core (s80a) — THE GROUND PLAN cadastre (chunk 04): blocks/plat lots/parcels + groundPlanAt(); folds the zone predicates
  "core/03-sim.js",
  "core/04-roads.js",
  "core/05-routing.js",      // core plumbing (walkBlockedAt/graph) — kept, its removed-layer obstacle inputs stubbed empty
  "core/06-debug.js",
  "core/07-main.js",
  "layers/terrain.js",       // slot 1  — KEPT (s78 1846 baseline)
  "layers/ground-paint.js",  // slot 2  — REWRITE (minimal uniform roads, admission #1)
  "layers/labels.js",        // slot 12 — NEW (s90 admission): lot ground-text · street names · zones & landmarks (chunk 40)
  "layers/camera-input.js",  // slot 11 — KEPT (camera rig + pointer/keys + speed pill; the app must be navigable)
  "layers/ui-chrome.js"      // slot 13 — KEPT (HUD/timeline/menu/clock chrome + ticker + paper)
];

/* THE ATELIER (layers-spec.md slot 15, 2026-07-13): the dev workbench is a
   FULLY SEPARATE artifact — app/atelier.html is the identical assembly PLUS
   the workbench layer appended (chunk 75). The release index.html contains
   ZERO workbench bytes (the file below is simply not part of its assembly);
   loading atelier.html IS the opt-in — no flag, no runtime gate. Deleting
   src/layers/workbench.js + this list + atelier.html erases the tool. */
const ATELIER_FILES = FILES.concat(["layers/workbench.js"]);

const CHUNK_RE = /^\/\* @P1850-CHUNK (\d+) — (.*) \*\/$/;

function parseChunks(file, text) {
  const lines = text.split("\n");
  const chunks = [];
  let cur = null;
  for (const line of lines) {
    const m = CHUNK_RE.exec(line);
    if (m) {
      if (cur) chunks.push(cur);
      cur = { seq: parseInt(m[1], 10), note: m[2], file, body: [] };
    } else if (cur) {
      cur.body.push(line);
    } /* else: file preamble before the first chunk marker — ignored */
  }
  if (cur) chunks.push(cur);
  if (!chunks.length) throw new Error(file + ": no @P1850-CHUNK markers");
  // trailing newline at EOF produces one empty trailing body line — drop exactly one
  const last = chunks[chunks.length - 1];
  if (last.body.length && last.body[last.body.length - 1] === "") last.body.pop();
  return chunks;
}

function assembleJS(files, spliceBeforeLastFrom) {
  /* spliceBeforeLastFrom (atelier only): that file's chunks are dev-tool
     extras spliced immediately BEFORE the final chunk — the final chunk is
     core/07-main's render loop + the module IIFE close (`})();`), and the
     dev tool must execute INSIDE the module closure to reach the layer
     visibility registry and scene internals. Its chunk numbers continue
     the global sequence (75+) purely as bookkeeping. */
  const all = [], extras = [];
  for (const f of files) {
    const chunks = parseChunks(f, fs.readFileSync(path.join(SRC, f), "utf8"));
    if (f === spliceBeforeLastFrom) extras.push(...chunks); else all.push(...chunks);
  }
  all.sort((a, b) => a.seq - b.seq);
  /* s79 FOUNDATION CUT: the chunk numbers are now SPARSE (removed layers left
     gaps in the global sequence). Byte-stability + original execution order are
     still guaranteed by the ascending sort; we no longer require 1..N contiguity
     (that invariant assumed every layer was present). We DO still reject the two
     real hazards the old check caught: a DUPLICATE number (two chunks claiming the
     same slot → nondeterministic order) — reorders are impossible under a stable
     sort of distinct integers. When a removed layer is re-admitted it simply
     re-adds its file + its (still-unique) chunk numbers, closing its own gap. */
  for (let i = 1; i < all.length; i++) {
    if (all[i].seq === all[i - 1].seq)
      throw new Error("duplicate chunk number " + all[i].seq + " (" + all[i].file + " and " + all[i - 1].file + ")");
  }
  extras.sort((a, b) => a.seq - b.seq);
  const seq = extras.length ? all.slice(0, -1).concat(extras, all.slice(-1)) : all;
  return { js: seq.map(c => c.body.join("\n")).join("\n"), chunkCount: seq.length };
}

function assemble() {
  const shell = fs.readFileSync(path.join(SRC, "shell.html"), "utf8");
  const MARK = "<!-- @P1850:APP-JS -->";
  if (shell.indexOf(MARK) < 0) throw new Error("shell.html missing " + MARK);

  const rel = assembleJS(FILES);
  const html = shell.replace(MARK, () => rel.js); // function form: '$&' etc. in the code must stay literal

  /* atelier variant: same shell, same chunks, PLUS the workbench layer
     (spliced inside the module closure, just before the closing chunk).
     A separate artifact by design (removable; release carries zero bytes). */
  const atl = assembleJS(ATELIER_FILES, "layers/workbench.js");
  const atelierHtml = shell.replace(MARK, () => atl.js);
  const chunkCount = rel.chunkCount;

  /* dev variant: replace the whole <script>…marker…</script> block with a
     loader that fetches the same sources and assembles the same module. */
  const devLoader = [
    "<script>",
    "/* @P1850 DEV LOADER — assembles the same module from src/ at runtime.",
    "   Identical semantics to the built index.html (one classic script, one",
    "   IIFE, original chunk order). Requires an http server (fetch). */",
    "(function(){",
    "  var FILES = " + JSON.stringify(FILES) + ";",
    "  var RE = /^\\/\\* @P1850-CHUNK (\\d+) — (.*) \\*\\/$/;",
    "  Promise.all(FILES.map(function(f){",
    "    return fetch('src/'+f).then(function(r){ if(!r.ok) throw new Error('fetch failed: src/'+f); return r.text(); });",
    "  })).then(function(texts){",
    "    var chunks = [];",
    "    texts.forEach(function(text){",
    "      var cur = null;",
    "      text.split('\\n').forEach(function(line){",
    "        var m = RE.exec(line);",
    "        if(m){ if(cur) chunks.push(cur); cur = { seq:+m[1], body:[] }; }",
    "        else if(cur){ cur.body.push(line); }",
    "      });",
    "      if(cur){ if(cur.body.length && cur.body[cur.body.length-1]==='') cur.body.pop(); chunks.push(cur); }",
    "    });",
    "    chunks.sort(function(a,b){ return a.seq-b.seq; });",
    "    var s = document.createElement('script');",
    "    s.textContent = chunks.map(function(c){ return c.body.join('\\n'); }).join('\\n');",
    "    document.body.appendChild(s);",
    "  }).catch(function(e){",
    "    document.getElementById('hud-loading').textContent = 'DEV LOADER FAILED: '+e.message+' — serve app/ over http';",
    "    console.error(e);",
    "  });",
    "})();",
    "</script>"
  ].join("\n");
  const devHtml = shell.replace("<script>\n" + MARK + "\n</script>", () => devLoader);
  if (devHtml === shell) throw new Error("dev splice failed — shell <script> block not in expected shape");

  return { html, atelierHtml, devHtml, chunkCount };
}

const { html, atelierHtml, devHtml, chunkCount } = assemble();
const outPath = path.join(APP, "index.html");
const atelierPath = path.join(APP, "atelier.html");
const devPath = path.join(APP, "index.dev.html");

if (process.argv.includes("--check")) {
  const existing = fs.readFileSync(outPath, "utf8");
  const existingAtelier = fs.existsSync(atelierPath) ? fs.readFileSync(atelierPath, "utf8") : null;
  let ok = true;
  if (existing === html) {
    console.log("CHECK OK: assembled output is byte-identical to app/index.html (" + Buffer.byteLength(html) + " bytes, " + chunkCount + " chunks, " + (Date.now() - t0) + "ms)");
  } else {
    console.error("CHECK FAILED: assembled output differs from app/index.html (existing " + Buffer.byteLength(existing) + " bytes vs assembled " + Buffer.byteLength(html) + " bytes)");
    ok = false;
  }
  if (existingAtelier === atelierHtml) {
    console.log("CHECK OK: assembled atelier output is byte-identical to app/atelier.html (" + Buffer.byteLength(atelierHtml) + " bytes)");
  } else {
    console.error("CHECK FAILED: assembled atelier output differs from app/atelier.html" + (existingAtelier === null ? " (file missing)" : ""));
    ok = false;
  }
  if (!ok) process.exit(1);
} else {
  fs.writeFileSync(outPath, html);
  fs.writeFileSync(atelierPath, atelierHtml);
  fs.writeFileSync(devPath, devHtml);
  console.log("built app/index.html (" + Buffer.byteLength(html) + " bytes) + app/atelier.html (" + Buffer.byteLength(atelierHtml) + " bytes, +workbench) + app/index.dev.html from " + FILES.length + "(+1) files / " + chunkCount + " chunks in " + (Date.now() - t0) + "ms");
}
