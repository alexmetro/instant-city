/* CANONICAL QA RENDER SET — the shared, pre-rendered screenshot pack the QA-2
   representation fan-out READS instead of each agent building + driving Playwright
   itself (the pilot's biggest cost: ~130-140k tokens/agent on framing iteration).
   Renders a fixed matrix of named framings × key dates (+ a few A/B pairs) to
   report/qa-shots/ and writes an index.json (preset id -> file -> what it shows +
   which subsystems care). Re-run whenever the build changes.
   Run: node tools/verify/shots-qa.js  */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..");
const OUT = path.join(__dirname, "report", "qa-shots");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { ".html":"text/html", ".js":"text/javascript", ".json":"application/json", ".png":"image/png", ".css":"text/css" };

// Named framings (validated cams). x,z world; alt metres; angles radians.
const CAM = {
  overview:   { x:-106, z:78,   alt:1500, tT:0.5, pitchOff:0.05, yaw:0.62, snap:true },
  town:       { x:-250, z:-120, alt:500,  tT:0.5, pitchOff:0.12, yaw:0.62, snap:true },
  waterfront: { x:40,   z:60,   alt:340,  tT:0.5, pitchOff:0.20, yaw:0.62, snap:true },
  plaza:      { x:-106, z:78,   alt:150,  tT:0.5, pitchOff:0.22, yaw:0.62, snap:true },
  terrainCU:  { x:-300, z:-110, alt:85,   tT:0.5, pitchOff:0.26, yaw:0.70, snap:true },
  junctionCU: { x:-120, z:40,   alt:120,  tT:0.5, pitchOff:0.26, yaw:0.62, snap:true },
  bayWide:    { x:250,  z:150,  alt:600,  tT:0.5, pitchOff:0.16, yaw:0.62, snap:true },
};
// preset = {id, cam, date, note, subsystems, [pre]}  (pre = __P1850 state to set)
const PRESETS = [
  { id:"overview-1849",     cam:"overview",   date:"1849-09-15", note:"whole peninsula, mature town", subs:["Terrain&Water","Spine","Structures","Labels"] },
  { id:"town-1846",         cam:"town",        date:"1846-09-15", note:"young town (growth start)",     subs:["Spine","Structures","Tents"] },
  { id:"town-1848",         cam:"town",        date:"1848-04-01", note:"mid growth",                    subs:["Spine","Structures"] },
  { id:"town-1849",         cam:"town",        date:"1849-09-15", note:"mature grid",                   subs:["Spine","Structures","Labels"] },
  { id:"waterfront-1849",   cam:"waterfront",  date:"1849-09-15", note:"shore, clamp, wharves",         subs:["Spine","Terrain&Water"] },
  { id:"plaza-1849",        cam:"plaza",        date:"1849-09-15", note:"Portsmouth Sq close",          subs:["Structures","Labels","Front-End"] },
  { id:"junction-1849",     cam:"junctionCU",  date:"1849-09-15", note:"core junction close-up",        subs:["Spine"] },
  { id:"bay-1849",          cam:"bayWide",     date:"1849-09-15", note:"open bay water (depth/glint)",  subs:["Terrain&Water"] },
  { id:"terrain-cu-1849",   cam:"terrainCU",   date:"1849-09-15", note:"ground grain/value/relief",     subs:["Terrain&Water"] },
  { id:"terrain-season-wet",cam:"terrainCU",   date:"1849-01-15", note:"wet season (green)",  subs:["Terrain&Water"], pre:{ terrainSeason:1 } },
  { id:"terrain-season-dry",cam:"terrainCU",   date:"1849-08-01", note:"dry season (golden)", subs:["Terrain&Water"], pre:{ terrainSeason:0 } },
  { id:"terrain-v1-ab",     cam:"terrainCU",   date:"1849-09-15", note:"A/B: terrain v1 (baked)", subs:["Terrain&Water"], pre:{ terrainV2:0 } },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/atelier.html";
    fs.readFile(path.join(ROOT, p), (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" }); res.end(b); }); });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const URL = `http://127.0.0.1:${server.address().port}/atelier.html`;
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })).newPage();
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => { const v = document.getElementById("hud-loading");
    return v && getComputedStyle(v).display === "none" && window.__P1850 && typeof window.__P1850.audits === "object"; }, { timeout: 45000 });
  const settle = async (n = 50) => { await page.evaluate((k) => { for (let i = 0; i < k; i++) window.__P1850.tick && window.__P1850.tick(0.15); }, n); await sleep(130); };

  const index = [];
  for (const p of PRESETS) {
    await page.evaluate((o) => {
      window.__P1850.terrainV2 = 1; window.__P1850.terrainSeason = null; // reset A/B state
      if (o.pre) for (const k in o.pre) window.__P1850[k] = o.pre[k];
      window.__P1850.jump(o.date); window.__P1850.camSet(o.cam); window.dispatchEvent(new Event("resize"));
    }, { pre: p.pre, date: p.date, cam: CAM[p.cam] });
    await settle(55);
    await page.evaluate(() => window.__P1850.render && window.__P1850.render());
    const file = `${p.id}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    index.push({ id: p.id, file, date: p.date, framing: p.cam, note: p.note, subsystems: p.subs });
    console.log("saved " + file);
  }
  await page.evaluate(() => { window.__P1850.terrainV2 = 1; window.__P1850.terrainSeason = null; });
  fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify({ generated: "run shots-qa.js", note: "canonical QA render set; read these instead of re-rendering", presets: index }, null, 2));
  await browser.close(); server.close();
  console.log(`\ncanonical QA set (${index.length} shots) + index.json -> ${OUT}`);
})().catch((e) => { console.error(e); process.exit(1); });
