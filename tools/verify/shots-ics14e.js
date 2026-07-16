#!/usr/bin/env node
/* =====================================================================
   tools/verify/shots-ics14e.js — ICS-14e HUD CHROME LEGIBILITY shots
   (operator directive 2026-07-16: the screen-edge UI text takes the same
   Roboto white-ink + dark-casing treatment as the ics14d map labels).
   Unlike shots-ics14d.js these are FULL-PAGE screenshots — the subject is
   the DOM HUD overlay (title / clock date / paper masthead / ticker /
   altitude / timeline), not the canvas.
     town-450m @ 1849-12-26 — town framing with the ticker carrying the
       Christmas-fire line, the Alta masthead under the clock, title+sub
     overview-1500m @ 1849-09-15 — HUD over the wider world
     atelier-450m @ 1849-12-26 — the atelier target: its workbench panel
       (Consolas, own solid styling) must be unaffected beside the new HUD
   Also probes that the DOM actually resolved the embedded Roboto faces.
   Usage: node tools/verify/shots-ics14e.js [prefix]   (default "after")
   Saves under app/screenings/2026-07-16-ics14e/<prefix>-<id>.png.
   DEV-ONLY tooling, never shipped.
   ===================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const http = require("http");
const { chromium } = require("playwright");

const APP_ROOT = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.join(APP_ROOT, "screenings", "2026-07-16-ics14e");
const PREFIX = process.argv[2] || "after";

const SHOTS = [
  { id: "hud-town-450m-1849-12-26",     page: "index.html",   alt: 450,  date: "1849-12-26", note: "town framing — title/sub, clock date, Alta masthead, ticker (Christmas fire), altitude, timeline" },
  { id: "hud-overview-1500m-1849-09-15", page: "index.html",  alt: 1500, date: "1849-09-15", note: "overview — HUD chrome over the wider world" },
  { id: "atelier-town-450m-1849-12-26",  page: "atelier.html", alt: 450, date: "1849-12-26", note: "atelier — workbench panel text (own Consolas styling) unaffected beside the new HUD" }
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

  let lastPage = null;
  for (const s of SHOTS) {
    if (s.page !== lastPage) {
      await page.goto(`http://127.0.0.1:${srv.port}/${s.page}`, { waitUntil: "load", timeout: 60000 });
      await page.waitForFunction(() => {
        const v = document.getElementById("hud-loading");
        return v && getComputedStyle(v).display === "none" && window.__P1850;
      }, { timeout: 45000 });
      await page.evaluate(() => (document.fonts && document.fonts.ready) ? document.fonts.ready.then(() => true) : true);
      lastPage = s.page;

      // ---- DOM font probe: the HUD must resolve the EMBEDDED Roboto ----
      const probe = await page.evaluate(() => {
        const el = (id) => document.getElementById(id);
        const fam = (id) => getComputedStyle(el(id)).fontFamily;
        return {
          robotoMedLoaded: document.fonts.check('500 16px Roboto'),
          robotoBoldLoaded: document.fonts.check('700 16px Roboto'),
          hudTitleFam: fam("hud-title"),
          clockFam: fam("hud-clock"),
          tickerFam: fam("hud-ticker"),
          scrubberFam: fam("hud-scrubber"),
          inspectFam: fam("inspect-panel"),   // must STAY Fraunces (own panel voice)
          paperPaneFam: fam("paper-pane")     // must STAY Fraunces (own panel voice)
        };
      });
      console.log(`FONT PROBE (${s.page}):`, JSON.stringify(probe, null, 2));
    }
    await page.evaluate((iso) => window.__P1850.jump(iso), s.date);
    await page.evaluate((o) => window.__P1850.camSet({
      alt: o.alt,
      x: window.__P1850.plazaCenter.x,
      z: window.__P1850.plazaCenter.z,
      snap: true
    }), s);
    await page.evaluate((k) => { for (let i = 0; i < k; i++) window.__P1850.tick && window.__P1850.tick(0.1); }, 80);
    await new Promise(r => setTimeout(r, 250));
    await page.evaluate(() => window.__P1850.render && window.__P1850.render());
    const hud = await page.evaluate(() => ({
      title: document.querySelector("#hud-title h1").textContent,
      date: document.getElementById("clock-date").textContent,
      masthead: document.getElementById("pt-masthead-name").textContent + " / " + document.getElementById("pt-issue-date").textContent,
      ticker: (document.getElementById("ticker-date").textContent + " " + document.getElementById("ticker-text").textContent).trim(),
      altitude: document.getElementById("alt-val").textContent
    }));
    const dest = path.join(OUT_DIR, `${PREFIX}-${s.id}.png`);
    await page.screenshot({ path: dest }); // FULL PAGE — the HUD overlay is the subject
    console.log(`SHOT ${PREFIX}-${s.id}.png (${s.alt}m @ ${s.date}) — ${s.note}`);
    console.log(`  HUD strings: ${JSON.stringify(hud)}`);
  }
  await browser.close();
  srv.server.close();
  console.log("done →", OUT_DIR);
})().catch((e) => { console.error("SHOTS CRASH:", e); process.exit(1); });
