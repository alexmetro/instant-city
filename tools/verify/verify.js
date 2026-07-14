#!/usr/bin/env node
/* =====================================================================
   tools/verify/verify.js — THE VERIFICATION HARNESS (Project 1850, s89
   ITEM 0; foundation-reset §3 gate). DEV-ONLY tooling — NEVER shipped;
   the app stays single-file. This directory carries its own package.json
   and vendors Playwright LOCALLY (node_modules here, gitignored).

   One command replaces hand-driving the build:
     node tools/verify/verify.js [--url <url>] [--file <path>] [--headed]
       (no target flag) → serve the worktree over http and verify BOTH
         built targets: /index.html (release) and /atelier.html (dev).
       --url  <url>   → verify a single already-served URL.
       --file <path>  → verify a single local file (served over http from
                        its directory; file:// is avoided so data sidecars
                        and any fetch() load identically to production).
       --headed       → show the browser (default: headless, GL via ANGLE
                        SwiftShader so WebGL boots without a GPU).

   For EACH target it:
     1. installs error traps BEFORE load (pageerror + console[error]);
     2. asserts BOOT — the #hud-loading veil clears (07-main sets it to
        display:none), window.__P1850 exists, zero uncaught, zero console
        errors;
     3. runs the NOON PROTOCOL — jumps to the four canonical noon dates
        (1846-07-01, 1848-04-01, 1849-09-15, 1849-12-20), settles frames,
        runs __P1850.audits.runAll(), parses pass/fail AND the `skipped`
        flags. ANY fail — or any audit skipped at noon — is RED;
     4. runs the MEASUREMENT TABLES via __P1850.verify.* (geodetic fit,
        paint-vs-centerline, lot-vs-ROW) and checks them against the
        fixtures/osm-controls.json gates;
     5. captures canonical framing SCREENSHOTS of the WebGL canvas
        (Playwright canvas screenshot; falls back to the in-page __wbShot
        framebuffer grab if the canvas reads black).

   Emits report/report.json (machine-readable) + report/report.md (human
   summary). Exit code 0 = all green; 1 = any red (boot / audit / measure).
   ===================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const http = require("http");
const { chromium } = require("playwright");

const HARNESS_DIR = __dirname;
const APP_ROOT = path.resolve(HARNESS_DIR, "..", "..");        // worktree root (app/)
const REPORT_DIR = path.join(HARNESS_DIR, "report");
const SHOT_DIR = path.join(REPORT_DIR, "shots");
const FIXTURE = JSON.parse(fs.readFileSync(path.join(HARNESS_DIR, "fixtures", "osm-controls.json"), "utf8"));

const CANONICAL_DATES = ["1846-07-01", "1848-04-01", "1849-09-15", "1849-12-20"];

/* SKIP SEMANTICS (learned from the baseline). runAll() copies an audit's
   `skipped` field verbatim, but two DIFFERENT conventions collide there:
     • a TRUE audit-level skip returns {pass:true, skipped:"<reason string>"}
       — the audit could not run (its subject is absent). Only STRING skips
       count as audit-level skips here.
     • a detail field: ground-paint.constantWidth returns {skipped:[ids]} as
       per-street bookkeeping — the audit RAN and returned a real pass/fail.
       An ARRAY `skipped` is NOT an audit-level skip; we ignore it.
   Per the NOON PROTOCOL, an audit-level skip AT NOON is RED — UNLESS it is a
   known STRUCTURAL absence on the foundation branch (a whole layer is
   deliberately unadmitted, foundation-reset §4). Those are allow-listed with
   their reason; a skip NOT on this list (or any fail) stays RED. */
const ALLOWED_SKIPS = {
  "placement.anchorageHeading": "ships layer unadmitted on the foundation branch (needs ≥2 anchored hulls)",
  "placement.hullOverlap": "ships layer unadmitted on the foundation branch",
  "placement.storeshipMud": "ships layer unadmitted on the foundation branch",
  "placement.moorings": "Central Wharf + ships unadmitted / date-gated on the foundation branch",
  "placement.wharfContinuity": "Central Wharf unadmitted / date-gated on the foundation branch",
  "placement.fences": "buildings-v2 layer unadmitted on the foundation branch (no yard fences built)"
};
function isStringSkip(s) { return typeof s === "string" && s.length > 0; }
// canonical framings: alt (metres) + a note; the harness writes camSet then
// snaps and captures. Zones→streets→lots choreography reads across altitudes.
const FRAMINGS = [
  { id: "overview-1500m", alt: 1500, date: "1849-09-15", note: "region/zone band" },
  { id: "town-500m",      alt: 500,  date: "1849-09-15", note: "street band" },
  { id: "plaza-150m",     alt: 150,  date: "1849-12-20", note: "lot band" }
];

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? (args[i + 1] || true) : null; };
const HEADED = args.includes("--headed");
const URL_ARG = flag("--url");
const FILE_ARG = flag("--file");

