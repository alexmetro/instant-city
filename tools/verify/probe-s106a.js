#!/usr/bin/env node
/* s106a probe — ENCAMPMENT ZONES registry + audits, machine-readable:
     (1) the registry contents at 1849-09-15 (zones, tiers, dates, ring sizes,
         centroids — the numbers the report quotes);
     (2) the placement.encampmentZones audit DETAIL (dryFrac / plattedFrac per
         zone) at the four canonical noons;
     (3) FAIL-BEFORE/PASS-AFTER: tamper the live registry (push an invented,
         provenance-free zone) → the audit must go RED; restore → GREEN.
   DEV-ONLY. Prints JSON; exit 1 if any expectation breaks. */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", "..");

function startServer(root){
  const MIME = { ".html":"text/html", ".js":"text/javascript", ".json":"application/json", ".png":"image/png" };
  const server = http.createServer((req,res)=>{ let p = decodeURIComponent(req.url.split("?")[0]); if(p==="/") p="/index.html";
    const fp = path.join(root,p); if(!fp.startsWith(root)){ res.writeHead(403); return res.end(); }
    fs.readFile(fp,(e,b)=>{ if(e){ res.writeHead(404); return res.end(); } res.writeHead(200,{"Content-Type":MIME[path.extname(fp).toLowerCase()]||"application/octet-stream"}); res.end(b); }); });
  return new Promise(r=>server.listen(0,"127.0.0.1",()=>r({server,port:server.address().port})));
}
const sleep = ms=>new Promise(r=>setTimeout(r,ms));

(async ()=>{
  const srv = await startServer(ROOT);
  const browser = await chromium.launch({ headless:true, args:["--use-gl=angle","--use-angle=swiftshader","--ignore-gpu-blocklist","--enable-webgl","--enable-unsafe-swiftshader","--disable-dev-shm-usage"] });
  const page = await (await browser.newContext({ viewport:{width:1600,height:1000} })).newPage();
  page.on("pageerror", e=>console.log("PAGEERROR", e.message));
  await page.goto(`http://127.0.0.1:${srv.port}/atelier.html`, { waitUntil:"load", timeout:90000 });
  await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v&&getComputedStyle(v).display==="none"&&window.__P1850; },{timeout:90000});
  const settle = async(n=30)=>{ await page.evaluate(k=>{ for(let i=0;i<k;i++) window.__P1850.tick&&window.__P1850.tick(0.1); }, n); await sleep(120); };

  let bad = false;

  // (1) registry at 1849-09-15
  await page.evaluate(iso=>window.__P1850.jump(iso), "1849-09-15"); await settle();
  const reg = await page.evaluate(()=>{
    const E = window.__P1850_ENCAMP;
    return {
      total: E.zones.length,
      activeAt_1849_09_15: E.at(window.__P1850.dayOf("1849-09-15")).map(z=>z.id),
      activeAt_1848_04_01: E.at(window.__P1850.dayOf("1848-04-01")).map(z=>z.id),
      activeAt_1849_01_01: E.at(window.__P1850.dayOf("1849-01-01")).map(z=>z.id),
      zones: E.zones.map(z=>{
        const r0 = z.poly||[]; let cx=0,cz=0; r0.forEach(p=>{cx+=p.x;cz+=p.z;});
        return { id:z.id, name:z.name, tier:z.tier, approximate:z.approximate,
                 start:z.startDate, startApproximate:z.startApproximate, end:z.endDate,
                 boundedBy:z.boundedBy, rings:z.rings.length,
                 ringPts:z.rings.map(r=>r.length),
                 centroid: r0.length?{x:+(cx/r0.length).toFixed(1), z:+(cz/r0.length).toFixed(1)}:null,
                 plattedOverlapDocumented:z.plattedOverlapDocumented };
      })
    };
  });
  console.log("REGISTRY:", JSON.stringify(reg, null, 1));

  // (2) audit detail at the four noons
  for(const d of ["1846-07-01","1848-04-01","1849-09-15","1849-12-20"]){
    await page.evaluate(iso=>window.__P1850.jump(iso), d); await settle();
    const a = await page.evaluate(()=>({
      zones: window.__P1850.audits.placement.encampmentZones(),
      det:   window.__P1850.audits.placement.encampmentDeterminism()
    }));
    console.log(`AUDIT @ ${d}: zones pass=${a.zones.pass} active=${a.zones.activeAtDate}`,
      JSON.stringify(a.zones.perZone), `| determinism pass=${a.det.pass} rng=${a.det.rngConsumed}`);
    if(!a.zones.pass || !a.det.pass) bad = true;
  }

  // (3) fail-before / pass-after: an invented provenance-free zone must RED the audit
  await page.evaluate(iso=>window.__P1850.jump(iso), "1849-09-15"); await settle();
  const tamper = await page.evaluate(()=>{
    const E = window.__P1850_ENCAMP;
    E.zones.push({ id:"invented-camp", name:"Invented Camp", tier:"primary", approximate:false,
      startDate:"1849-01-01", startDay:window.__P1850.dayOf("1849-01-01"), endDay:null,
      basis:"", sources:[], rings:[[{x:0,z:0},{x:50,z:0},{x:50,z:50}]], poly:null, plattedOverlapDocumented:false });
    const failBefore = window.__P1850.audits.placement.encampmentZones();
    E.zones.pop();
    const passAfter = window.__P1850.audits.placement.encampmentZones();
    return { failBefore:{ pass:failBefore.pass, problems:failBefore.problems }, passAfter:{ pass:passAfter.pass } };
  });
  console.log("FAIL-BEFORE (invented zone injected): pass=" + tamper.failBefore.pass, JSON.stringify(tamper.failBefore.problems));
  console.log("PASS-AFTER  (restored):               pass=" + tamper.passAfter.pass);
  if(tamper.failBefore.pass !== false || tamper.passAfter.pass !== true) bad = true;

  await browser.close(); srv.server.close();
  console.log(bad ? "PROBE: RED" : "PROBE: GREEN");
  process.exit(bad ? 1 : 0);
})().catch(e=>{ console.error("PROBE CRASH:", e); process.exit(2); });
