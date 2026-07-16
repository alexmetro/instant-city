#!/usr/bin/env node
/* =====================================================================
   tools/verify/shots-ics14b.js — ICS-14b OUTER-GLOW REMOVAL screening
   (operator, live-build screenshot: the street voice's light outer glow
   smeared into a fog ring at oblique/grazing camera angles; ink + thin
   casing only now, the Maps treatment — street + district caps + the
   civic/landmark name voice).
   Reuses the verify.js mechanism (static server + headless chromium via
   ANGLE SwiftShader + __P1850.jump/camSet/tick) on the RELEASE target:
     oblique-town-350m  @ 1849-09-15 — pitchOff -0.62 (grazing angle, the
                                       operator's framing: labels at a low
                                       slant where the glow used to fog)
     oblique-plaza-220m @ 1849-09-15 — closer grazing pass over the plaza
     plaza-150m         @ 1849-09-15 — straight close zoom (Bold band)
   Usage: node tools/verify/shots-ics14b.js [prefix]   (default "after")
   Saves under app/screenings/2026-07-16-ics14b/<prefix>-<id>.png.
   DEV-ONLY tooling, never shipped.
   ===================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const http = require("http");
const { chromium } = require("playwright");

const APP_ROOT = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.join(APP_ROOT, "screenings", "2026-07-16-ics14b");
const PREFIX = process.argv[2] || "after";

const SHOTS = [
  { id: "oblique-town-350m-1849-09-15",  alt: 350, pitchOff: -0.62, yaw: 0.55, date: "1849-09-15", note: "grazing angle — street names, no glow fog" },
  { id: "oblique-plaza-220m-1849-09-15", alt: 220, pitchOff: -0.62, yaw: 2.30, date: "1849-09-15", note: "grazing angle close — Bold band + landmark names" },
  { id: "plaza-150m-1849-09-15",         alt: 150, pitchOff: 0,     yaw: 0,    date: "1849-09-15", note: "straight close zoom" }
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

  for (const s of SHOTS) {
    await page.evaluate((iso) => window.__P1850.jump(iso), s.date);
    await page.evaluate((o) => window.__P1850.camSet({ alt: o.alt, pitchOff: o.pitchOff, yaw: o.yaw, x: window.__P1850.plazaCenter.x, z: window.__P1850.plazaCenter.z, snap: true }), s);
    await settle(80);
    await page.evaluate(() => window.__P1850.render && window.__P1850.render());
    const dest = path.join(OUT_DIR, `${PREFIX}-${s.id}.png`);
    const canvas = await page.$("canvas");
    await canvas.screenshot({ path: dest });
    // contrast proof at the live build — the audit measures the actual rings
    const con = await page.evaluate(() => {
      const all = window.__P1850.audits.runAll().results;
      const a = all.find(r => r.layer === "labels" && r.audit === "contrast");
      const d = a ? (a.detail || a) : null;
      return d ? { pass: d.pass, min: d.minContrastRatio, worst: d.worstCase } : null;
    });
    console.log(`SHOT ${PREFIX}-${s.id}.png (${s.alt}m pitchOff=${s.pitchOff} @ ${s.date}) — ${s.note}`);
    if (con) console.log(`  labels.contrast: pass=${con.pass} min=${con.min} worst=${con.worst.style}@${con.worst.bg}`);
  }
  await browser.close();
  srv.server.close();
  console.log("done →", OUT_DIR);
})().catch((e) => { console.error("SHOTS CRASH:", e); process.exit(1); });
