#!/usr/bin/env node
/* s106c probe — BLEED HALOS + THE 1849 IN-TOWN TENT-FIRST FILL (ICS-23),
   machine-readable:
     (1) the tent master's per-zone HALO OCCUPANCY split (core vs halo vs the
         documented totals — totals must MATCH s106b's anchors: HV 1000 etc.);
     (2) the 1849 in-town wave report (placed/need, tent-first mix, reject
         ledger) + the fill census at the story dates;
     (3) the amended/new audits at the boom noon: tentInZone (zone+halo),
         tentDensityWindow, tentDeterminism, inTownFill, fillCensus,
         fillEraMix, fillFootprintsOBB, fillDeterminism;
     (4) FAIL-BEFORE / PASS-AFTER:
         (a) __P1850_TENT_QA({ignoreZoneBoundary:true}) -> tents sampled far
             beyond zone+halo -> tentInZone RED; knob off -> GREEN (the
             amended boundary law is still real);
         (b) __P1850_FILL_QA({ignoreInTownGates:true}) -> the 1849 wave drops
             its gates + curb setback -> inTownFill RED (ROW/reserved/camp
             offenses); knob off -> GREEN (the wave's gates are real);
     (5) CENSUS GATES EXACT: totals 79 @ 1847-04-01 and 130 @ 1848-04-01;
     (6) THE 1846-48 FILL IS BYTE-IDENTICAL to the pre-s106c build: the
         derived-fill fingerprints at the early dates hash to the constants
         captured from commit 4d115c5 (s106b) before this sprint's changes.
   DEV-ONLY. Prints JSON-ish lines; exit 1 if any expectation breaks. */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs"), crypto = require("crypto");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", "..");

/* (6) pre-s106c fingerprints — captured live from the s106b build (4d115c5)
   with the same fingerprint formula as buildings.fillDeterminism. */
