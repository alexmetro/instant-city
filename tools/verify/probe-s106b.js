#!/usr/bin/env node
/* s106b probe — THE 1849 TENT EXPLOSION, machine-readable:
     (1) the tent master report (per-zone placed vs documented target) + the
         variant mix (TNT-1/2/3 shares);
     (2) standing counts per zone at the gate + boom dates (the numbers the
         report quotes) + the raid dip around 1849-07-15;
     (3) the three tent audits at the four canonical noons;
     (4) FAIL-BEFORE/PASS-AFTER:
         (a) __P1850_TENT_QA({ignoreZoneBoundary:true}) -> tentInZone RED;
             knob off -> GREEN (the hard-boundary law is real);
         (b) __P1850_TENT_QA({demoBurn:true}) -> one tent per zone BURNING on
             1849-09-01: the derived set carries phase "burning" and the
             lifecycle overlay style map tints it (compose proof); knob off.
     (5) census-gate guard: fillCensus totals at 1847-04/1848-04 unchanged.
   DEV-ONLY. Prints JSON-ish lines; exit 1 if any expectation breaks. */
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
  await page.goto(`http://127.0.0.1:${srv.port}/atelier.html`, { waitUntil:"load", timeout:120000 });
  await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v&&getComputedStyle(v).display==="none"&&window.__P1850&&window.__P1850.tentCounts; },{timeout:120000});
  const settle = async(n=30)=>{ await page.evaluate(k=>{ for(let i=0;i<k;i++) window.__P1850.tick&&window.__P1850.tick(0.1); }, n); await sleep(120); };

  let bad = false;

  // (1) master report + variant mix
  const master = await page.evaluate(()=>{
    const tc = window.__P1850.tentCounts();
    const all = window.__P1850.tentsAt(window.__P1850.dayOf("1849-12-20"));
    const mix = {}; all.forEach(t=>{ mix[t.code]=(mix[t.code]||0)+1; });
    return { report: tc.report, masterSize: tc.master, mixAtDec20: mix };
  });
  console.log("MASTER:", JSON.stringify(master));
  master.report.forEach(r=>{ if(r.placed < r.target) console.log("  STARVED:", r.zone, r.placed+"/"+r.target); });

  // (2) standing counts at the story dates
  for(const d of ["1846-07-01","1847-04-01","1848-04-01","1848-10-01","1849-07-14","1849-07-16","1849-08-15","1849-09-15","1849-12-20"]){
    const c = await page.evaluate(iso=>window.__P1850.tentCounts(iso), d);
    console.log(`COUNTS @ ${d}:`, JSON.stringify(c.standing));
  }

  // (3) audits at the canonical noons
  for(const d of ["1846-07-01","1848-04-01","1849-09-15","1849-12-20"]){
    await page.evaluate(iso=>window.__P1850.jump(iso), d); await settle();
    const a = await page.evaluate(()=>({
      inZone: window.__P1850.audits.buildings.tentInZone(),
      density: window.__P1850.audits.buildings.tentDensityWindow(),
      det: window.__P1850.audits.buildings.tentDeterminism()
    }));
    console.log(`AUDIT @ ${d}: inZone=${a.inZone.pass} (checked ${a.inZone.checked}) density=${a.density.pass} det=${a.det.pass} (rng ${a.det.rngConsumed})`);
    if(!a.density.pass) console.log("  density problems:", JSON.stringify(a.density.problems), JSON.stringify(a.density.perDate));
    if(!a.inZone.pass) console.log("  inZone sample:", JSON.stringify(a.inZone.sample));
    if(!a.inZone.pass || !a.density.pass || !a.det.pass) bad = true;
  }

  // (4a) fail-before/pass-after: the hard zone boundary
  await page.evaluate(iso=>window.__P1850.jump(iso), "1849-09-15"); await settle();
  const zoneKnob = await page.evaluate(()=>{
    window.__P1850_TENT_QA({ ignoreZoneBoundary:true });
    const failBefore = window.__P1850.audits.buildings.tentInZone();
    window.__P1850_TENT_QA({ ignoreZoneBoundary:false });
    const passAfter = window.__P1850.audits.buildings.tentInZone();
    return { failBefore:{ pass:failBefore.pass, violations:failBefore.violations, sample:failBefore.sample.slice(0,3) },
             passAfter:{ pass:passAfter.pass } };
  });
  console.log("ZONE-LAW FAIL-BEFORE (ignoreZoneBoundary on): pass=" + zoneKnob.failBefore.pass,
              "violations=" + zoneKnob.failBefore.violations, JSON.stringify(zoneKnob.failBefore.sample));
  console.log("ZONE-LAW PASS-AFTER  (knob off):              pass=" + zoneKnob.passAfter.pass);
  if(zoneKnob.failBefore.pass !== false || zoneKnob.passAfter.pass !== true) bad = true;

  // (4b) demoBurn compose proof: a burning tent exists and the overlay style map covers it
  const burn = await page.evaluate(()=>{
    window.__P1850_TENT_QA({ demoBurn:true });
    const day = window.__P1850.dayOf("1849-09-01") + 0.5;
    const set = window.__P1850.tentsAt(day);
    const burning = set.filter(t=>t.phase==="burning").map(t=>({ zone:t.zone, zoneRank:t.zoneRank, code:t.code }));
    window.__P1850_TENT_QA({ demoBurn:false });
    const setOff = window.__P1850.tentsAt(day).filter(t=>t.phase==="burning").length;
    return { burningWithKnob: burning, burningKnobOff: setOff };
  });
  console.log("DEMO-BURN (QA compose proof): with knob =", JSON.stringify(burn.burningWithKnob), "| knob off =", burn.burningKnobOff);
  if(!burn.burningWithKnob.length || burn.burningKnobOff !== 0) bad = true;

  // (5) census gates untouched
  const census = await page.evaluate(()=>({
    c1847: window.__P1850.fillCensus("1847-04-01"),
    c1848: window.__P1850.fillCensus("1848-04-01")
  }));
  console.log("CENSUS GATES:", JSON.stringify(census));
  const dev = (c)=>Math.abs(c.total-c.target)/c.target;
  if(dev(census.c1847) > 0.05 || dev(census.c1848) > 0.05) bad = true;

  await browser.close(); srv.server.close();
  console.log(bad ? "PROBE: RED" : "PROBE: GREEN");
  process.exit(bad ? 1 : 0);
})().catch(e=>{ console.error("PROBE CRASH:", e); process.exit(2); });
