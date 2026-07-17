#!/usr/bin/env node
/* s106d screenshots — THE BOOM-WINDOW CORE-CANVAS EXCEPTION (atelier):
     (1) plaza/Dupont commercial core @ 1849-09-15 — a FEW tent silhouettes
         among the frame placeholders on core blocks (the dated exception);
     (2) the SAME framing @ 1849-12-20 — fewer tents standing: seeded
         conversions already landed (cleared pads / frame replacements);
     (3) the BUILDING LIFECYCLE overlay on a core tent mid-conversion
         (teardown / rebuild-constructing glyph over the canvas).
   FULL-PAGE captures. DEV-ONLY. Writes <APP_ROOT>/screenings/2026-07-17-s106d/. */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "screenings", "2026-07-17-s106d");

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
  await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v&&getComputedStyle(v).display==="none"&&window.__P1850&&window.__P1850.coreCanvas; },{timeout:120000});

  /* anchors: the densest core-tent cluster near the plaza (shots 1+2 share
     the framing so the Sept->Dec shedding reads); + one tent mid-conversion
     at Dec-20 for the lifecycle-overlay closeup. */
  const A = await page.evaluate(()=>{
    const plaza = window.__P1850.plazaCenter;
    const standingAt = (iso)=>window.__P1850.fillAt(window.__P1850.dayOf(iso))
      .filter(e=>e.coreCanvas && e.subtype==="tent" && e.cls!=="frame" &&
        (e.phase==="complete"||e.phase==="constructing"||e.phase==="expanding"));
    // the densest neighborhood of core tents STANDING at Sept-15 (so the
    // same framing at Dec-20 shows the shedding)
    const sep = standingAt("1849-09-15");
    let best = null, bestN = -1;
    sep.forEach(a=>{
      const nb = sep.filter(b=>Math.hypot(a.cx-b.cx, a.cz-b.cz) < 75);
      if(nb.length > bestN){ bestN = nb.length; best = nb; }
    });
    let cx=plaza.x, cz=plaza.z; if(best){ cx=0; cz=0; best.forEach(e=>{cx+=e.cx; cz+=e.cz;}); cx/=best.length; cz/=best.length; }
    // a core tent mid-conversion at Dec-20 — prefer the TEARDOWN phase
    const day = window.__P1850.dayOf("1849-12-20");
    const midAll = window.__P1850.fillAt(day).filter(e=>e.coreCanvas &&
      (e.phase === "teardown" || e.phase === "clearing" || e.phase === "cleared" ||
       (e.phase === "constructing" && e.transition && e.transition.type === "rebuild")));
    const order = { teardown:0, clearing:1, cleared:2, constructing:3 };
    midAll.sort((a,b)=>order[a.phase]-order[b.phase]);
    return { plaza:{x:plaza.x,z:plaza.z}, cluster:{x:cx,z:cz,n:bestN},
             mid: midAll.map(e=>({ id:e.code+"#"+e.rank, x:e.cx, z:e.cz, phase:e.phase, tr:e.transition&&e.transition.type })),
             standingSep: sep.length, standingDec: standingAt("1849-12-20").length };
  });
  console.log("anchors:", JSON.stringify(A));
  const midT = A.mid.length ? A.mid[0] : { x:A.cluster.x, z:A.cluster.z, id:"(none mid-conversion)", phase:"?" };

  const SHOTS = [
    { id:"1-core-canvas-1849-09-15", date:"1849-09-15", alt:150, x:A.cluster.x, z:A.cluster.z, ov:{},
      note:`plaza/Dupont core Sept 1849 — the dated exception: a few tents among the frame on core blocks (${A.standingSep} core tents standing)` },
    { id:"2-core-shedding-1849-12-20", date:"1849-12-20", alt:150, x:A.cluster.x, z:A.cluster.z, ov:{},
      note:`SAME framing Dec 1849 — fewer tents: seeded conversions landed (${A.standingDec} standing; cleared pads / frame replacing canvas)` },
    { id:"3-lifecycle-mid-conversion-1849-12-20", date:"1849-12-20", alt:110, x:midT.x, z:midT.z, ov:{lifecycle:true},
      note:`BUILDING LIFECYCLE overlay — core tent ${midT.id} mid-conversion (${midT.phase}${midT.tr?"/"+midT.tr:""}) — the s108 teardown-replacement arc on canvas` }
  ];

  for(const s of SHOTS){
    await page.evaluate(o=>{ window.__P1850_WBSETOVERLAY("lifecycle", !!o.lifecycle); window.__P1850_WBSETOVERLAY("encamp", false); }, s.ov);
    await page.evaluate(iso=>window.__P1850.jump(iso), s.date); await settle(50);
    await page.evaluate(o=>{ window.__P1850.camSet({ alt:o.alt, x:o.x, z:o.z, snap:true }); }, s);
    await settle(50);
    await page.evaluate(()=>window.__P1850.render&&window.__P1850.render()); await sleep(160);
    const dest = path.join(OUT, `${s.id}.png`);
    let ok=false; try{ await page.screenshot({ path:dest }); ok=true; }catch(e){ console.log("shot error", e.message); }
    console.log(ok?"ok  ":"FAIL", path.basename(dest), "-", s.note);
  }

  await browser.close(); srv.server.close();
})().catch(e=>{ console.error("SHOTS CRASH:", e); process.exit(2); });