function log(...a) { console.log(...a); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---- minimal static file server rooted at a directory (no deps) ---- */
function startServer(root) {
  const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json",
    ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".ico": "image/x-icon" };
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    const fp = path.join(root, p);
    if (!fp.startsWith(root)) { res.writeHead(403); return res.end("forbidden"); }
    fs.readFile(fp, (err, buf) => {
      if (err) { res.writeHead(404); return res.end("not found: " + p); }
      res.writeHead(200, { "Content-Type": MIME[path.extname(fp).toLowerCase()] || "application/octet-stream" });
      res.end(buf);
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port })));
}

/* ---- per-target verification ---- */
async function verifyTarget(browser, url, label) {
  const t = { label, url, boot: null, noon: [], measurements: null, shots: [], errors: [], red: false };
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  // error traps BEFORE load
  page.on("pageerror", (e) => t.errors.push({ type: "pageerror", msg: String(e.message || e) }));
  page.on("console", (m) => { if (m.type() === "error") t.errors.push({ type: "console.error", msg: m.text() }); });

  log(`\n=== ${label} :: ${url} ===`);
  try {
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
  } catch (e) {
    t.red = true; t.boot = { ok: false, why: "navigation failed: " + e.message };
    await ctx.close(); return t;
  }

  // BOOT: veil clears + __P1850 exists
  let booted = false;
  try {
    await page.waitForFunction(() => {
      const v = document.getElementById("hud-loading");
      const veilGone = v && (v.style.display === "none" || getComputedStyle(v).display === "none");
      return veilGone && window.__P1850 && typeof window.__P1850.audits === "object";
    }, { timeout: 45000 });
    booted = true;
  } catch (e) { /* fall through — boot failed */ }
  const errCountAtBoot = t.errors.length;
  t.boot = { ok: booted && errCountAtBoot === 0, veilCleared: booted, consoleErrorsAtBoot: errCountAtBoot };
  if (!t.boot.ok) { t.red = true; log(`  BOOT: RED (veilCleared=${booted}, errors=${errCountAtBoot})`); }
  else log(`  BOOT: green (0 errors)`);
  if (!booted) { await ctx.close(); return t; }

  // settle a few frames (CDP tabs may stall rAF — nudge via the manual tick hook)
  const settle = async (n = 30) => { await page.evaluate((k) => { for (let i = 0; i < k; i++) window.__P1850.tick && window.__P1850.tick(0.1); }, n); await sleep(120); };

  // NOON PROTOCOL
  for (const d of CANONICAL_DATES) {
    const before = t.errors.length;
    await page.evaluate((iso) => window.__P1850.jump(iso), d);
    await settle(40);
    const res = await page.evaluate(() => window.__P1850.audits.runAll());
    // only STRING skips are audit-level skips (array `skipped` is detail bookkeeping)
    const allSkips = res.results.filter((r) => isStringSkip(r.skipped)).map((r) => ({ audit: r.layer + "." + r.audit, why: r.skipped }));
    const unexpectedSkips = allSkips.filter((s) => !ALLOWED_SKIPS[s.audit]);
    const allowedSkips = allSkips.filter((s) => ALLOWED_SKIPS[s.audit]);
    const failed = res.results.filter((r) => !r.pass).map((r) => ({ audit: r.layer + "." + r.audit, detail: r.detail }));
    const newErrors = t.errors.length - before;
    const red = !res.pass || unexpectedSkips.length > 0 || newErrors > 0;
    if (red) t.red = true;
    t.noon.push({ date: d, pass: res.pass, ran: res.ran, failed: res.failed, failedList: failed,
      unexpectedSkips, allowedSkips, newConsoleErrors: newErrors, red });
    log(`  NOON ${d}: ${red ? "RED" : "green"} — ${res.ran} audits, ${res.failed} failed, ${unexpectedSkips.length} unexpected-skip, ${allowedSkips.length} allowed-skip, ${newErrors} new errors`);
    if (failed.length) failed.slice(0, 6).forEach((f) => log(`     FAIL ${f.audit}`));
    if (unexpectedSkips.length) unexpectedSkips.forEach((s) => log(`     SKIP(unexpected) ${s.audit}: ${s.why}`));
  }

  // MEASUREMENT TABLES (verify hooks) — sampled at the mid canonical date
  await page.evaluate((iso) => window.__P1850.jump(iso), "1849-09-15");
  await settle(30);
  let measure = null;
  try {
    measure = await page.evaluate(() => (window.__P1850.verify ? window.__P1850.verify.tables() : null));
  } catch (e) { t.errors.push({ type: "measure", msg: e.message }); }
  if (measure) {
    const g = measure.geodeticFit || {};
    const gates = FIXTURE._meta.gates;
    const geoOk = (g.datasetFitRms_m <= gates.datasetFitRms_m) && (g.canonicalEndToEndRms_m <= gates.canonicalEndToEndRms_m)
      && (g.azimuthDriftDeg <= gates.azimuthDriftDeg) && (Number(g.worldToGridRoundTripMax_m) <= gates.worldToGridRoundTrip_m);
    const pa = measure.paintAlignment || {};
    const paintOk = ["constantWidth", "eraPaint", "oneOwner", "roadDarkerThanGround"].every((k) => pa[k] && pa[k].pass);
    const lf = measure.lotFit || {};
    const lotOk = ["platClosure", "lotDeterminism", "parcelIntegrity", "platFrame"].every((k) => lf[k] && lf[k].pass);
    const mred = !(geoOk && paintOk && lotOk);
    if (mred) t.red = true;
    t.measurements = { geoOk, paintOk, lotOk, geodeticFit: g, paintAlignment: pa, lotFit: lf, red: mred };
    log(`  MEASURE: ${mred ? "RED" : "green"} — geo=${geoOk} paint=${paintOk} lot=${lotOk} (fitRMS ${g.datasetFitRms_m}m, e2eRMS ${g.canonicalEndToEndRms_m}m)`);
  } else { t.red = true; log("  MEASURE: RED (no __P1850.verify hooks)"); }

  // SCREENSHOTS at canonical framings
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  for (const f of FRAMINGS) {
    await page.evaluate((iso) => window.__P1850.jump(iso), f.date);
    await page.evaluate((o) => { window.__P1850.camSet({ alt: o.alt, x: window.__P1850.plazaCenter.x, z: window.__P1850.plazaCenter.z, snap: true }); }, f);
    await settle(50);
    await page.evaluate(() => window.__P1850.render && window.__P1850.render());
    const name = `${label}-${f.id}.png`;
    const dest = path.join(SHOT_DIR, name);
    let ok = false;
    try {
      const canvas = await page.$("canvas");
      if (canvas) { await canvas.screenshot({ path: dest }); ok = true; }
    } catch (e) { /* fall back below */ }
    if (!ok) {
      try {
        const dataUrl = await page.evaluate(() => (window.__wbShot ? window.__wbShot() : (document.querySelector("canvas") ? document.querySelector("canvas").toDataURL("image/png") : null)));
        if (dataUrl) { fs.writeFileSync(dest, Buffer.from(dataUrl.split(",")[1], "base64")); ok = true; }
      } catch (e) { /* leave unshot */ }
    }
    t.shots.push({ framing: f.id, alt: f.alt, date: f.date, note: f.note, file: ok ? path.relative(REPORT_DIR, dest) : null });
    log(`  SHOT ${f.id} (${f.alt}m @ ${f.date}): ${ok ? "captured" : "FAILED"}`);
  }

  await ctx.close();
  return t;
}

