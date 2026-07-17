#!/usr/bin/env node
/* s106b — retake shot 3 (variant-silhouette closeup): low altitude, offset
   from the zone-label sprite, encampment tint OFF for the clean Option-B
   neutral read of TNT-1 (wall) / TNT-2 (wedge) / TNT-3 (framed cloth house). */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "screenings", "2026-07-17-s106b");

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
  const settle = async(n=40)=>{ await page.evaluate(k=>{ for(let i=0;i<k;i++) window.__P1850.tick&&window.__P1850.tick(0.1); }, n); await sleep(140); };

  await page.goto(`http://127.0.0.1:${srv.port}/atelier.html`, { waitUntil:"load", timeout:120000 });
  await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v&&getComputedStyle(v).display==="none"&&window.__P1850&&window.__P1850.tentCounts; },{timeout:120000});

  // find a dense patch: the median tent position of a happy-valley cluster away from the centroid label
  const spot = await page.evaluate(()=>{
    const day = window.__P1850.dayOf("1849-12-20");
    const tents = window.__P1850.tentsAt(day).filter(t=>t.zone==="happy-valley");
    // pick the tent with the most neighbours within 25 m (a dense pocket)
    let best=null, bestN=-1;
    for(let i=0;i<tents.length;i+=7){
      const a=tents[i]; let n=0;
      for(const b of tents){ const dx=a.cx-b.cx, dz=a.cz-b.cz; if(dx*dx+dz*dz<625) n++; }
      if(n>bestN){ bestN=n; best=a; }
    }
    return { x:best.cx, z:best.cz, n:bestN };
  });
  console.log("dense pocket:", JSON.stringify(spot));

  await page.evaluate(()=>{ window.__P1850_WBSETOVERLAY("encamp", false); window.__P1850_WBSETOVERLAY("lifecycle", false); });
  await page.evaluate(()=>window.__P1850.jump("1849-12-20")); await settle(50);
  await page.evaluate(o=>{ window.__P1850.camSet({ alt:55, x:o.x, z:o.z, snap:true }); }, spot);
  await settle(50);
  await page.evaluate(()=>window.__P1850.render&&window.__P1850.render()); await sleep(160);
  const dest = path.join(OUT, "3-happy-valley-closeup-variants.png");
  try{ await page.screenshot({ path:dest }); console.log("ok  ", path.basename(dest)); }
  catch(e){ console.log("FAIL", e.message); }

  await browser.close(); srv.server.close();
})().catch(e=>{ console.error("SHOTS CRASH:", e); process.exit(2); });
