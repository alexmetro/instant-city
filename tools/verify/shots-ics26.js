#!/usr/bin/env node
/* ICS-26 screenshots — MEASURED BLOCK-COVERAGE TARGETS (atelier), BEFORE/AFTER
   pairs at the SAME framings @ 1849-12-20:
     BEFORE = __P1850_FILL_QA({ignoreCoverageTargets:true}) — the pre-ics26
              flat plaza-radial wave (no hotspot field / block budgets / size
              grading);
     AFTER  = knob off — the RES-4-calibrated hotspot-field fill.
   Framings (anchors derived from the measured coverage table, never
   hardcoded):
     (1) the densest CORE-band block closeup (perimeter-first deep rim, rear
         courts, yard fences);
     (2) a MID-band block near the band mean (gap-toothed frame-and-shack);
     (3) the WATERFRONT-FILL blocks at the Broadway-wharf foot corridor (the
         Sansome-Battery finding: core-grade density at mid distance).
   FULL-PAGE captures. DEV-ONLY. Writes <APP_ROOT>/screenings/2026-07-17-ics26/. */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "screenings", "2026-07-17-ics26");

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
  await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v&&getComputedStyle(v).display==="none"&&window.__P1850&&window.__P1850.blockCoverage; },{timeout:120000});

  /* anchors from the measured coverage table (the audit's own measure). */
  const A = await page.evaluate(()=>{
    const cov = window.__P1850.blockCoverage("1849-12-20");
    const by = b => cov.blocks.filter(r=>r.band===b);
    const core = by("core").slice().sort((a,b)=>b.cov-a.cov)[0];
    const midRows = by("mid"), midMean = midRows.reduce((s,r)=>s+r.cov,0)/midRows.length;
    const mid = midRows.slice().sort((a,b)=>Math.abs(a.cov-midMean)-Math.abs(b.cov-midMean))[0];
    const wf = by("waterfront").slice().sort((a,b)=>(a.wharfD||1e9)-(b.wharfD||1e9))[0];
    /* densest fence-bundle neighborhood (backyard-texture closeup anchor) */
    let fen = null, fenN = -1;
    (cov.fences||[]).forEach(a=>{
      const n = cov.fences.filter(b=>Math.hypot(a.x-b.x, a.z-b.z) < 55).length;
      if(n > fenN){ fenN = n; fen = a; }
    });
    return { perBand: cov.perBand, core, mid, wf, fen, fenN, fencedLots: cov.fencedLots };
  });
  console.log("anchors:", JSON.stringify({ core:{key:A.core.key,cov:A.core.cov}, mid:{key:A.mid.key,cov:A.mid.cov},
    wf:{key:A.wf.key,cov:A.wf.cov,wharfD:A.wf.wharfD}, perBand:A.perBand, fencedLots:A.fencedLots }));

  const FRAMINGS = [
    { id:"core-block",       alt:150, x:A.core.x, z:A.core.z, note:`CORE closeup ${A.core.key} (measured cov ${(A.core.cov*100).toFixed(1)}%)` },
    { id:"mid-block",        alt:150, x:A.mid.x,  z:A.mid.z,  note:`MID-band block ${A.mid.key} (measured cov ${(A.mid.cov*100).toFixed(1)}%)` },
    { id:"waterfront-wharf", alt:320, x:A.wf.x,   z:A.wf.z,   note:`WATERFRONT-FILL at the wharf-foot corridor ${A.wf.key} (measured cov ${(A.wf.cov*100).toFixed(1)}%, wharfD ${A.wf.wharfD}m)` }
  ];

  for(const mode of ["before","after"]){
    await page.evaluate(on=>window.__P1850_FILL_QA({ ignoreCoverageTargets:on }), mode==="before");
    await page.evaluate(iso=>window.__P1850.jump(iso), "1849-12-20"); await settle(50);
    const frames = (mode==="after" && A.fen)
      ? FRAMINGS.concat([{ id:"fences-closeup", alt:90, x:A.fen.x, z:A.fen.z,
          note:`backyard texture — property-line yard fences (${A.fencedLots} fenced lots town-wide; ${A.fenN} in this neighborhood)` }])
      : FRAMINGS;
    for(const f of frames){
      await page.evaluate(o=>{ window.__P1850.camSet({ alt:o.alt, x:o.x, z:o.z, snap:true }); }, f);
      await settle(50);
      await page.evaluate(()=>window.__P1850.render&&window.__P1850.render()); await sleep(160);
      const dest = path.join(OUT, `${f.id}-${mode}.png`);
      let ok=false; try{ await page.screenshot({ path:dest }); ok=true; }catch(e){ console.log("shot error", e.message); }
      console.log(ok?"ok  ":"FAIL", path.basename(dest), "-", mode==="before" ? "flat plaza-radial (knob on)" : f.note);
    }
  }
  await page.evaluate(()=>window.__P1850_FILL_QA({ ignoreCoverageTargets:false }));

  await browser.close(); srv.server.close();
})().catch(e=>{ console.error("SHOTS CRASH:", e); process.exit(2); });
