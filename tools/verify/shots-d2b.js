#!/usr/bin/env node
/* D2b ICS-30 screenshots — radio map modes + legend-as-control + world dimming.
   Full-page captures (atelier panel + modebar + floating legend + dimmed world):
     1. MODE 1 (ZONES) active — dimmed world, legend panel open, bar#1 gold;
     2. MODE 3 (LIFECYCLE) — Dec-1849 fire ground, lifecycle tints + legend;
     3. MODE OFF — same framing as (1) with the mode cleared (world restored,
        legend hidden) — the exact-restore proof.
   Writes into <APP_ROOT>/screenings/2026-07-17-d2b/. DEV-ONLY. */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "screenings", "2026-07-17-d2b");
function startServer(root){
  const MIME = { ".html":"text/html", ".js":"text/javascript", ".json":"application/json", ".png":"image/png" };
  const server = http.createServer((req,res)=>{ let p = decodeURIComponent(req.url.split("?")[0]); if(p==="/") p="/index.html";
    const fp = path.join(root,p); if(!fp.startsWith(root)){ res.writeHead(403); return res.end(); }
    fs.readFile(fp,(e,b)=>{ if(e){ res.writeHead(404); return res.end(); } res.writeHead(200,{"Content-Type":MIME[path.extname(fp).toLowerCase()]||"application/octet-stream"}); res.end(b); }); });
  return new Promise(r=>server.listen(0,"127.0.0.1",()=>r({server,port:server.address().port})));
}
const sleep = ms=>new Promise(r=>setTimeout(r,ms));
(async ()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const srv = await startServer(ROOT);
  const browser = await chromium.launch({ headless:true, args:["--use-gl=angle","--use-angle=swiftshader","--ignore-gpu-blocklist","--enable-webgl","--enable-unsafe-swiftshader","--disable-dev-shm-usage"] });
  const page = await (await browser.newContext({ viewport:{width:1600,height:1000} })).newPage();
  page.on("pageerror", e=>console.log("PAGEERROR", e.message));
  const settle = async(n=45)=>{ await page.evaluate(k=>{ for(let i=0;i<k;i++) window.__P1850.tick&&window.__P1850.tick(0.1); }, n); await sleep(160); };
  const shoot = async(id,note)=>{ const dest=path.join(OUT,`${id}.png`);
    await sleep(360);   // let the 200ms world-dim tween settle
    for(let i=0;i<12;i++){ await page.evaluate(()=>window.__P1850.render&&window.__P1850.render()); }
    await sleep(150);
    let ok=false; try{ await page.screenshot({ path:dest }); ok=true; }catch(e){ console.log("shot error", e.message); }
    console.log(ok?"ok  ":"FAIL", `${id}.png -`, note); };

  await page.goto(`http://127.0.0.1:${srv.port}/atelier.html`, { waitUntil:"load", timeout:90000 });
  await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v&&getComputedStyle(v).display==="none"&&window.__P1850; },{timeout:90000});

  // (1) MODE 1 — ZONES, town band, Dec-1849 (commercial-core reaching the shore)
  await page.evaluate(iso=>window.__P1850.jump(iso), "1849-12-20"); await settle(50);
  await page.evaluate(()=>window.__P1850.camSet({ alt:560, x:180, z:120, snap:true })); await settle(40);
  await page.evaluate(()=>window.__P1850_WBMODE(1));
  await settle(30);
  await shoot("d2b-1-mode1-zones-dimmed-legend", "MODE 1 ZONES armed: world dimmed (chroma monopoly), legend-as-control open bottom-right, modebar #1 gold");

  // (2) MODE 3 — LIFECYCLE, plaza band over the Great Fire ground
  await page.evaluate(()=>window.__P1850_WBMODE(3));
  await page.evaluate(()=>window.__P1850.camSet({ alt:180, x:60, z:-10, snap:true })); await settle(50);
  await shoot("d2b-2-mode3-lifecycle", "MODE 3 LIFECYCLE: building-state tints + glyphs over the Dec-24-1849 fire ground, s108b legend auto-open + the mode legend");

  // (3) MODE OFF — same framing as (1), mode cleared → world restored, legend hidden
  await page.evaluate(()=>window.__P1850_WBMODE(0));
  await page.evaluate(()=>window.__P1850.camSet({ alt:560, x:180, z:120, snap:true })); await settle(50);
  await shoot("d2b-3-mode-off-restore", "MODE OFF: same town framing, world saturation restored exactly (dim=0), floating legend hidden, modebar unlit");

  const dimOff = await page.evaluate(()=>window.__P1850_WBMODE().dim);
  console.log("restore check — dim value after clear:", dimOff, dimOff===0?"(EXACT restore)":"(NON-ZERO — investigate)");

  await browser.close(); srv.server.close();
})();
