#!/usr/bin/env node
/* ICS-26 probe — MEASURED BLOCK-COVERAGE TARGETS (RES-4), machine-readable:
     (1) the hotspot field (plaza + active wharf feet, derived from the pier
         record) + the per-band measured coverage table at Dec-20;
     (2) the blockCoverage audit GREEN at the canonical noons + the whole
         s106c/d/e fill suite unregressed + placement.fences now RUNNING
         (the stub is activated — segments > 0, zero P6 violations);
     (3) FAIL-BEFORE / PASS-AFTER: __P1850_FILL_QA({ignoreCoverageTargets:
         true}) reverts the wave to the flat plaza-radial fill (no field, no
         block budgets, no size grading) -> blockCoverage RED (core/mid under,
         waterfront under); knob off -> GREEN (the coverage law is real);
     (4) CENSUS RAILS: 79 @ 1847-04-01 and 130 @ 1848-04-01 EXACT; late-1849
         totals inside the s106c bands (Dec-20 = 765, the ics26 count flex
         INSIDE [630,780]);
     (5) THE 1846-48 FILL IS BYTE-IDENTICAL: derived-fill fingerprints hash to
         the SAME s106b baseline constants.
   DEV-ONLY. Prints JSON-ish lines; exit 1 if any expectation breaks. */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs"), crypto = require("crypto");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", "..");

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
  await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v&&getComputedStyle(v).display==="none"&&window.__P1850&&window.__P1850.blockCoverage; },{timeout:120000});
  const settle = async(n=30)=>{ await page.evaluate(k=>{ for(let i=0;i<k;i++) window.__P1850.tick&&window.__P1850.tick(0.1); }, n); await sleep(120); };

  let bad = false;

  // (1) the field + the measured coverage table
  const cov = await page.evaluate(()=>window.__P1850.blockCoverage("1849-12-20"));
  console.log("HOTSPOTS (derived from the pier record):", JSON.stringify(cov.hotspots));
  console.log("PER-BAND @ Dec-20:", JSON.stringify(cov.perBand));
  console.log("FENCES:", cov.fencedLots, "lots /", cov.fenceSegs, "segments");
  if(!cov.hotspots || cov.hotspots.length < 3){ console.log("  EXPECTED >=3 hotspots (plaza + 2 active 1849 wharves)"); bad = true; }
  const bandRows = {};
  cov.blocks.forEach(b=>{ (bandRows[b.band]=bandRows[b.band]||[]).push(b); });
  for(const band of ["core","waterfront","mid","fringe"]){
    (bandRows[band]||[]).sort((a,b)=>a.plazaD-b.plazaD).forEach(b=>console.log(
      `  ${band.padEnd(10)} cov=${(b.cov*100).toFixed(1).padStart(5)}% build=${b.buildFrac} plazaD=${b.plazaD} wharfD=${b.wharfD} ${b.key}`));
  }

  // (2) audits at the canonical noons
  for(const d of ["1846-07-01","1848-04-01","1849-09-15","1849-12-20"]){
    await page.evaluate(iso=>window.__P1850.jump(iso), d); await settle();
    const a = await page.evaluate(()=>({
      bc: window.__P1850.audits.buildings.blockCoverage(),
      fen: window.__P1850.audits.placement.fences(),
      inTown: window.__P1850.audits.buildings.inTownFill(),
      zcc: window.__P1850.audits.buildings.zoneCoreCanvas(),
      slots: window.__P1850.audits.buildings.lotSlots(),
      cen: window.__P1850.audits.buildings.fillCensus(),
      mix: window.__P1850.audits.buildings.fillEraMix(),
      obb: window.__P1850.audits.buildings.fillFootprintsOBB(),
      fdet: window.__P1850.audits.buildings.fillDeterminism(),
      inZone: window.__P1850.audits.buildings.tentInZone()
    }));
    const keys = Object.keys(a);
    console.log(`AUDIT @ ${d}: ${keys.map(k=>k+"="+a[k].pass).join(" ")}`);
    if(!a.bc.pass) console.log("  blockCoverage:", JSON.stringify(a.bc.problems));
    if(!a.fen.pass || a.fen.skipped) console.log("  fences:", JSON.stringify(a.fen).slice(0,300));
    if(keys.some(k=>!a[k].pass)) bad = true;
    if(a.fen.skipped){ console.log("  placement.fences still SKIPPING — the stub is not activated"); bad = true; }
  }

  // (3) fail-before / pass-after: the coverage law
  await page.evaluate(iso=>window.__P1850.jump(iso), "1849-12-20"); await settle();
  const knob = await page.evaluate(()=>{
    window.__P1850_FILL_QA({ ignoreCoverageTargets:true });
    const fb = window.__P1850.audits.buildings.blockCoverage();
    const it = window.__P1850.audits.buildings.inTownFill();
    window.__P1850_FILL_QA({ ignoreCoverageTargets:false });
    const pa = window.__P1850.audits.buildings.blockCoverage();
    return { failBefore:{ pass:fb.pass, problems:fb.problems, perBand:fb.perBand, inTownStillLegal: it.pass },
             passAfter:{ pass:pa.pass } };
  });
  console.log("COVERAGE LAW FAIL-BEFORE (ignoreCoverageTargets on — flat radial): pass=" + knob.failBefore.pass,
              JSON.stringify(knob.failBefore.problems));
  console.log("  (flat-radial world still placement-LEGAL — inTownFill pass=" + knob.failBefore.inTownStillLegal + " — the offense is the COVERAGE CURVE, isolated)");
  console.log("COVERAGE LAW PASS-AFTER  (knob off): pass=" + knob.passAfter.pass);
  if(knob.failBefore.pass !== false || knob.passAfter.pass !== true) bad = true;

  // (4) census rails
  const census = await page.evaluate(()=>({
    c47: window.__P1850.fillCensus("1847-04-01").total, c48: window.__P1850.fillCensus("1848-04-01").total,
    sep: window.__P1850.fillCensus("1849-09-15").total, dec: window.__P1850.fillCensus("1849-12-20").total
  }));
  console.log("CENSUS RAILS:", JSON.stringify(census), "(gates 79/130 EXACT; bands sep[380,640] dec[630,780])");
  if(census.c47 !== 79 || census.c48 !== 130) bad = true;
  if(census.sep < 380 || census.sep > 640 || census.dec < 630 || census.dec > 780) bad = true;

  // (5) the 1846-48 fill byte-identical to the s106b baseline
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
