#!/usr/bin/env node
/* s106a screenshots — the ENCAMPMENT ZONES atelier rule overlay at 1849-09-15
   (zones BEFORE any tent spawns — the s106b gate):
     (a) atelier overview: all three documented zones (Happy Valley + Little
         Chile orange, Pleasant Valley [FLAG] ochre), dashed approximate
         boundaries, name labels;
     (b) atelier Happy Valley closeup (the big documented camp, the SoMa
         dune-swale ground, shore-clipped east edge);
     (c) date-gate proof: same overview at 1848-04-01 — only nothing shows
         (no zone documented yet), and at 1849-01-01 — Little Chile only.
   FULL-PAGE captures (the workbench panel shows the toggle + legend).
   DEV-ONLY. Writes into <APP_ROOT>/screenings/2026-07-17-s106a/. */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "screenings", "2026-07-17-s106a");

const SHOTS = [
  { id:"atelier-1-overview-1849-09-15",   date:"1849-09-15", alt:1900, x:520, z:470, note:"all three zones: Happy Valley + Little Chile (orange, PRIMARY) + Pleasant Valley (ochre, FLAG), dashed approx boundaries + labels" },
  { id:"atelier-2-happy-valley-closeup",  date:"1849-09-15", alt:520,  x:480, z:700, note:"Happy Valley closeup — Market-to-Howard / First-to-Third envelope, shore-clipped east edge" },
  { id:"atelier-3-dategate-1849-01-01",   date:"1849-01-01", alt:1900, x:520, z:470, note:"date gate: Jan 1849 — Little Chile only (Valparaiso wave from Aug 1848); Happy/Pleasant Valley not yet documented" },
  { id:"atelier-4-dategate-1848-04-01",   date:"1848-04-01", alt:1900, x:520, z:470, note:"date gate: Apr 1848 — no documented encampment zone yet (overlay empty)" }
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

  await page.goto(`http://127.0.0.1:${srv.port}/atelier.html`, { waitUntil:"load", timeout:90000 });
  await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v&&getComputedStyle(v).display==="none"&&window.__P1850; },{timeout:90000});
  await page.evaluate(()=>window.__P1850_WBSETOVERLAY && window.__P1850_WBSETOVERLAY("encamp", true));

  for(const s of SHOTS){
    await page.evaluate(iso=>window.__P1850.jump(iso), s.date); await settle(50);
    await page.evaluate(o=>{ window.__P1850.camSet({ alt:o.alt, x:o.x, z:o.z, snap:true }); }, s);
    await settle(50);
    await page.evaluate(()=>window.__P1850.render&&window.__P1850.render()); await sleep(160);
    const activeIds = await page.evaluate(iso=>window.__P1850_ENCAMP.at(window.__P1850.dayOf(iso)).map(z=>z.id), s.date);
    const dest = path.join(OUT, `${s.id}.png`);
    let ok=false; try{ await page.screenshot({ path:dest }); ok=true; }catch(e){ console.log("shot error", e.message); }
    console.log(ok?"ok  ":"FAIL", path.basename(dest), "(zones active:", JSON.stringify(activeIds), ") -", s.note);
  }

  await browser.close(); srv.server.close();
})().catch(e=>{ console.error("SHOTS CRASH:", e); process.exit(2); });
