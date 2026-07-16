#!/usr/bin/env node
/* =====================================================================
   tools/verify/shots-ics13.js — ICS-13 POI SYMBOLS screening shots.
   Reuses the verify.js mechanism (static server + headless chromium via
   ANGLE SwiftShader + __P1850.jump/camSet/tick) to capture the brief's
   framings on the RELEASE target (index.html — POI symbols default ON):
     town-500m   @ 1849-09-15  — the four categories at the street band
     plaza-150m  @ 1849-09-15  — the plaza cluster close up
     overview-1500m @ 1849-09-15 — the far fade (poi band 900→1600 m)
     town-500m   @ 1848-04-01  — date-awareness (pre-rush: far fewer pins)
   Saves under app/screenings/2026-07-16-ics13/ and prints the poiSymbols
   audit's per-bucket census at each date. DEV-ONLY tooling, never shipped.
   ===================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const http = require("http");
const { chromium } = require("playwright");

const APP_ROOT = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.join(APP_ROOT, "screenings", "2026-07-16-ics13");

const SHOTS = [
  { id: "town-500m-1849-09-15",      alt: 500,  date: "1849-09-15", note: "street band, four categories" },
  { id: "plaza-150m-1849-09-15",     alt: 150,  date: "1849-09-15", note: "plaza cluster close up" },
  { id: "overview-1500m-1849-09-15", alt: 1500, date: "1849-09-15", note: "far fade (poi band 900-1600m)" },
  { id: "town-500m-1848-04-01",      alt: 500,  date: "1848-04-01", note: "date-awareness: pre-rush set" }
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
  const settle = async (n = 50) => { await page.evaluate((k) => { for (let i = 0; i < k; i++) window.__P1850.tick && window.__P1850.tick(0.1); }, n); await new Promise(r => setTimeout(r, 120)); };

  for (const s of SHOTS) {
    await page.evaluate((iso) => window.__P1850.jump(iso), s.date);
    await page.evaluate((o) => window.__P1850.camSet({ alt: o.alt, x: window.__P1850.plazaCenter.x, z: window.__P1850.plazaCenter.z, snap: true }), s);
    await settle(60);
    await page.evaluate(() => window.__P1850.render && window.__P1850.render());
    const census = await page.evaluate(() => {
      const all = window.__P1850.audits.runAll().results;
      const a = all.find(r => r.layer === "labels" && r.audit === "poiSymbols");
      return a ? { pass: a.pass, detail: a.detail || a } : null;
    });
    const dest = path.join(OUT_DIR, `ics13-${s.id}.png`);
    const canvas = await page.$("canvas");
    await canvas.screenshot({ path: dest });
    console.log(`SHOT ics13-${s.id}.png (${s.alt}m @ ${s.date}) — ${s.note}`);
    if (census) console.log(`  poiSymbols: ${JSON.stringify(census)}`);
  }
  await browser.close();
  srv.server.close();
  console.log("done →", OUT_DIR);
})().catch((e) => { console.error("SHOTS CRASH:", e); process.exit(1); });
