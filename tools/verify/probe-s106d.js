#!/usr/bin/env node
/* s106d probe — THE BOOM-WINDOW CORE-CANVAS EXCEPTION (ICS-24),
   machine-readable:
     (1) the wave's core-canvas ledger (coreWave / coreCanvas / cap /
         measured fraction) + the per-tent conversion arc list;
     (2) the audit suite at the canonical noons — zoneCoreCanvas NEW,
         plus every s106b/s106c fill+tent audit unregressed;
     (3) FAIL-BEFORE / PASS-AFTER:
         (a) __P1850_FILL_QA({uncapCoreCanvas:true}) -> the spawner drops the
             fraction cap, canvas floods the core slots -> zoneCoreCanvas RED
             (cap rule); knob off -> GREEN (the bounded law is real);
         (b) __P1850_FILL_QA({ignoreInTownGates:true}) -> inTownFill RED
             (s106c regression guard: the wave gates stay real);
     (4) THE WINDOW LAW at the gate: permit+in-window admits; permit
         before/after the window rejects; no permit rejects (from the
         zoneCoreCanvas gate probes);
     (5) CENSUS GATES EXACT: 79 @ 1847-04-01, 130 @ 1848-04-01; late-1849
         totals still inside the s106c bands (the core canvas is a RESHUFFLE,
         not net-new count);
     (6) THE 1846-48 FILL IS BYTE-IDENTICAL: the derived-fill fingerprints at
         the early dates hash to the SAME s106b/s106c baseline constants;
     (7) IN-WINDOW SHEDDING VISIBLE: core tents standing at 1849-09-15 vs
         1849-12-20 — some conversions land before Dec-20.
   DEV-ONLY. Prints JSON-ish lines; exit 1 if any expectation breaks. */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs"), crypto = require("crypto");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", "..");

