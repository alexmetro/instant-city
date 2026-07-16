#!/usr/bin/env node
/* =====================================================================
   tools/verify/shots-ics14c.js — ICS-14c LANDMARK/BUSINESS LEGIBILITY shots
   (operator problem framings: business names over sand ground + grey
   placeholder roofs). Reuses the verify.js mechanism (static server +
   headless chromium via ANGLE SwiftShader + __P1850.jump/camSet/tick) on
   the RELEASE target:
     waterfront-450m @ 1849-12-20 — mid-zoom waterfront, many business
                       names over sand/roofs (the operator's first framing)
     plaza-150m      @ 1849-12-20 — close zoom, plaza-cluster businesses
                       (the operator's second framing)
   Also prints the LIVE labels.contrast per-background decision table for
   the civic voice (the ics14c measurement record).
   Usage: node tools/verify/shots-ics14c.js [prefix]   (default "after")
   Saves under app/screenings/2026-07-16-ics14c/<prefix>-<id>.png.
   DEV-ONLY tooling, never shipped.
   ===================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const http = require("http");
const { chromium } = require("playwright");

const APP_ROOT = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.join(APP_ROOT, "screenings", "2026-07-16-ics14c");
const PREFIX = process.argv[2] || "after";

const SHOTS = [
  { id: "waterfront-450m-1849-12-20", alt: 450, x: 180, z: -70, date: "1849-12-20", note: "mid-zoom waterfront — business names over sand + roofs" },
  { id: "plaza-150m-1849-12-20",      alt: 150,                 date: "1849-12-20", note: "close zoom — plaza-cluster business names" }
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
  await page.goto(`http://127.0.0.1:${srv.port}/index.html`, { waitUntil: "load", timeout: 60000 });
  await page.waitForFunction(() => {
    const v = document.getElementById("hud-loading");
    return v && getComputedStyle(v).display === "none" && window.__P1850;
  }, { timeout: 45000 });
  // give the embedded FontFace load + street re-raster a beat to complete
  await page.evaluate(() => (document.fonts && document.fonts.ready) ? document.fonts.ready.then(() => true) : true);
  const settle = async (n = 60) => { await page.evaluate((k) => { for (let i = 0; i < k; i++) window.__P1850.tick && window.__P1850.tick(0.1); }, n); await new Promise(r => setTimeout(r, 150)); };

  // ---- ICS-14c measurement record: the LIVE contrast audit's civic table ----
  const contrast = await page.evaluate(() => {
    const all = window.__P1850.audits.runAll().results;
    const a = all.find(r => r.layer === "labels" && r.audit === "contrast");
    return a ? { pass: a.pass, detail: (a.detail || a) } : null;
  });
  if (contrast) {
    const d = contrast.detail;
    console.log(`labels.contrast: pass=${contrast.pass} min=${d.minContrastRatio} worst=${JSON.stringify(d.worstCase)}`);
    (d.styles || []).forEach(s => console.log(`  ${String(s.style).padEnd(7)} ALLmin ${s.minRatio} @${s.worstBg}   HOSTmin ${s.hostMin} @${s.hostWorstBg}   host=${JSON.stringify(s.hostFam)}`));
    const civ = (d.styles || []).find(s => s.style === "civic");
    if (civ && civ.perBg) {
      console.log("  civic per-background decision table:");
      civ.perBg.forEach(p => console.log(`    ${p.bg.padEnd(10)} ${p.host ? "HOST" : "    "} ring=${p.ringSep} inkVsCasing=${p.inkVsCasing} inkVsBg=${p.inkVsBg} -> ${p.score}`));
    }
  }

  for (const s of SHOTS) {
    await page.evaluate((iso) => window.__P1850.jump(iso), s.date);
    await page.evaluate((o) => window.__P1850.camSet({
      alt: o.alt,
      x: (o.x != null ? o.x : window.__P1850.plazaCenter.x),
      z: (o.z != null ? o.z : window.__P1850.plazaCenter.z),
      snap: true
    }), s);
    await settle(80);
    await page.evaluate(() => window.__P1850.render && window.__P1850.render());
    const dest = path.join(OUT_DIR, `${PREFIX}-${s.id}.png`);
    const canvas = await page.$("canvas");
    await canvas.screenshot({ path: dest });
    // declutter proof at this framing (overlap-free placement is absolute)
    const decl = await page.evaluate(() => {
      const all = window.__P1850.audits.runAll().results;
      const a = all.find(r => r.layer === "labels" && r.audit === "declutter");
      return a ? { pass: a.pass, placed: (a.detail || a).placed, suppressed: (a.detail || a).suppressed, bad: ((a.detail || a).bad || []).length } : null;
    });
    console.log(`SHOT ${PREFIX}-${s.id}.png (${s.alt}m @ ${s.date}) — ${s.note}`);
    if (decl) console.log(`  declutter @ framing: pass=${decl.pass} placed=${decl.placed} suppressed=${decl.suppressed} overlaps=${decl.bad}`);
  }
  await browser.close();
  srv.server.close();
  console.log("done →", OUT_DIR);
})().catch((e) => { console.error("SHOTS CRASH:", e); process.exit(1); });
