#!/usr/bin/env node
/* ICS-21 screenshots — atelier RULE OVERLAYS declutter (the ZONES family) +
   outline-first zone styling:
     (a) panel read: the reorganized RULE OVERLAYS section — THE GROUND PLAN
         family + the new collapsible ZONES family (tri-state master, caret,
         group note) over the shortened flat list;
     (b) COMPOSED zone overlays: ZONE LAW + ENCAMPMENT ZONES together at
         1849-09-15 — the exact case the outline-first styling targets
         (boundaries strong, interior tints a faint wash, both legible);
     (c) same composition closer over the plaza/camp seam, panel showing the
         ZONES family fully armed via the third child (ecology) off — the
         tri-state master indeterminate.
   FULL-PAGE captures (panel + world together). DEV-ONLY.
   Writes into <APP_ROOT>/screenings/2026-07-17-ics21/. */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "screenings", "2026-07-17-ics21");

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
  const shoot = async(id,note)=>{ const dest=path.join(OUT,`${id}.png`); await page.evaluate(()=>window.__P1850.render&&window.__P1850.render()); await sleep(160);
    let ok=false; try{ await page.screenshot({ path:dest }); ok=true; }catch(e){ console.log("shot error", e.message); }
    console.log(ok?"ok  ":"FAIL", `${id}.png -`, note); };

  await page.goto(`http://127.0.0.1:${srv.port}/atelier.html`, { waitUntil:"load", timeout:90000 });
  await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v&&getComputedStyle(v).display==="none"&&window.__P1850; },{timeout:90000});

  await page.evaluate(iso=>window.__P1850.jump(iso), "1849-09-15"); await settle(50);
  await page.evaluate(()=>window.__P1850.camSet({ alt:1600, x:420, z:420, snap:true })); await settle(50);

  /* (a) the reorganized panel, nothing armed — show the ZONES family header +
     its group note open, GROUND PLAN above it, flat rows below. */
  await page.evaluate(()=>{
    const heads = Array.from(document.querySelectorAll("#wb-panel .wb-ov-parent"));
    const zonesHead = heads.find(h=>/ZONES — law/.test(h.textContent));
    if(zonesHead){ const q = zonesHead.querySelector(".wb-info"); if(q) q.click(); }   // open the group note
  });
  await shoot("atelier-1-panel-zones-family", "RULE OVERLAYS reorganized: GROUND PLAN family + collapsible ZONES family (group note open) + shortened flat list");
  await page.evaluate(()=>{
    const heads = Array.from(document.querySelectorAll("#wb-panel .wb-ov-parent"));
    const zonesHead = heads.find(h=>/ZONES — law/.test(h.textContent));
    if(zonesHead){ const q = zonesHead.querySelector(".wb-info"); if(q) q.click(); }   // close it again
  });

  /* (b) TWO zone overlays composed: ZONE LAW + ENCAMPMENT ZONES at the boom
     noon — outline-first: both boundary sets read, faint washes stack. */
  await page.evaluate(()=>{ window.__P1850_WBSETOVERLAY("zonelaw", true); window.__P1850_WBSETOVERLAY("encamp", true); });
  await settle(50);
  await shoot("atelier-2-zonelaw-plus-encamp-1600m", "ZONE LAW + ENCAMPMENT ZONES composed, 1849-09-15 — boundaries strong, interior tints faint, both legible together");

  /* (c) closer over the plaza→Happy Valley seam; panel shows the ZONES master
     indeterminate (2 of 3 children on). */
  await page.evaluate(()=>window.__P1850.camSet({ alt:700, x:460, z:560, snap:true })); await settle(50);
  await shoot("atelier-3-zone-seam-700m", "plaza→camp seam closeup — commercial-core edge + Happy Valley dashed ring + halo over faint washes; ZONES master tri-state indeterminate");

  await browser.close(); srv.server.close();
})().catch(e=>{ console.error("SHOTS CRASH:", e); process.exit(2); });
