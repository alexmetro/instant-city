#!/usr/bin/env node
/* s106e screenshots — CANVAS-FIRST LOT ARCS + SLOTS (atelier):
     (1-3) a RESIDENTIAL-BAND block closeup at Aug-15 / Oct-15 / Dec-20 1849,
           SAME framing — lots with mixed-stage occupants: canvas-first fronts
           still canvas beside hardened ones, rear-court tents behind street
           fronts, the mix hardening over time;
     (4a)  a lot whose front's EXPANSION is consuming its rear tent — the
           tent mid-TEARDOWN under the BUILDING LIFECYCLE overlay;
     (4b)  the SAME lot days later — the annex EXPANDING over the cleared
           rear slot (lifecycle overlay);
     (5)   the town overview @ Dec-20 — totals look unchanged (the slots/arcs
           are a reshuffle of the same wave, never net-new).
   FULL-PAGE captures. DEV-ONLY. Writes <APP_ROOT>/screenings/2026-07-17-s106e/. */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "screenings", "2026-07-17-s106e");

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
  await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v&&getComputedStyle(v).display==="none"&&window.__P1850&&window.__P1850.lotSlots; },{timeout:120000});

  /* anchors: the densest 70 m neighborhood of slot/arc entries (canvas-first
     fronts + tent-harden fronts + rear tents) standing at Oct-15 (shots 1-3
     share the framing so the hardening reads) + the earliest expansion lot
     (for the consumption closeup) with the teardown/expanding dates derived
     from ITS OWN schedule. */
  const A = await page.evaluate(()=>{
    const plaza = window.__P1850.plazaCenter;
    /* score neighborhoods at Dec-20 for the FULL mixed-stage story: canvas
       still standing + hardened arcs + rear-court tents, all within one
       ~60 m block reach. */
    const day = window.__P1850.dayOf("1849-12-20");
    const set = window.__P1850.fillAt(day).filter(e=>(e.canvasFirst||e.tentHarden||e.rearOf!=null));
    let best = null, bestScore = -1, bestN = 0;
    set.forEach(a=>{
      const nb = set.filter(b=>Math.hypot(a.cx-b.cx, a.cz-b.cz) < 60);
      const canvas = nb.filter(e=>(e.cls==="canvas"||(e.subtype==="tent"&&e.cls!=="frame")) && e.phase==="complete").length;
      const hard = nb.filter(e=>(e.canvasFirst||e.tentHarden) && e.cls!=="canvas" && e.phase==="complete").length;
      const rear = nb.filter(e=>e.rearOf!=null && e.phase==="complete").length;
      const score = Math.min(canvas,4)*2 + Math.min(hard,3)*3 + Math.min(rear,3)*2 + nb.length*0.1;
      if(score > bestScore){ bestScore = score; best = nb; bestN = nb.length; }
    });
    let cx=plaza.x, cz=plaza.z; if(best){ cx=0; cz=0; best.forEach(e=>{cx+=e.cx; cz+=e.cz;}); cx/=best.length; cz/=best.length; }
    const ls = window.__P1850.lotSlots();
    const exps = ls.exps.slice().sort((a,b)=>a.start-b.start);
    const exp0 = exps.length ? exps[0] : null;
    const base = window.__P1850.dayOf("1849-01-01");
    function iso(d){ const t = new Date(Date.UTC(1849,0,1)); t.setUTCDate(t.getUTCDate() + Math.round(d - base)); return t.toISOString().slice(0,10); }
    return { plaza:{x:plaza.x,z:plaza.z}, cluster:{x:cx,z:cz,n:bestN},
             exp: exp0 ? { id:exp0.id, x:exp0.x, z:exp0.z, start:exp0.start, on:exp0.on,
                           tearISO: iso(exp0.start - 2), midISO: iso(exp0.start + 8), consumes: exp0.consumes } : null,
             ledger: { rearSlots: ls.rearSlots, canvasFirst: ls.canvasFirst, tentHarden: ls.tentHarden, expansions: ls.expansions } };
  });
  console.log("anchors:", JSON.stringify(A));

  const SHOTS = [
    { id:"1-res-band-lots-1849-08-15", date:"1849-08-15", alt:110, x:A.cluster.x, z:A.cluster.z, ov:{},
      note:"residential band Aug 1849 — young lots: canvas fronts (canvas-first + tents) with the first rear-court tents behind them" },
    { id:"2-res-band-lots-1849-10-15", date:"1849-10-15", alt:110, x:A.cluster.x, z:A.cluster.z, ov:{},
      note:`SAME framing Oct 1849 — mixed stages: canvas + frame coexisting (${A.cluster.n} slot/arc entries in the cluster), more rear tents seated` },
    { id:"3-res-band-lots-1849-12-20", date:"1849-12-20", alt:110, x:A.cluster.x, z:A.cluster.z, ov:{},
      note:"SAME framing Dec 1849 — the mix hardening: early canvas-first fronts now boxes, rear slots still canvas (they lag, by law)" }
  ];
  if(A.exp){
    SHOTS.push(
      { id:"4a-expansion-consumes-teardown", date:A.exp.tearISO, alt:80, x:A.exp.x, z:A.exp.z, ov:{lifecycle:true},
        note:`BUILDING LIFECYCLE overlay — lot ${A.exp.id}: the rear tent mid-TEARDOWN (consumption; teardown completes before the annex breaks ground)` },
      { id:"4b-expansion-annex-rising", date:A.exp.midISO, alt:80, x:A.exp.x, z:A.exp.z, ov:{lifecycle:true},
        note:`SAME lot ${A.exp.id} days later — the front EXPANDING over the consumed rear slot's cleared ground (lifecycle overlay)` });
  }
  SHOTS.push(
    { id:"5-town-overview-1849-12-20", date:"1849-12-20", alt:1400, x:A.plaza.x, z:A.plaza.z, ov:{},
      note:"town overview Dec 1849 — totals unchanged (slots/arcs reshuffle the SAME 720-structure census, never add to it)" });

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
