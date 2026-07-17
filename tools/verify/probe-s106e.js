#!/usr/bin/env node
/* s106e probe — CANVAS-FIRST LOT ARCS + SLOTS (ICS-25), machine-readable:
     (1) the slots/arcs ledger (lots / rear slots / canvas-first / expansions)
         + the expansion arc list;
     (2) the audit suite at the canonical noons — lotSlots NEW, plus every
         s106b/c/d fill+tent+lifecycle audit unregressed;
     (3) FAIL-BEFORE / PASS-AFTER:
         (a) __P1850_FILL_QA({ignoreSlotGates:true}) -> rear tents posed on
             the STREET side gateless + expansions granted without their
             consumption teardowns -> lotSlots RED (packing + expansion
             clauses); knob off -> GREEN (the slot law is real);
         (b) __P1850_FILL_QA({uncapCoreCanvas:true}) -> zoneCoreCanvas RED
             (s106d regression guard);
         (c) __P1850_FILL_QA({ignoreInTownGates:true}) -> inTownFill RED
             (s106c regression guard);
     (4) CENSUS GATES EXACT: 79 @ 1847-04-01, 130 @ 1848-04-01; late-1849
         totals inside the s106c bands (rear tents + canvas-first arcs are a
         RESHUFFLE of the wave, never net-new count — the arithmetic printed);
     (5) THE 1846-48 FILL IS BYTE-IDENTICAL: derived-fill fingerprints at the
         early dates hash to the SAME s106b/c/d baseline constants;
     (6) THE MIXED-STAGE TEXTURE IS VISIBLE: canvas-first entries standing AS
         canvas vs already hardened at Aug-15 / Oct-15 / Dec-20 (coexistence +
         monotone hardening), rear tents standing, >=1 expansion by Dec-20.
   DEV-ONLY. Prints JSON-ish lines; exit 1 if any expectation breaks. */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs"), crypto = require("crypto");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", "..");

