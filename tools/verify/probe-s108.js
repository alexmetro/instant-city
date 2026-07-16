#!/usr/bin/env node
/* s108 lifecycle probe (rules-first fail-before/pass-after proofs + fire scope
   + determinism + the Dennison's timeline read). DEV-ONLY; never shipped.
     1. FIRE SCOPE — which landmarks/fill the authored great-fire-1849
        perimeter covers (must be exactly the record's Kearny-side cluster).
     2. TIMELINES — Dennison's Exchange + El Dorado phase spans (the exemplar
        arcs: construct -> complete -> burn -> ruins -> clearing -> rebuild;
        canvas -> expand for El Dorado).
     3. FAIL-BEFORE — __P1850_LC_QA({breakRuinsGate:true}) must turn
        buildings.lifecycleRuinsGate (and constructionMonotonic) RED;
        __P1850_LC_QA({disableWorldEvents:true}) must turn buildings.fireScope
        RED. Knobs off -> all green again (pass-after).
     4. lifecycleDeterminism green. */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", "..");

function startServer(root){
  const MIME = { ".html":"text/html", ".js":"text/javascript", ".json":"application/json" };
  const server = http.createServer((req,res)=>{ let p = decodeURIComponent(req.url.split("?")[0]); if(p==="/") p="/index.html";
    const fp = path.join(root,p); if(!fp.startsWith(root)){ res.writeHead(403); return res.end(); }
    fs.readFile(fp,(e,b)=>{ if(e){ res.writeHead(404); return res.end(); } res.writeHead(200,{"Content-Type":MIME[path.extname(fp).toLowerCase()]||"application/octet-stream"}); res.end(b); }); });
  return new Promise(r=>server.listen(0,"127.0.0.1",()=>r({server,port:server.address().port})));
}
const sleep = ms=>new Promise(r=>setTimeout(r,ms));

(async ()=>{
  const srv = await startServer(ROOT);
  const browser = await chromium.launch({ headless:true, args:["--use-gl=angle","--use-angle=swiftshader","--ignore-gpu-blocklist","--enable-webgl","--enable-unsafe-swiftshader","--disable-dev-shm-usage"] });
  const page = await (await browser.newContext({ viewport:{width:1280,height:800} })).newPage();
  page.on("pageerror", e=>console.log("PAGEERROR", e.message));
  await page.goto(`http://127.0.0.1:${srv.port}/index.html`, { waitUntil:"load", timeout:90000 });
  await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v&&getComputedStyle(v).display==="none"&&window.__P1850; },{timeout:90000});
  await page.evaluate(iso=>window.__P1850.jump(iso), "1849-12-26");
  await page.evaluate(k=>{ for(let i=0;i<k;i++) window.__P1850.tick&&window.__P1850.tick(0.1); }, 30); await sleep(150);

  const scope = await page.evaluate(()=>window.__P1850.fireScopeInfo());
  console.log("=== FIRE SCOPE (great-fire-1849) ===");
  console.log("day", scope.day, "strips", scope.strips);
  console.log("landmarks IN perimeter:", scope.landmarksInPerimeter.join(", "));
  console.log("fill IN perimeter:", scope.fillInPerimeter.length, "->", scope.fillInPerimeter.join(", "));

  for(const id of ["dennisons-exchange","el-dorado","parker-house","bella-union","colonnade-house"]){
    const lc = await page.evaluate(i=>window.__P1850.buildingLifecycle(i), id);
    console.log(`\n=== ${id} ===`);
    lc.events.forEach(ev=>console.log("  event", ev.type, "start", (+ev.start).toFixed(1), "on", (+ev.on).toFixed(1), ev.via||""));
    lc.spans.forEach(s=>console.log("  span ", s.phase.padEnd(12), s.from, "->", s.to));
  }

  async function runNamed(names){
    return page.evaluate(ns=>{
      const r = window.__P1850.audits.runAll();
      return r.results.filter(x=>ns.includes(x.layer+"."+x.audit)).map(x=>({ audit:x.layer+"."+x.audit, pass:x.pass, detail:{ violations:x.detail&&x.detail.violations, sample:x.detail&&x.detail.sample&&x.detail.sample.slice(0,3), inPerimeter:x.detail&&x.detail.inPerimeter, burnedInPerimeter:x.detail&&x.detail.burnedInPerimeter } }));
    }, names);
  }
  const WATCH = ["buildings.lifecycleRuinsGate","buildings.fireScope","buildings.lifecycleDeterminism","buildings.constructionMonotonic","buildings.reservationDeterminism","buildings.fillDeterminism"];

  console.log("\n=== BASELINE (knobs off) ===");
  (await runNamed(WATCH)).forEach(x=>console.log(" ", x.pass?"PASS":"FAIL", x.audit, JSON.stringify(x.detail)));

  console.log("\n=== FAIL-BEFORE: breakRuinsGate ON ===");
  await page.evaluate(()=>window.__P1850_LC_QA({breakRuinsGate:true}));
  (await runNamed(["buildings.lifecycleRuinsGate","buildings.constructionMonotonic"])).forEach(x=>console.log(" ", x.pass?"PASS":"FAIL", x.audit, JSON.stringify(x.detail)));
  await page.evaluate(()=>window.__P1850_LC_QA({breakRuinsGate:false}));

  console.log("\n=== FAIL-BEFORE: disableWorldEvents ON ===");
  await page.evaluate(()=>window.__P1850_LC_QA({disableWorldEvents:true}));
  (await runNamed(["buildings.fireScope"])).forEach(x=>console.log(" ", x.pass?"PASS":"FAIL", x.audit, JSON.stringify(x.detail)));
  await page.evaluate(()=>window.__P1850_LC_QA({disableWorldEvents:false}));

  console.log("\n=== PASS-AFTER (knobs off again) ===");
  (await runNamed(WATCH)).forEach(x=>console.log(" ", x.pass?"PASS":"FAIL", x.audit, JSON.stringify(x.detail)));

  await browser.close(); srv.server.close();
})().catch(e=>{ console.error("PROBE CRASH:", e); process.exit(2); });
