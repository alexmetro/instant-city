#!/usr/bin/env node
/* =====================================================================
   tools/verify/probe-res3.js — RES-3 evidence probe (label typography:
   R1 street abbreviation ladder, R2 two-line POI hierarchy, R3 continuous
   variable-anchor, R4 pairing contract).
   Produces, against the CURRENT build:
     • AFTER screenshots at the three canonical label framings;
     • FAIL-BEFORE / PASS-AFTER evidence for the new audits by disabling the
       mechanism (__P1850.labelsSetAbbrev / labelsSetPoiSub) — the audits
       measure the PROPERTY, so the pre-RES-3 behavior goes RED — plus the
       matching BEFORE-behavior screenshots;
     • the measured poiSub contrast table (contrast audit, per background);
     • the RES-3 state census (abbreviations placed, anchor census, displaced
       names, pairing gates) per framing;
     • updateLabels frame cost (mean over 300 calls) per framing.
   Usage: node tools/verify/probe-res3.js
   Saves under app/screenings/2026-07-16-res3/ + prints a JSON summary.
   DEV-ONLY tooling, never shipped.
   ===================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const http = require("http");
const { chromium } = require("playwright");

const APP_ROOT = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.join(APP_ROOT, "screenings", "2026-07-16-res3");

const FRAMINGS = [
  { id: "overview-1500m", alt: 1500, date: "1849-09-15" },
  { id: "town-500m",      alt: 500,  date: "1849-09-15" },
  { id: "plaza-150m",     alt: 150,  date: "1849-12-20" }
];

function startServer(root) {
  const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    const fp = path.join(root, p);
    if (!fp.startsWith(root)) { res.writeHead(403); return res.end(); }
    fs.readFile(fp, (err, buf) => {
      if (err) { res.writeHead(404); return res.end("not found: " + p); }
      res.writeHead(200, { "Content-Type": MIME[path.extname(fp).toLowerCase()] || "application/octet-stream" });
      res.end(buf);
    });
  });
  return new Promise((r) => server.listen(0, "127.0.0.1", () => r({ server, port: server.address().port })));
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const srv = await startServer(APP_ROOT);
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist",
           "--enable-webgl", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"]
  });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error("PAGEERROR:", String(e.message || e)));
  page.on("console", (m) => { if (m.type() === "error") console.error("CONSOLE.ERROR:", m.text()); });

  await page.goto(`http://127.0.0.1:${srv.port}/index.html`, { waitUntil: "load", timeout: 60000 });
  await page.waitForFunction(() => {
    const v = document.getElementById("hud-loading");
    return v && getComputedStyle(v).display === "none" && window.__P1850 && window.__P1850.labelsResState;
  }, { timeout: 45000 });
  await page.evaluate(() => (document.fonts && document.fonts.ready) ? document.fonts.ready.then(() => true) : true);

  const settle = async (n = 60) => {
    await page.evaluate((k) => { for (let i = 0; i < k; i++) window.__P1850.tick && window.__P1850.tick(0.1); }, n);
    // drive real frames too — the settle/declutter passes live inside the
    // wrapped renderer.render, which tick alone may not reach
    await page.evaluate(() => { for (let i = 0; i < 40; i++) window.__P1850.labelsUpdate && window.__P1850.labelsUpdate(); window.__P1850.render && window.__P1850.render(); });
    await new Promise(r => setTimeout(r, 120));
  };
  const frame = async (f) => {
    await page.evaluate((iso) => window.__P1850.jump(iso), f.date);
    await page.evaluate((o) => window.__P1850.camSet({ alt: o.alt, x: window.__P1850.plazaCenter.x, z: window.__P1850.plazaCenter.z, snap: true }), f);
    await settle(80);
    await page.evaluate(() => window.__P1850.render && window.__P1850.render());
  };
  const shoot = async (name) => {
    const canvas = await page.$("canvas");
    await canvas.screenshot({ path: path.join(OUT_DIR, name) });
    console.log("SHOT " + name);
  };
  const audit = (n) => page.evaluate((name) => window.__P1850.audits.labels[name](), n);
  const state = () => page.evaluate(() => window.__P1850.labelsResState());
  const cost = () => page.evaluate(() => {
    const u = window.__P1850.labelsUpdate; const t0 = performance.now();
    for (let i = 0; i < 300; i++) u();
    return +((performance.now() - t0) / 300).toFixed(3);
  });

  const summary = { framings: {}, failBefore: {}, poiSubContrast: null };

  for (const f of FRAMINGS) {
    await frame(f);
    await shoot(`after-${f.id}.png`);
    const st = await state();
    const aAbbr = await audit("streetAbbrev"), aPair = await audit("poiPairing"), aSub = await audit("poiSubtitle"), aDecl = await audit("declutter");
    const ms = await cost();
    summary.framings[f.id] = {
      state: st, updateMs: ms,
      streetAbbrev: { pass: aAbbr.pass, abbrPlaced: aAbbr.abbrPlaced, suppressedChecked: aAbbr.suppressedChecked },
      poiPairing: { pass: aPair.pass, namesPlaced: aPair.namesPlaced, pairsChecked: aPair.pairsChecked, gates: aPair.pairGatesLastFrame },
      poiSubtitle: { pass: aSub.pass, expectOn: aSub.expectOn, withSubtitle: aSub.withSubtitle, namesChecked: aSub.namesChecked },
      declutter: { pass: aDecl.pass, placed: aDecl.placed, suppressed: aDecl.suppressed }
    };
    console.log(`FRAMING ${f.id}: updateLabels ${ms} ms | abbrPlaced ${st.abbrPlaced} | anchors ${JSON.stringify(st.anchorCensus)} | subs ${st.subActive} | pairGates ${st.pairGatesLastFrame}`);
  }

  /* ---- FAIL-BEFORE / PASS-AFTER: R1 street abbreviation (town, pressure) ---- */
  await frame(FRAMINGS[1]);   // town-500m
  await page.evaluate(() => window.__P1850.labelsSetAbbrev(false));
  await settle(80);
  const abbrBefore = await audit("streetAbbrev");
  await page.evaluate(() => window.__P1850.render && window.__P1850.render());
  await shoot("before-abbrev-town-500m.png");
  await page.evaluate(() => window.__P1850.labelsSetAbbrev(true));
  await settle(80);
  const abbrAfter = await audit("streetAbbrev");
  await page.evaluate(() => window.__P1850.render && window.__P1850.render());
  await shoot("after-abbrev-town-500m.png");
  summary.failBefore.streetAbbrev = {
    before: { pass: abbrBefore.pass, bad: abbrBefore.bad, suppressedChecked: abbrBefore.suppressedChecked },
    after: { pass: abbrAfter.pass, abbrPlaced: abbrAfter.abbrPlaced, abbrTexts: (await state()).abbrPlacedTexts }
  };
  console.log(`streetAbbrev fail-before: before pass=${abbrBefore.pass} (${(abbrBefore.bad||[]).length} bad), after pass=${abbrAfter.pass} (${abbrAfter.abbrPlaced} abbreviated)`);

  /* also at the plaza (closest zoom pressure) */
  await frame(FRAMINGS[2]);
  await page.evaluate(() => window.__P1850.labelsSetAbbrev(false));
  await settle(80);
  const abbrBeforeP = await audit("streetAbbrev");
  await page.evaluate(() => window.__P1850.labelsSetAbbrev(true));
  await settle(80);
  const abbrAfterP = await audit("streetAbbrev");
  summary.failBefore.streetAbbrevPlaza = { beforePass: abbrBeforeP.pass, beforeBad: (abbrBeforeP.bad||[]).length, afterPass: abbrAfterP.pass, abbrPlaced: abbrAfterP.abbrPlaced };

  /* ---- FAIL-BEFORE / PASS-AFTER: R2 subtitle (plaza, closest zoom) ---- */
  await page.evaluate(() => window.__P1850.labelsSetPoiSub(false));
  await settle(80);
  const subBefore = await audit("poiSubtitle");
  await page.evaluate(() => window.__P1850.render && window.__P1850.render());
  await shoot("before-subtitle-plaza-150m.png");
  await page.evaluate(() => window.__P1850.labelsSetPoiSub(true));
  await settle(80);
  const subAfter = await audit("poiSubtitle");
  await page.evaluate(() => window.__P1850.render && window.__P1850.render());
  await shoot("after-subtitle-plaza-150m.png");
  summary.failBefore.poiSubtitle = {
    before: { pass: subBefore.pass, bad: (subBefore.bad||[]).slice(0,3), expectOn: subBefore.expectOn },
    after: { pass: subAfter.pass, withSubtitle: subAfter.withSubtitle, namesChecked: subAfter.namesChecked }
  };
  console.log(`poiSubtitle fail-before: before pass=${subBefore.pass}, after pass=${subAfter.pass} (${subAfter.withSubtitle}/${subAfter.namesChecked} with subtitle)`);

  /* ---- the measured poiSub contrast table ---- */
  const contrast = await audit("contrast");
  summary.poiSubContrast = contrast.styles.find((s) => s.style === "poiSub") || null;
  summary.contrastPass = contrast.pass;
  summary.contrastWorst = contrast.worstCase;

  fs.writeFileSync(path.join(OUT_DIR, "probe-res3-summary.json"), JSON.stringify(summary, null, 2));
  console.log("\nSummary written to " + path.join(OUT_DIR, "probe-res3-summary.json"));

  await browser.close();
  srv.server.close();
})().catch((e) => { console.error("PROBE CRASH:", e); process.exit(2); });