const BASELINE_FILL_FP = {
  "1846-07-01": { rows: 52,  sha256: "f6ee705a674a1e111f7661d3d246bb07a5bea59d82a6250dfb0da5726ff23297" },
  "1847-04-01": { rows: 78,  sha256: "5d4dcd3f18037bee53a02b75559fba1af1341451730edad6e7ef093c3564e45b" },
  "1848-04-01": { rows: 113, sha256: "226eda907f93307b3edc06cc065d8ffa1e1626de4df72c747c5027c8113a3824" }
};

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
  await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v&&getComputedStyle(v).display==="none"&&window.__P1850&&window.__P1850.fillWave; },{timeout:120000});
  const settle = async(n=30)=>{ await page.evaluate(k=>{ for(let i=0;i<k;i++) window.__P1850.tick&&window.__P1850.tick(0.1); }, n); await sleep(120); };

  let bad = false;

  // (1) tent master halo occupancy + the documented totals unchanged
  const rep = await page.evaluate(()=>window.__P1850.tentCounts().report);
  console.log("TENT MASTER (core/halo):", JSON.stringify(rep));
  const expTargets = { "happy-valley":1000, "little-chile":60, "pleasant-valley":40 };
  rep.forEach(r=>{
    if(r.placed !== expTargets[r.zone]){ console.log("  TOTAL REGRESSED:", r.zone, r.placed, "!=", expTargets[r.zone]); bad = true; }
  });

  // (2) the 1849 in-town wave report + fill census at the story dates
  const wave = await page.evaluate(()=>window.__P1850.fillWave());
  console.log("WAVE:", JSON.stringify(wave));
  if(wave.placed < wave.need){ console.log("  WAVE STARVED:", wave.placed + "/" + wave.need); }
  for(const d of ["1848-04-01","1849-06-15","1849-08-01","1849-09-15","1849-12-20"]){
    const c = await page.evaluate(iso=>window.__P1850.fillCensus(iso), d);
    console.log(`FILL CENSUS @ ${d}:`, JSON.stringify(c));
  }

  // (3) the audit suite at the canonical noons
  for(const d of ["1846-07-01","1848-04-01","1849-09-15","1849-12-20"]){
    await page.evaluate(iso=>window.__P1850.jump(iso), d); await settle();
    const a = await page.evaluate(()=>({
      inZone: window.__P1850.audits.buildings.tentInZone(),
      density: window.__P1850.audits.buildings.tentDensityWindow(),
      tdet: window.__P1850.audits.buildings.tentDeterminism(),
      inTown: window.__P1850.audits.buildings.inTownFill(),
      cen: window.__P1850.audits.buildings.fillCensus(),
      mix: window.__P1850.audits.buildings.fillEraMix(),
      obb: window.__P1850.audits.buildings.fillFootprintsOBB(),
      fdet: window.__P1850.audits.buildings.fillDeterminism()
    }));
    const flags = ["inZone","density","tdet","inTown","cen","mix","obb","fdet"].map(k=>k+"="+a[k].pass).join(" ");
    console.log(`AUDIT @ ${d}: ${flags}`);
    if(!a.inZone.pass) console.log("  inZone:", JSON.stringify(a.inZone.sample));
    if(!a.inTown.pass) console.log("  inTown:", JSON.stringify(a.inTown.problems));
    if(!a.density.pass) console.log("  density:", JSON.stringify(a.density.problems));
    if(["inZone","density","tdet","inTown","cen","mix","obb","fdet"].some(k=>!a[k].pass)) bad = true;
    if(d === "1849-12-20") console.log("  inZone occupancy:", JSON.stringify(a.inZone.occupancy));
  }

  // (4a) fail-before/pass-after: the zone+halo boundary law
  await page.evaluate(iso=>window.__P1850.jump(iso), "1849-09-15"); await settle();
  const zoneKnob = await page.evaluate(()=>{
    window.__P1850_TENT_QA({ ignoreZoneBoundary:true });
    const failBefore = window.__P1850.audits.buildings.tentInZone();
    window.__P1850_TENT_QA({ ignoreZoneBoundary:false });
    const passAfter = window.__P1850.audits.buildings.tentInZone();
    return { failBefore:{ pass:failBefore.pass, violations:failBefore.violations, sample:failBefore.sample.slice(0,3) },
             passAfter:{ pass:passAfter.pass } };
  });
  console.log("ZONE+HALO LAW FAIL-BEFORE (ignoreZoneBoundary on): pass=" + zoneKnob.failBefore.pass,
              "violations=" + zoneKnob.failBefore.violations, JSON.stringify(zoneKnob.failBefore.sample));
  console.log("ZONE+HALO LAW PASS-AFTER  (knob off):              pass=" + zoneKnob.passAfter.pass);
  if(zoneKnob.failBefore.pass !== false || zoneKnob.passAfter.pass !== true) bad = true;

  // (4b) fail-before/pass-after: the in-town wave gates
  const fillKnob = await page.evaluate(()=>{
    window.__P1850_FILL_QA({ ignoreInTownGates:true });
    const failBefore = window.__P1850.audits.buildings.inTownFill();
    window.__P1850_FILL_QA({ ignoreInTownGates:false });
    const passAfter = window.__P1850.audits.buildings.inTownFill();
    return { failBefore:{ pass:failBefore.pass, problems:failBefore.problems, legality:failBefore.legality },
             passAfter:{ pass:passAfter.pass } };
  });
  console.log("IN-TOWN GATES FAIL-BEFORE (ignoreInTownGates on): pass=" + fillKnob.failBefore.pass,
              JSON.stringify(fillKnob.failBefore.problems));
  console.log("IN-TOWN GATES PASS-AFTER  (knob off):             pass=" + fillKnob.passAfter.pass);
  if(fillKnob.failBefore.pass !== false || fillKnob.passAfter.pass !== true) bad = true;

  // (5) census gates EXACT
  const census = await page.evaluate(()=>({
    c1847: window.__P1850.fillCensus("1847-04-01"),
    c1848: window.__P1850.fillCensus("1848-04-01")
  }));
  console.log("CENSUS GATES (EXACT):", JSON.stringify(census));
  if(census.c1847.total !== 79 || census.c1848.total !== 130) bad = true;

  // (6) the 1846-48 fill byte-identical to the pre-s106c build
  for(const iso of Object.keys(BASELINE_FILL_FP)){
    const fp = await page.evaluate((iso)=>{
      const day = window.__P1850.dayOf(iso);
      return window.__P1850.fillAt(day).map(e =>
        e.code + "|" + e.cx.toFixed(3) + "|" + e.cz.toFixed(3) + "|" + e.state + "|" + e.hFrac.toFixed(3) + "|" + e.yaw.toFixed(5) + "|" + (e.counted?1:0)
        + "|" + e.phase + "|" + (e.transition ? e.transition.type + ":" + e.transition.progress.toFixed(5) : "-")).join("\n");
    }, iso);
    const rows = fp.split("\n").filter(Boolean).length;
    const sha = crypto.createHash("sha256").update(fp).digest("hex");
    const exp = BASELINE_FILL_FP[iso];
    const ok = rows === exp.rows && sha === exp.sha256;
    console.log(`1846-48 FILL FP @ ${iso}: rows=${rows} sha=${sha.slice(0,16)}… ${ok ? "== s106b baseline" : "MISMATCH vs s106b baseline"}`);
    if(!ok) bad = true;
  }

  await browser.close(); srv.server.close();
  console.log(bad ? "PROBE: RED" : "PROBE: GREEN");
  process.exit(bad ? 1 : 0);
})().catch(e=>{ console.error("PROBE CRASH:", e); process.exit(2); });
