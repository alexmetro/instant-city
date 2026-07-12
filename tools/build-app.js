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
const FILES = [
  "core/00-boot.js",
  "core/01-geography.js",
  "core/02-scene.js",
  "core/03-sim.js",
  "core/04-roads.js",
  "core/05-routing.js",
  "core/06-debug.js",
  "core/07-main.js",
  "layers/terrain.js",       // slot 1
  "layers/ground-paint.js",  // slot 2
  "layers/zones-tint.js",    // slot 3
  "layers/buildings.js",     // slot 4
  "layers/doodads.js",       // slot 5
  "layers/people.js",        // slot 6
  "layers/ships.js",         // slot 7
  "layers/fauna.js",         // slot 8
  "layers/effects.js",       // slot 9
  "layers/labels-inspect.js",// slot 10
  "layers/camera-input.js",  // slot 11
  "layers/director.js",      // slot 12
  "layers/ui-chrome.js"      // slot 13
];

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

function assemble() {
  const all = [];
  for (const f of FILES) {
    const p = path.join(SRC, f);
    all.push(...parseChunks(f, fs.readFileSync(p, "utf8")));
  }
  all.sort((a, b) => a.seq - b.seq);
  all.forEach((c, i) => {
    if (c.seq !== i + 1) throw new Error("chunk sequence broken at " + c.seq + " (" + c.file + ") — expected " + (i + 1));
  });
  const js = all.map(c => c.body.join("\n")).join("\n");

  const shell = fs.readFileSync(path.join(SRC, "shell.html"), "utf8");
  const MARK = "<!-- @P1850:APP-JS -->";
  if (shell.indexOf(MARK) < 0) throw new Error("shell.html missing " + MARK);
  const html = shell.replace(MARK, () => js); // function form: '$&' etc. in the code must stay literal

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

  return { html, devHtml, chunkCount: all.length };
}

const { html, devHtml, chunkCount } = assemble();
const outPath = path.join(APP, "index.html");
const devPath = path.join(APP, "index.dev.html");

if (process.argv.includes("--check")) {
  const existing = fs.readFileSync(outPath, "utf8");
  if (existing === html) {
    console.log("CHECK OK: assembled output is byte-identical to app/index.html (" + Buffer.byteLength(html) + " bytes, " + chunkCount + " chunks, " + (Date.now() - t0) + "ms)");
  } else {
    console.error("CHECK FAILED: assembled output differs from app/index.html (existing " + Buffer.byteLength(existing) + " bytes vs assembled " + Buffer.byteLength(html) + " bytes)");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outPath, html);
  fs.writeFileSync(devPath, devHtml);
  console.log("built app/index.html (" + Buffer.byteLength(html) + " bytes) + app/index.dev.html from " + FILES.length + " files / " + chunkCount + " chunks in " + (Date.now() - t0) + "ms");
}
