#!/usr/bin/env node
/* ics12 frame-time probe: renders the street-60m closeup and the 1500 m
   overview 5x40 frames each and reports median batch averages. DEV-ONLY. */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", "..");
function startServer(root){
  const MIME = { ".html":"text/html", ".js":"text/javascript", ".json":"application/json" };
  const server = http.createServer((req,res)=>{ let p=decodeURIComponent(req.url.split("?")[0]); if(p==="/")p="/index.html"; const fp=path.join(root,p); if(!fp.startsWith(root)){res.writeHead(403);return res.end();} fs.readFile(fp,(e,b)=>{ if(e){res.writeHead(404);return res.end();} res.writeHead(200,{"Content-Type":MIME[path.extname(fp).toLowerCase()]||"application/octet-stream"}); res.end(b); }); });
  return new Promise(r=>server.listen(0,"127.0.0.1",()=>r({server,port:server.address().port})));
}
const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async ()=>{
  const srv = await startServer(ROOT);
  const browser = await chromium.launch({ headless:true, args:["--use-gl=angle","--use-angle=swiftshader","--ignore-gpu-blocklist","--enable-webgl","--enable-unsafe-swiftshader","--disable-dev-shm-usage"] });
  const page = await (await browser.newContext({ viewport:{width:1600,height:1000} })).newPage();
  await page.goto(`http://127.0.0.1:${srv.port}/index.html`, { waitUntil:"load", timeout:90000 });
  await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v && getComputedStyle(v).display==="none" && window.__P1850; }, { timeout:90000 });
  const settle = async (n=40)=>{ await page.evaluate(k=>{ for(let i=0;i<k;i++) window.__P1850.tick && window.__P1850.tick(0.1); }, n); await sleep(140); };
  await page.evaluate(iso=>window.__P1850.jump(iso), "1849-12-20"); await settle(40);
  for(const f of [ { id:"street-60m", alt:60, x:-60, z:122 }, { id:"overview-1500m", alt:1500, x:-105.7, z:78.2 } ]){
    await page.evaluate(o=>window.__P1850.camSet({ alt:o.alt, x:o.x, z:o.z, snap:true }), f); await settle(40);
    const batches = [];
    for(let b=0;b<5;b++){
      const ms = await page.evaluate(()=>{ const P=window.__P1850; const t0=performance.now(); for(let i=0;i<40;i++) P.render(); return (performance.now()-t0)/40; });
      batches.push(+ms.toFixed(2)); await sleep(80);
    }
    batches.sort((a,b)=>a-b);
    console.log(`${f.id}: median ${batches[2]} ms  (batches: ${batches.join(", ")})`);
  }
  // repaint cost: force a full ground-splat repaint via a date jump crossing thresholds
  const rp = [];
  for(let i=0;i<4;i++){
    const iso = i%2 ? "1849-12-20" : "1848-04-01";
    const ms = await page.evaluate((d)=>{ const P=window.__P1850; const t0=performance.now(); P.jump(d); return performance.now()-t0; }, iso);
    rp.push(+ms.toFixed(1)); await settle(20);
  }
  console.log(`date-jump incl. repaint (ms): ${rp.join(", ")}`);
  await browser.close(); srv.server.close();
})();
