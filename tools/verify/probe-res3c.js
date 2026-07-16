#!/usr/bin/env node
/* tools/verify/probe-res3c.js — RES-3 addendum 2: hunt a framing where an
   ABBREVIATED street label sits INSIDE the viewport (the town-500m pressure
   cases sat off-frame), then shoot the abbreviation-visible framing with the
   ladder ON and the same framing with the ladder OFF (before behavior: the
   name simply hides). DEV-ONLY tooling, never shipped. */
"use strict";
const fs = require("fs");
const path = require("path");
const http = require("http");
const { chromium } = require("playwright");

const APP_ROOT = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.join(APP_ROOT, "screenings", "2026-07-16-res3");

function startServer(root) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    fs.readFile(path.join(root, p), (err, buf) => {
      if (err) { res.writeHead(404); return res.end(); }
      const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json" };
      res.writeHead(200, { "Content-Type": MIME[path.extname(p).toLowerCase()] || "application/octet-stream" });
      res.end(buf);
    });
  });
  return new Promise((r) => server.listen(0, "127.0.0.1", () => r({ server, port: server.address().port })));
}

(async () => {
  const srv = await startServer(APP_ROOT);
  const browser = await chromium.launch({ headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--enable-unsafe-swiftshader"] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${srv.port}/index.html`, { waitUntil: "load", timeout: 60000 });
  await page.waitForFunction(() => { const v = document.getElementById("hud-loading"); return v && getComputedStyle(v).display === "none" && window.__P1850 && window.__P1850.labelsResState; }, { timeout: 45000 });
  const settle = async () => { await page.evaluate(() => { for (let i = 0; i < 40; i++) window.__P1850.tick && window.__P1850.tick(0.1); for (let j = 0; j < 40; j++) window.__P1850.labelsUpdate(); window.__P1850.render(); }); await new Promise(r => setTimeout(r, 100)); };
  const onscreenAbbr = () => page.evaluate(() =>
    window.__P1850.labels.live.filter(l => /\bSt$/.test(l.text) && l.box && l.op > 0.3 &&
      l.box.minX > 40 && l.box.maxX < 1560 && l.box.minY > 80 && l.box.maxY < 900).map(l => ({ text: l.text, box: l.box })));

  await page.evaluate(() => window.__P1850.jump("1849-09-15"));
  const CANDS = [
    { alt: 500, x: -14, z: 746, id: "post-area-500m" },
    { alt: 420, x: -14, z: 746, id: "post-area-420m" },
    { alt: 650, x: 0,   z: 500, id: "south-650m" },
    { alt: 500, x: null, z: null, id: "town-500m" },   // plaza center default
    { alt: 800, x: null, z: null, id: "town-800m" }
  ];
  for (const c of CANDS) {
    await page.evaluate((o) => window.__P1850.camSet({ alt: o.alt, x: (o.x != null ? o.x : window.__P1850.plazaCenter.x), z: (o.z != null ? o.z : window.__P1850.plazaCenter.z), snap: true }), c);
    await settle(); await settle();
    const hits = await onscreenAbbr();
    console.log(c.id + ": " + JSON.stringify(hits));
    if (hits.length) {
      const canvas = await page.$("canvas");
      await canvas.screenshot({ path: path.join(OUT_DIR, `after-abbrev-visible-${c.id}.png`) });
      console.log(`SHOT after-abbrev-visible-${c.id}.png`);
      // the BEFORE behavior at the identical framing: ladder off, name hides
      await page.evaluate(() => window.__P1850.labelsSetAbbrev(false));
      await settle(); await settle();
      await canvas.screenshot({ path: path.join(OUT_DIR, `before-abbrev-hidden-${c.id}.png`) });
      console.log(`SHOT before-abbrev-hidden-${c.id}.png`);
      await page.evaluate(() => window.__P1850.labelsSetAbbrev(true));
      break;
    }
  }
  await browser.close(); srv.server.close();
})().catch((e) => { console.error("CRASH:", e); process.exit(2); });
