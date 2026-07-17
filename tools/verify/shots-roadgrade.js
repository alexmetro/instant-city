/* Road progressive-width evidence — same street grid across dates (roads widen
   from track toward their surveyed ROW) + an A/B of the grade toggle at a young
   date. Self-serves; drives via __P1850 (jump / roadGrade). Not part of the gate.
   Run: node tools/verify/shots-roadgrade.js */
"use strict";
const path = require("path");
const http = require("http");
const fs = require("fs");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..", "..");
const OUT = path.join(__dirname, "report", "shots");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { ".html":"text/html", ".js":"text/javascript", ".json":"application/json", ".png":"image/png", ".css":"text/css" };

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/atelier.html";
    fs.readFile(path.join(ROOT, p), (e, b) => { if (e) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" }); res.end(b); });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const URL = `http://127.0.0.1:${server.address().port}/atelier.html`;

  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })).newPage();
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => { const v = document.getElementById("hud-loading");
    return v && getComputedStyle(v).display === "none" && window.__P1850 && typeof window.__P1850.audits === "object"; }, { timeout: 45000 });
  const settle = async (n = 45) => { await page.evaluate((k) => { for (let i = 0; i < k; i++) window.__P1850.tick && window.__P1850.tick(0.15); }, n); await sleep(140); };

  const CAM = { x: -120, z: 40, alt: 660, tT: 0.5, pitchOff: 0.14, yaw: 0.62, snap: true };
  const view = async (date, grade, name) => {
    await page.evaluate((o) => { window.__P1850.roadGrade = { on: o.grade }; window.__P1850.jump(o.date); window.__P1850.camSet(o.cam); window.dispatchEvent(new Event("resize")); }, { date, grade, cam: CAM });
    await settle(55);
    await page.evaluate(() => window.__P1850.render && window.__P1850.render());
    await page.screenshot({ path: path.join(OUT, name) }); console.log("saved " + name);
  };

  // progressive widening, grade ON: young -> maturing -> full
  await view("1847-06-15", 1, "roadgrade-1847-progressive.png");
  await view("1848-06-15", 1, "roadgrade-1848-progressive.png");
  await view("1849-09-15", 1, "roadgrade-1849-progressive.png");
  // A/B at the young date: grade OFF pops every road to full ROW immediately
  await view("1847-06-15", 0, "roadgrade-1847-instant-OFF.png");
  await page.evaluate(() => { window.__P1850.roadGrade = { on: 1 }; }); // restore

  await browser.close(); server.close();
  console.log("road-grade shots -> " + OUT);
})().catch((e) => { console.error(e); process.exit(1); });