async function main() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  let srv = null, targets = [];

  if (URL_ARG && typeof URL_ARG === "string") {
    targets = [{ url: URL_ARG, label: "url" }];
  } else if (FILE_ARG && typeof FILE_ARG === "string") {
    const abs = path.resolve(FILE_ARG);
    srv = await startServer(path.dirname(abs));
    targets = [{ url: `http://127.0.0.1:${srv.port}/${path.basename(abs)}`, label: path.basename(abs).replace(/\.html$/, "") }];
  } else {
    srv = await startServer(APP_ROOT);
    targets = [
      { url: `http://127.0.0.1:${srv.port}/index.html`, label: "index" },
      { url: `http://127.0.0.1:${srv.port}/atelier.html`, label: "atelier" }
    ];
  }

  const browser = await chromium.launch({
    headless: !HEADED,
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist",
           "--enable-webgl", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"]
  });

  const results = [];
  for (const tgt of targets) results.push(await verifyTarget(browser, tgt.url, tgt.label));
  await browser.close();
  if (srv) srv.server.close();

  const overallRed = results.some((r) => r.red);
  const report = {
    generatedAt: new Date().toISOString(),
    appRoot: APP_ROOT,
    canonicalDates: CANONICAL_DATES,
    fixture: FIXTURE._meta.provenance,
    overall: overallRed ? "RED" : "GREEN",
    targets: results
  };
  fs.writeFileSync(path.join(REPORT_DIR, "report.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(REPORT_DIR, "report.md"), renderMarkdown(report));
  log(`\n===== OVERALL: ${report.overall} =====`);
  log(`report/report.json + report/report.md written`);
  process.exit(overallRed ? 1 : 0);
}

function renderMarkdown(r) {
  const L = [];
  L.push(`# P1850 Verification Report`);
  L.push(``);
  L.push(`- Generated: ${r.generatedAt}`);
  L.push(`- Overall: **${r.overall}**`);
  L.push(`- Canonical noon dates: ${r.canonicalDates.join(", ")}`);
  L.push(`- Geodesic fixture: ${r.fixture}`);
  L.push(``);
  for (const t of r.targets) {
    L.push(`## ${t.label} — ${t.red ? "RED" : "GREEN"}`);
    L.push(`\`${t.url}\``);
    L.push(``);
    L.push(`**Boot:** ${t.boot && t.boot.ok ? "green" : "RED"} (veilCleared=${t.boot ? t.boot.veilCleared : "?"}, consoleErrorsAtBoot=${t.boot ? t.boot.consoleErrorsAtBoot : "?"})`);
    L.push(``);
    L.push(`**Noon protocol:**`);
    L.push(``);
    L.push(`| date | verdict | audits | failed | unexpected-skip | allowed-skip | new errors |`);
    L.push(`|---|---|---|---|---|---|---|`);
    for (const n of t.noon) L.push(`| ${n.date} | ${n.red ? "RED" : "green"} | ${n.ran} | ${n.failed} | ${n.unexpectedSkips.length} | ${n.allowedSkips.length} | ${n.newConsoleErrors} |`);
    L.push(``);
    const anyFail = t.noon.flatMap((n) => n.failedList.map((f) => `${n.date}: ${f.audit}`));
    if (anyFail.length) { L.push(`Failing audits (RED):`); anyFail.forEach((f) => L.push(`- ${f}`)); L.push(``); }
    const anyUnexp = t.noon.flatMap((n) => n.unexpectedSkips.map((s) => `${n.date}: ${s.audit} (${s.why})`));
    if (anyUnexp.length) { L.push(`Unexpected skips-at-noon (RED per protocol):`); anyUnexp.forEach((s) => L.push(`- ${s}`)); L.push(``); }
    const allowed = [...new Set(t.noon.flatMap((n) => n.allowedSkips.map((s) => `${s.audit} — ${s.why}`)))];
    if (allowed.length) { L.push(`Allowed structural skips (foundation branch, not red):`); allowed.forEach((s) => L.push(`- ${s}`)); L.push(``); }
    if (t.measurements) {
      const m = t.measurements, g = m.geodeticFit;
      L.push(`**Measurement tables:** ${m.red ? "RED" : "green"} — geo=${m.geoOk} paint=${m.paintOk} lot=${m.lotOk}`);
      L.push(``);
      L.push(`- Geodetic fit: datasetFitRMS ${g.datasetFitRms_m} m, canonical end-to-end RMS ${g.canonicalEndToEndRms_m} m (max ${g.canonicalEndToEndMax_m} m @ ${g.worst}), azimuth drift ${g.azimuthDriftDeg}°, round-trip ${g.worldToGridRoundTripMax_m} m`);
      L.push(`- Paint-vs-centerline: ${["constantWidth", "eraPaint", "oneOwner", "roadDarkerThanGround"].map((k) => k + "=" + (m.paintAlignment[k] && m.paintAlignment[k].pass ? "ok" : "FAIL")).join(", ")}`);
      L.push(`- Lot-vs-ROW: ${["platClosure", "lotDeterminism", "parcelIntegrity", "platFrame"].map((k) => k + "=" + (m.lotFit[k] && m.lotFit[k].pass ? "ok" : "FAIL")).join(", ")}`);
      L.push(``);
    }
    if (t.shots.length) {
      L.push(`**Screenshots:**`);
      for (const s of t.shots) L.push(`- ${s.framing} (${s.alt}m @ ${s.date}, ${s.note}): ${s.file ? s.file : "FAILED"}`);
      L.push(``);
    }
    if (t.errors.length) {
      L.push(`**Errors (${t.errors.length}):**`);
      t.errors.slice(0, 12).forEach((e) => L.push(`- [${e.type}] ${e.msg}`));
      L.push(``);
    }
  }
  return L.join("\n");
}

main().catch((e) => { console.error("HARNESS CRASH:", e); process.exit(2); });
