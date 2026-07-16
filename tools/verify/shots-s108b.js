#!/usr/bin/env node
/* s108b screenshots — the LIFECYCLE LEGEND (the floating placeholder key).
   FULL-PAGE captures (DOM chrome over the canvas — the legend is HUD DOM):
     (a) release: the collapsed LEGEND chip in the HUD (plaza fire framing);
     (b) release: the legend OPEN over the Dec 24 1849 plaza fire;
     (c) atelier: the BUILDING LIFECYCLE overlay ON — the legend auto-opens
         with the toggle (workbench setOverlay hook).
   DEV-ONLY. Writes into <APP_ROOT>/screenings/2026-07-16-s108b/. */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "screenings", "2026-07-16-s108b");

const SHOTS = [
  { id:"release-1-chip-collapsed", target:"index",   date:"1849-12-24", alt:220, legend:false, note:"release HUD: the collapsed LEGEND chip (top-right, under the clock)" },
  { id:"release-2-legend-fire",    target:"index",   date:"1849-12-24", alt:220, legend:true,  note:"legend OPEN over the Dec 24 1849 plaza fire (charcoal+ember vs the key)" },
  { id:"atelier-3-overlay-auto",   target:"atelier", date:"1849-12-24", alt:220, overlay:"lifecycle", note:"atelier: LIFECYCLE overlay on — the legend auto-opens with the toggle" }
];

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

  let loaded = null;
  for(const s of SHOTS){
    if(loaded !== s.target){
      await page.goto(`http://127.0.0.1:${srv.port}/${s.target}.html`, { waitUntil:"load", timeout:90000 });
      await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v&&getComputedStyle(v).display==="none"&&window.__P1850; },{timeout:90000});
      loaded = s.target;
    }
    if(s.overlay) await page.evaluate(k=>window.__P1850_WBSETOVERLAY&&window.__P1850_WBSETOVERLAY(k,true), s.overlay);
    if(s.legend!=null && !s.overlay) await page.evaluate(v=>window.__P1850_LC_LEGEND&&window.__P1850_LC_LEGEND.setOpen(v), s.legend);
    await page.evaluate(iso=>window.__P1850.jump(iso), s.date); await settle(40);
    await page.evaluate(o=>{ window.__P1850.camSet({ alt:o.alt, x:window.__P1850.plazaCenter.x, z:window.__P1850.plazaCenter.z, snap:true }); }, { alt:s.alt });
    await settle(40);
    await page.evaluate(()=>window.__P1850.render&&window.__P1850.render()); await sleep(160);
    const legendOpen = await page.evaluate(()=>window.__P1850_LC_LEGEND?window.__P1850_LC_LEGEND.isOpen():null);
    const dest = path.join(OUT, `${s.id}.png`);
    let ok=false; try{ await page.screenshot({ path:dest }); ok=true; }catch(e){ console.log("shot error", e.message); }
    console.log(ok?"ok  ":"FAIL", path.basename(dest), "(legend open:", legendOpen, ") -", s.note);
    if(s.overlay) await page.evaluate(k=>window.__P1850_WBSETOVERLAY&&window.__P1850_WBSETOVERLAY(k,false), s.overlay);
  }

  await browser.close(); srv.server.close();
})().catch(e=>{ console.error("SHOTS CRASH:", e); process.exit(2); });
