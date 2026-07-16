#!/usr/bin/env node
/* tools/verify/probe-res3-before.js — RES-3 BEFORE shots: serve a MAIN
   worktree (pre-RES-3 build, arg 1) and capture the same three canonical
   label framings the AFTER shots used. DEV-ONLY tooling, never shipped. */
"use strict";
const fs = require("fs");
const path = require("path");
const http = require("http");
const { chromium } = require("playwright");

const ROOT = path.resolve(process.argv[2] || ".");
const OUT_DIR = path.resolve(__dirname, "..", "..", "screenings", "2026-07-16-res3");

const FRAMINGS = [
  { id: "overview-1500m", alt: 1500, date: "1849-09-15" },
  { id: "town-500m",      alt: 500,  date: "1849-09-15" },
  { id: "plaza-150m",     alt: 150,  date: "1849-12-20" }
];

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
  const srv = await startServer(ROOT);
  const browser = await chromium.launch({ headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--enable-unsafe-swiftshader"] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${srv.port}/index.html`, { waitUntil: "load", timeout: 60000 });
  await page.waitForFunction(() => { const v = document.getElementById("hud-loading"); return v && getComputedStyle(v).display === "none" && window.__P1850; }, { timeout: 45000 });
  const settle = async () => { await page.evaluate(() => { for (let i = 0; i < 60; i++) window.__P1850.tick && window.__P1850.tick(0.1); window.__P1850.render && window.__P1850.render(); }); await new Promise(r => setTimeout(r, 150)); };
  for (const f of FRAMINGS) {
    await page.evaluate((iso) => window.__P1850.jump(iso), f.date);
    await page.evaluate((o) => window.__P1850.camSet({ alt: o.alt, x: window.__P1850.plazaCenter.x, z: window.__P1850.plazaCenter.z, snap: true }), f);
    await settle(); await settle();
    await page.evaluate(() => window.__P1850.render && window.__P1850.render());
    const canvas = await page.$("canvas");
    await canvas.screenshot({ path: path.join(OUT_DIR, `before-${f.id}.png`) });
    console.log(`SHOT before-${f.id}.png`);
  }
  await browser.close(); srv.server.close();
})().catch((e) => { console.error("CRASH:", e); process.exit(2); });
