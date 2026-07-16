#!/usr/bin/env node
/* tools/verify/probe-res3b.js — RES-3 addendum: locate the abbreviated street
   at the town framing (screen box + world anchor), then shoot a CLOSE framing
   over the same street proving the FULL name returns when space frees.
   DEV-ONLY tooling, never shipped. */
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

  // town framing
  await page.evaluate(() => window.__P1850.jump("1849-09-15"));
  await page.evaluate(() => window.__P1850.camSet({ alt: 500, x: window.__P1850.plazaCenter.x, z: window.__P1850.plazaCenter.z, snap: true }));
  await settle();
  const abbr = await page.evaluate(() => window.__P1850.labels ? window.__P1850.labels.live.filter(l => /\bSt$/.test(l.text)) : "no labels hook");
  console.log("abbreviated live at town-500m:", JSON.stringify(abbr, null, 1));

  if (Array.isArray(abbr) && abbr.length) {
    const a = abbr[0];
    // close framing over the same street — pressure gone, the FULL name must return
    await page.evaluate((o) => window.__P1850.camSet({ alt: 260, x: o.x, z: o.z, snap: true }), a);
    await settle(); await settle();
    const there = await page.evaluate(() => window.__P1850.labels.live.filter(l => /^Post/.test(l.text)).map(l => l.text));
    console.log("Post* labels at the close framing:", JSON.stringify(there));
    const canvas = await page.$("canvas");
    await canvas.screenshot({ path: path.join(OUT_DIR, "after-post-street-full-when-free-260m.png") });
    console.log("SHOT after-post-street-full-when-free-260m.png");
  }
  await browser.close(); srv.server.close();
})().catch((e) => { console.error("CRASH:", e); process.exit(2); });