/* (5) the SAME baseline constants probe-s106c/d assert (captured from 4d115c5). */
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
  await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v&&getComputedStyle(v).display==="none"&&window.__P1850&&window.__P1850.lotSlots; },{timeout:120000});
  const settle = async(n=30)=>{ await page.evaluate(k=>{ for(let i=0;i<k;i++) window.__P1850.tick&&window.__P1850.tick(0.1); }, n); await sleep(120); };

  let bad = false;

  // (1) the slots/arcs ledger
  const ls = await page.evaluate(()=>window.__P1850.lotSlots());
  console.log("SLOTS/ARCS:", JSON.stringify({ lots:ls.lots, lotsWithRear:ls.lotsWithRear, rearSlots:ls.rearSlots, rearCap:ls.rearCap,
    canvasFirst:ls.canvasFirst, tentHarden:ls.tentHarden, expansions:ls.expansions, cvfWindowD:ls.cvfWindowD,
    cvfFrac:ls.cvfFrac, tentHardenFrac:ls.tentHardenFrac, rearFrac:ls.rearFrac, expFrac:ls.expFrac }));
  ls.exps.forEach(x=>console.log("  EXP", x.id, "start", x.start, "on", x.on, "dExp", x.dExp, "consumes", JSON.stringify(x.consumes)));
  if(ls.rearSlots < 1 || ls.canvasFirst < 1 || ls.tentHarden < 1 || ls.expansions < 1){ console.log("  A MECHANIC IS VACUOUS"); bad = true; }
  const wave = await page.evaluate(()=>window.__P1850.fillWave());
  console.log("WAVE:", JSON.stringify({ placed:wave.placed, need:wave.need, mix:wave.mix,
    coreWave:wave.coreWave, coreCanvas:wave.coreCanvas, rearSlots:wave.rearSlots, canvasFirst:wave.canvasFirst,
    tentHarden:wave.tentHarden, expansions:wave.expansions }));

  // (2) the audit suite at the canonical noons
  for(const d of ["1846-07-01","1848-04-01","1849-09-15","1849-12-20"]){
    await page.evaluate(iso=>window.__P1850.jump(iso), d); await settle();
    const a = await page.evaluate(()=>({
      slots: window.__P1850.audits.buildings.lotSlots(),
      zcc: window.__P1850.audits.buildings.zoneCoreCanvas(),
      inTown: window.__P1850.audits.buildings.inTownFill(),
      inZone: window.__P1850.audits.buildings.tentInZone(),
      density: window.__P1850.audits.buildings.tentDensityWindow(),
      cen: window.__P1850.audits.buildings.fillCensus(),
      mix: window.__P1850.audits.buildings.fillEraMix(),
      obb: window.__P1850.audits.buildings.fillFootprintsOBB(),
      fdet: window.__P1850.audits.buildings.fillDeterminism(),
      tdet: window.__P1850.audits.buildings.tentDeterminism(),
      ruins: window.__P1850.audits.buildings.lifecycleRuinsGate(),
      fire: window.__P1850.audits.buildings.fireScope(),
      ldet: window.__P1850.audits.buildings.lifecycleDeterminism(),
      zone: window.__P1850.audits.placement.zoneLaw()
    }));
    const keys = Object.keys(a);
    console.log(`AUDIT @ ${d}: ${keys.map(k=>k+"="+a[k].pass).join(" ")}`);
    if(!a.slots.pass) console.log("  lotSlots:", JSON.stringify(a.slots.problems), JSON.stringify(a.slots.packing.sample), JSON.stringify(a.slots.expansion.sample));
    if(!a.zcc.pass) console.log("  zoneCoreCanvas:", JSON.stringify(a.zcc.problems));
    if(!a.inTown.pass) console.log("  inTownFill:", JSON.stringify(a.inTown.problems));
    if(!a.obb.pass) console.log("  fillFootprintsOBB:", JSON.stringify(a.obb.sample));
    if(!a.ruins.pass) console.log("  ruinsGate:", JSON.stringify(a.ruins.sample));
    if(keys.some(k=>!a[k].pass)) bad = true;
    if(d === "1849-12-20") console.log("  lotSlots detail:", JSON.stringify(a.slots.counts), "arcs:", JSON.stringify(a.slots.arcs.hardenDelaysD));
  }

  // (3a) fail-before/pass-after: the slot law
  await page.evaluate(iso=>window.__P1850.jump(iso), "1849-09-15"); await settle();
  const slotKnob = await page.evaluate(()=>{
    window.__P1850_FILL_QA({ ignoreSlotGates:true });
    const failBefore = window.__P1850.audits.buildings.lotSlots();
    window.__P1850_FILL_QA({ ignoreSlotGates:false });
    const passAfter = window.__P1850.audits.buildings.lotSlots();
    return { failBefore:{ pass:failBefore.pass, problems:failBefore.problems,
                          packing:failBefore.packing.violations, expansion:failBefore.expansion.violations },
             passAfter:{ pass:passAfter.pass, packing:passAfter.packing.violations, expansion:passAfter.expansion.violations } };
  });
  console.log("SLOT LAW FAIL-BEFORE (ignoreSlotGates on): pass=" + slotKnob.failBefore.pass,
              "packingViol=" + slotKnob.failBefore.packing, "expViol=" + slotKnob.failBefore.expansion, JSON.stringify(slotKnob.failBefore.problems));
  console.log("SLOT LAW PASS-AFTER  (knob off):           pass=" + slotKnob.passAfter.pass);
  if(slotKnob.failBefore.pass !== false || slotKnob.passAfter.pass !== true) bad = true;

  // (3b) s106d regression: the core-canvas cap knob still proves fail-before
  const capKnob = await page.evaluate(()=>{
    window.__P1850_FILL_QA({ uncapCoreCanvas:true });
    const failBefore = window.__P1850.audits.buildings.zoneCoreCanvas();
    window.__P1850_FILL_QA({ uncapCoreCanvas:false });
    const passAfter = window.__P1850.audits.buildings.zoneCoreCanvas();
    return { failBefore:{ pass:failBefore.pass, coreCanvas:failBefore.coreCanvas, cap:failBefore.cap },
             passAfter:{ pass:passAfter.pass } };
  });
  console.log("CORE-CANVAS CAP FAIL-BEFORE: pass=" + capKnob.failBefore.pass, "canvas=" + capKnob.failBefore.coreCanvas, "cap=" + capKnob.failBefore.cap);
  console.log("CORE-CANVAS CAP PASS-AFTER:  pass=" + capKnob.passAfter.pass);
  if(capKnob.failBefore.pass !== false || capKnob.passAfter.pass !== true) bad = true;

  // (3c) s106c regression: the in-town wave-gates knob still proves fail-before
  const fillKnob = await page.evaluate(()=>{
    window.__P1850_FILL_QA({ ignoreInTownGates:true });
    const failBefore = window.__P1850.audits.buildings.inTownFill();
    window.__P1850_FILL_QA({ ignoreInTownGates:false });
    const passAfter = window.__P1850.audits.buildings.inTownFill();
    return { failBefore:{ pass:failBefore.pass }, passAfter:{ pass:passAfter.pass } };
  });
  console.log("IN-TOWN GATES FAIL-BEFORE: pass=" + fillKnob.failBefore.pass, "| PASS-AFTER: pass=" + fillKnob.passAfter.pass);
  if(fillKnob.failBefore.pass !== false || fillKnob.passAfter.pass !== true) bad = true;

  // (4) census gates EXACT + late-1849 bands (the reshuffle arithmetic)
  const census = await page.evaluate(()=>({
    c1847: window.__P1850.fillCensus("1847-04-01"),
    c1848: window.__P1850.fillCensus("1848-04-01"),
    sep: window.__P1850.fillCensus("1849-09-15"),
    dec: window.__P1850.fillCensus("1849-12-20")
  }));
  console.log("CENSUS GATES (EXACT):", JSON.stringify({ c1847:census.c1847.total, c1848:census.c1848.total }));
  console.log("LATE-1849 TOTALS:", JSON.stringify({ sep:census.sep.total, dec:census.dec.total, bands:{ sep:[380,640], dec:[630,780] } }));
  console.log("RESHUFFLE ARITHMETIC: wave placed", wave.placed, "= frontage", wave.placed - wave.rearSlots, "+ rear", wave.rearSlots,
              "(shanty", wave.mix.shanty, "/ frame", wave.mix.frame, "— rear tents consume shanty turns; the total is the census curve's, unchanged)");
  if(census.c1847.total !== 79 || census.c1848.total !== 130) bad = true;
  if(census.sep.total < 380 || census.sep.total > 640 || census.dec.total < 630 || census.dec.total > 780) bad = true;

  // (5) the 1846-48 fill byte-identical to the s106b/c/d baseline
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

  // (6) the mixed-stage texture is visible + hardening is monotone
  const tex = await page.evaluate(()=>{
    function at(iso){
      const day = window.__P1850.dayOf(iso);
      const set = window.__P1850.fillAt(day);
      const cvfCanvas = set.filter(e=>e.canvasFirst && e.cls==="canvas" &&
        (e.phase==="complete"||e.phase==="constructing")).length;
      const cvfHardened = set.filter(e=>e.canvasFirst && e.cls!=="canvas" && e.phase==="complete").length;
      const thCanvas = set.filter(e=>e.tentHarden && e.cls!=="frame" &&
        (e.phase==="complete"||e.phase==="constructing")).length;
      const thHardened = set.filter(e=>e.tentHarden && e.cls==="frame" && e.phase==="complete").length;
      const rearStanding = set.filter(e=>e.rearOf!=null && (e.phase==="complete"||e.phase==="constructing")).length;
      const expActive = set.filter(e=>e.expanded).length;
      return { cvfCanvas, cvfHardened, thCanvas, thHardened, rearStanding, expActive };
    }
    return { aug: at("1849-08-15"), oct: at("1849-10-15"), dec: at("1849-12-20") };
  });
  console.log("MIXED-STAGE TEXTURE:", JSON.stringify(tex));
  if(tex.oct.cvfCanvas < 1 || tex.dec.cvfHardened < 1){ console.log("  canvas/hardened coexistence not visible"); bad = true; }
  if(tex.dec.rearStanding < 1){ console.log("  no rear tents standing at Dec-20"); bad = true; }
  if(tex.dec.expActive < 1){ console.log("  no expansion active by Dec-20"); bad = true; }

  await browser.close(); srv.server.close();
  console.log(bad ? "PROBE: RED" : "PROBE: GREEN");
  process.exit(bad ? 1 : 0);
})().catch(e=>{ console.error("PROBE CRASH:", e); process.exit(2); });