/* (6) the SAME baseline constants probe-s106c asserts (captured from 4d115c5). */
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
  await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v&&getComputedStyle(v).display==="none"&&window.__P1850&&window.__P1850.coreCanvas; },{timeout:120000});
  const settle = async(n=30)=>{ await page.evaluate(k=>{ for(let i=0;i<k;i++) window.__P1850.tick&&window.__P1850.tick(0.1); }, n); await sleep(120); };

  let bad = false;

  // (1) the core-canvas ledger + conversion arcs
  const cc = await page.evaluate(()=>window.__P1850.coreCanvas());
  console.log("CORE CANVAS:", JSON.stringify({ frac:cc.frac, windowISO:cc.windowISO, coreWave:cc.coreWave, coreCanvas:cc.coreCanvas, cap:cc.cap }));
  cc.entries.forEach(e=>console.log("  ", e.id, "@day", e.appearDay, "->", e.events.join(" ")));
  if(!(cc.coreCanvas >= 1)){ console.log("  NO CORE CANVAS PLACED"); bad = true; }
  if(cc.coreCanvas > cc.cap){ console.log("  CAP EXCEEDED:", cc.coreCanvas, ">", cc.cap); bad = true; }
  const wave = await page.evaluate(()=>window.__P1850.fillWave());
  console.log("WAVE:", JSON.stringify({ placed:wave.placed, need:wave.need, mix:wave.mix, coreWave:wave.coreWave, coreCanvas:wave.coreCanvas, coreCanvasFrac:wave.coreCanvasFrac }));

  // (2) the audit suite at the canonical noons
  for(const d of ["1846-07-01","1848-04-01","1849-09-15","1849-12-20"]){
    await page.evaluate(iso=>window.__P1850.jump(iso), d); await settle();
    const a = await page.evaluate(()=>({
      zcc: window.__P1850.audits.buildings.zoneCoreCanvas(),
      inTown: window.__P1850.audits.buildings.inTownFill(),
      inZone: window.__P1850.audits.buildings.tentInZone(),
      density: window.__P1850.audits.buildings.tentDensityWindow(),
      cen: window.__P1850.audits.buildings.fillCensus(),
      mix: window.__P1850.audits.buildings.fillEraMix(),
      obb: window.__P1850.audits.buildings.fillFootprintsOBB(),
      fdet: window.__P1850.audits.buildings.fillDeterminism(),
      tdet: window.__P1850.audits.buildings.tentDeterminism(),
      zone: window.__P1850.audits.placement.zoneLaw()
    }));
    const keys = ["zcc","inTown","inZone","density","cen","mix","obb","fdet","tdet","zone"];
    console.log(`AUDIT @ ${d}: ${keys.map(k=>k+"="+a[k].pass).join(" ")}`);
    if(!a.zcc.pass) console.log("  zoneCoreCanvas:", JSON.stringify(a.zcc.problems));
    if(!a.inTown.pass) console.log("  inTownFill:", JSON.stringify(a.inTown.problems));
    if(!a.zone.pass) console.log("  zoneLaw:", JSON.stringify(a.zone.gate));
    if(keys.some(k=>!a[k].pass)) bad = true;
    if(d === "1849-12-20") console.log("  zcc detail:", JSON.stringify({ coreWave:a.zcc.coreWave, coreCanvas:a.zcc.coreCanvas, cap:a.zcc.cap, frac:a.zcc.measuredFrac, arcs:a.zcc.arcs }));
  }

  // (3a) fail-before/pass-after: the fraction cap
  await page.evaluate(iso=>window.__P1850.jump(iso), "1849-09-15"); await settle();
  const capKnob = await page.evaluate(()=>{
    window.__P1850_FILL_QA({ uncapCoreCanvas:true });
    const failBefore = window.__P1850.audits.buildings.zoneCoreCanvas();
    const uncapLedger = window.__P1850.fillWave();
    window.__P1850_FILL_QA({ uncapCoreCanvas:false });
    const passAfter = window.__P1850.audits.buildings.zoneCoreCanvas();
    return { failBefore:{ pass:failBefore.pass, coreCanvas:failBefore.coreCanvas, cap:failBefore.cap, problems:failBefore.problems },
             uncapLedger:{ coreWave:uncapLedger.coreWave, coreCanvas:uncapLedger.coreCanvas },
             passAfter:{ pass:passAfter.pass, coreCanvas:passAfter.coreCanvas, cap:passAfter.cap } };
  });
  console.log("CORE-CANVAS CAP FAIL-BEFORE (uncapCoreCanvas on): pass=" + capKnob.failBefore.pass,
              "canvas=" + capKnob.failBefore.coreCanvas, "cap=" + capKnob.failBefore.cap, JSON.stringify(capKnob.failBefore.problems));
  console.log("CORE-CANVAS CAP PASS-AFTER  (knob off):           pass=" + capKnob.passAfter.pass,
              "canvas=" + capKnob.passAfter.coreCanvas, "cap=" + capKnob.passAfter.cap);
  if(capKnob.failBefore.pass !== false || capKnob.passAfter.pass !== true) bad = true;

  // (3b) s106c regression: the in-town wave-gates knob still proves fail-before
  const fillKnob = await page.evaluate(()=>{
    window.__P1850_FILL_QA({ ignoreInTownGates:true });
    const failBefore = window.__P1850.audits.buildings.inTownFill();
    window.__P1850_FILL_QA({ ignoreInTownGates:false });
    const passAfter = window.__P1850.audits.buildings.inTownFill();
    return { failBefore:{ pass:failBefore.pass, problems:failBefore.problems }, passAfter:{ pass:passAfter.pass } };
  });
  console.log("IN-TOWN GATES FAIL-BEFORE (ignoreInTownGates on): pass=" + fillKnob.failBefore.pass, JSON.stringify(fillKnob.failBefore.problems));
  console.log("IN-TOWN GATES PASS-AFTER  (knob off):             pass=" + fillKnob.passAfter.pass);
  if(fillKnob.failBefore.pass !== false || fillKnob.passAfter.pass !== true) bad = true;

  // (4) the window law at the gate (from the audit's probe table)
  const gate = await page.evaluate(()=>window.__P1850.audits.buildings.zoneCoreCanvas().gate);
  console.log("GATE PROBES:", JSON.stringify(gate.probes));
  if(gate.failures > 0) bad = true;

  // (5) census gates EXACT + late-1849 bands
  const census = await page.evaluate(()=>({
    c1847: window.__P1850.fillCensus("1847-04-01"),
    c1848: window.__P1850.fillCensus("1848-04-01"),
    sep: window.__P1850.fillCensus("1849-09-15"),
    dec: window.__P1850.fillCensus("1849-12-20")
  }));
  console.log("CENSUS GATES (EXACT):", JSON.stringify({ c1847:census.c1847.total, c1848:census.c1848.total }));
  console.log("LATE-1849 TOTALS:", JSON.stringify({ sep:census.sep.total, dec:census.dec.total }));
  if(census.c1847.total !== 79 || census.c1848.total !== 130) bad = true;
  if(census.sep.total < 380 || census.sep.total > 640 || census.dec.total < 630 || census.dec.total > 780) bad = true;

  // (6) the 1846-48 fill byte-identical to the s106b/s106c baseline
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

  // (7) in-window shedding visible: standing core canvas Sept vs Dec
  const shed = await page.evaluate(()=>{
    function standing(iso){
      const day = window.__P1850.dayOf(iso);
      return window.__P1850.fillAt(day).filter(e => e.coreCanvas && e.subtype === "tent" && e.cls !== "frame" &&
        (e.phase === "complete" || e.phase === "constructing" || e.phase === "expanding")).length;
    }
    const arcs = window.__P1850.audits.buildings.zoneCoreCanvas().arcs;
    return { sep: standing("1849-09-15"), dec: standing("1849-12-20"), arcs };
  });
  console.log("SHEDDING:", JSON.stringify(shed));
  if(shed.arcs.convertedByDec20 + shed.arcs.fireConsumed < 1){ console.log("  NO conversion visible in-window"); bad = true; }
  if(shed.arcs.standingAt1850_06 !== 0){ console.log("  core canvas survives mid-1850"); bad = true; }

  await browser.close(); srv.server.close();
  console.log(bad ? "PROBE: RED" : "PROBE: GREEN");
  process.exit(bad ? 1 : 0);
})().catch(e=>{ console.error("PROBE CRASH:", e); process.exit(2); });
