/* TCV2 evidence capture — terrain-color v2 A/B + seasonal breathing.
   Self-serves the app dir, drives the atelier via the __P1850 debug hooks
   (terrainV2 / terrainSeason), and screenshots matched pairs so the operator
   can judge v1(baked) vs v2(shader) and wet vs dry at identical framings.
   Not part of the gate. Run: node tools/verify/shots-tcv2.js */
"use strict";
const path = require("path");
const http = require("http");
const fs = require("fs");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..", "..");           // app/ dir (holds atelier.html)
const OUT = path.join(__dirname, "report", "shots");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { ".html":"text/html", ".js":"text/javascript", ".json":"application/json", ".png":"image/png", ".css":"text/css" };

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/atelier.html";
    const f = path.join(ROOT, p);
    fs.readFile(f, (e, b) => {
      if (e) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(b);
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const PORT = server.address().port;
  const URL = `http://127.0.0.1:${PORT}/atelier.html`;

  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const v = document.getElementById("hud-loading");
    return v && getComputedStyle(v).display === "none" && window.__P1850 && typeof window.__P1850.audits === "object";
  }, { timeout: 45000 });
  const settle = async (n = 40) => { await page.evaluate((k) => { for (let i = 0; i < k; i++) window.__P1850.tick && window.__P1850.tick(0.15); }, n); await sleep(120); };
  const frame = async (cam) => { await page.evaluate((c) => { window.__P1850.jump("1849-09-15"); window.__P1850.camSet(c); window.dispatchEvent(new Event("resize")); }, cam); await settle(50); };
  const set = async (o) => { await page.evaluate((s) => { for (const k in s) window.__P1850[k] = s[k]; window.__P1850.render && window.__P1850.render(); }, o); await sleep(120); await page.evaluate(() => window.__P1850.render && window.__P1850.render()); };
  const shot = async (name) => { await page.screenshot({ path: path.join(OUT, name) }); console.log("saved " + name); };

  // FRAMING A: town-edge overview (dune/scrub + bare sand), same as the audit zone
  await frame({ x: -250, z: -120, alt: 520, tT: 0.5, pitchOff: 0.12, yaw: 0.62, snap: true });
  await set({ terrainSeason: null }); // live season for the 1849-09-15 date (early dry)
  await set({ terrainV2: 0 }); await shot("tcv2-A-overview-v1.png");
  await set({ terrainV2: 1 }); await shot("tcv2-A-overview-v2.png");

  // FRAMING B: low oblique close-up (blur-kill: grain + relief must appear)
  await frame({ x: -300, z: -110, alt: 85, tT: 0.5, pitchOff: 0.22, yaw: 0.7, snap: true });
  await set({ terrainV2: 0 }); await shot("tcv2-B-closeup-v1.png");
  await set({ terrainV2: 1 }); await shot("tcv2-B-closeup-v2.png");

  // SEASON pair at the close framing, v2 on (dynamic green<->golden)
  await set({ terrainV2: 1, terrainSeason: 0 }); await shot("tcv2-B-season-dry.png");   // golden summer
  await set({ terrainSeason: 1 }); await shot("tcv2-B-season-wet.png");                  // green winter
  await set({ terrainSeason: null });                                                    // restore live

  await browser.close();
  server.close();
  console.log("TCV2 shots -> " + OUT);
})().catch((e) => { console.error(e); process.exit(1); });
