#!/usr/bin/env node
/* ics12 road-paint clarity screenshots (operator backlog ICS-12). Captures the
   RELEASE render at the three operator framings — 1500 m overview, plaza 150 m,
   and a 40-60 m street closeup (Clay x Kearny junction + a Clay mid-block) — so
   BEFORE/AFTER pairs document the paint-canvas texel-density fix. DEV-ONLY.
   Usage: node tools/verify/shots-ics12.js <suffix>   (suffix = before|after)
   Writes into <APP_ROOT>/screenings/2026-07-16-ics12/. */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "screenings", "2026-07-16-ics12");
const SUFFIX = process.argv[2] || "shot";

/* plazaCenter ≈ (-105.7, 78.2); Clay runs through (-1, 112) where Kearny
   crosses (junction) — closeups sit on that block (probe-ics12 output). */
const SHOTS = [
  { id: "overview-1500m", date: "1849-09-15", alt: 1500, x: -105.7, z: 78.2,
    note: "1500 m overview — far-out perf/visual regression check" },
  { id: "plaza-150m",     date: "1849-12-20", alt: 150,  x: -105.7, z: 78.2,
    note: "plaza 150 m — lot-band framing, road edges must read defined" },
  { id: "street-45m",     date: "1849-12-20", alt: 45,   x: -1, z: 112,
    note: "Clay x Kearny junction 45 m — the sharp-line acceptance framing" },
  { id: "street-60m",     date: "1849-12-20", alt: 60,   x: -60, z: 122,
    note: "Clay mid-block 60 m — edge definition clear of the junction" }
];

function startServer(root){
  const MIME = { ".html":"text/html", ".js":"text/javascript", ".json":"application/json", ".css":"text/css", ".png":"image/png", ".ico":"image/x-icon", ".webmanifest":"application/manifest+json" };
  const server = http.createServer((req,res)=>{ let p=decodeURIComponent(req.url.split("?")[0]); if(p==="/")p="/index.html"; const fp=path.join(root,p); if(!fp.startsWith(root)){res.writeHead(403);return res.end();} fs.readFile(fp,(e,b)=>{ if(e){res.writeHead(404);return res.end();} res.writeHead(200,{"Content-Type":MIME[path.extname(fp).toLowerCase()]||"application/octet-stream"}); res.end(b); }); });
  return new Promise(r=>server.listen(0,"127.0.0.1",()=>r({server,port:server.address().port})));
}
const sleep = ms => new Promise(r=>setTimeout(r,ms));
async function shoot(page, dest){
  let ok = false;
  try{ const c = await page.$("canvas"); if(c){ await c.screenshot({ path: dest }); ok = true; } }catch(e){}
  if(!ok){ try{ const u = await page.evaluate(()=>window.__wbShot?window.__wbShot():null); if(u){ fs.writeFileSync(dest, Buffer.from(u.split(",")[1], "base64")); ok = true; } }catch(e){} }
  return ok;
}

(async ()=>{
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await startServer(ROOT);
  const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle","--use-angle=swiftshader","--ignore-gpu-blocklist","--enable-webgl","--enable-unsafe-swiftshader","--disable-dev-shm-usage"] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  page.on("pageerror", e=>console.log("PAGEERROR", e.message));
  const settle = async (n=40)=>{ await page.evaluate(k=>{ for(let i=0;i<k;i++) window.__P1850.tick && window.__P1850.tick(0.1); }, n); await sleep(140); };

  await page.goto(`http://127.0.0.1:${srv.port}/index.html`, { waitUntil: "load", timeout: 90000 });
  await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v && getComputedStyle(v).display==="none" && window.__P1850; }, { timeout: 90000 });

  for(const s of SHOTS){
    await page.evaluate(iso=>window.__P1850.jump(iso), s.date); await settle(40);
    await page.evaluate(o=>window.__P1850.camSet({ alt:o.alt, x:o.x, z:o.z, snap:true }), s); await settle(40);
    await page.evaluate(()=>window.__P1850.render && window.__P1850.render()); await sleep(120);
    const dest = path.join(OUT, `${s.id}-${SUFFIX}.png`);
    console.log(await shoot(page, dest) ? "ok  " : "FAIL", path.basename(dest), "-", s.note);
  }

  // frame-time probe at the closeup framing (SwiftShader CPU render — relative signal)
  const ft = await page.evaluate(()=>{
    const P = window.__P1850; const t0 = performance.now();
    for(let i=0;i<40;i++) P.render();
    return (performance.now() - t0) / 40;
  });
  console.log(`frame-time (40-frame avg @ street-60m): ${ft.toFixed(2)} ms`);

  await browser.close(); srv.server.close();
})();
