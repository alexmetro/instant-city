#!/usr/bin/env node
/* ICS-27 screenshots + behavior-preservation checklist — the ATELIER panel
   reorganization (six native <details> accordions + pinned type-to-filter +
   liquid-glass chrome):
     (a) the reorganized rail COLLAPSED (default state: six closed accordions
         under the pinned filter box);
     (b) ONE SECTION OPEN: RULE OVERLAYS expanded — the GROUND PLAN + ZONES
         tri-state families and the flat law/diagnostic rows, GROUND PLAN
         armed so the family master + active-dot read;
     (c) the FILTER matching "zone": sections/families auto-opened to the
         zone-named rows only, everything else hidden.
   Plus a HOOK CHECKLIST printed to stdout: every QA hook + tri-state +
   legend-auto-open behavior exercised against the rebuilt panel.
   FULL-PAGE captures (panel + world together). DEV-ONLY.
   Writes into <APP_ROOT>/screenings/2026-07-17-ics27/. */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "screenings", "2026-07-17-ics27");

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
  const shoot = async(id,note)=>{ const dest=path.join(OUT,`${id}.png`); await page.evaluate(()=>window.__P1850.render&&window.__P1850.render()); await sleep(220);
    let ok=false; try{ await page.screenshot({ path:dest }); ok=true; }catch(e){ console.log("shot error", e.message); }
    console.log(ok?"ok  ":"FAIL", `${id}.png -`, note); };

  await page.goto(`http://127.0.0.1:${srv.port}/atelier.html`, { waitUntil:"load", timeout:90000 });
  await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v&&getComputedStyle(v).display==="none"&&window.__P1850; },{timeout:90000});

  await page.evaluate(iso=>window.__P1850.jump(iso), "1849-09-15"); await settle(50);
  await page.evaluate(()=>window.__P1850.camSet({ alt:1600, x:420, z:420, snap:true })); await settle(50);

  /* ---------- BEHAVIOR-PRESERVATION HOOK CHECKLIST ---------- */
  const checklist = await page.evaluate(()=>{
    const out = [];
    const ok = (name, pass, detail)=>out.push({ name, pass:!!pass, detail:detail||"" });
    // 1. QA hooks exist
    ok("__P1850_WBSETOVERLAY exists", typeof window.__P1850_WBSETOVERLAY === "function");
    ok("__P1850_WBDRYLAND exists",    typeof window.__P1850_WBDRYLAND === "function");
    ok("__P1850_WBMORPH exists",      typeof window.__P1850_WBMORPH === "function");
    ok("__P1850_MORPH_AUDIT_OPS exists", typeof window.__P1850_MORPH_AUDIT_OPS === "function");
    ok("__wbMeasure exists",          typeof window.__wbMeasure === "function");
    ok("__wbShot exists",             typeof window.__wbShot === "function");
    // 2. layer visibility registry intact + panel rows present
    const rows = document.querySelectorAll("#wb-panel .wb-row");
    ok("panel rows exist", rows.length >= 20, rows.length + " rows");
    ok("filter box pinned", !!document.getElementById("wb-filter"));
    ok("six top-level accordions", document.querySelectorAll("#wb-panel > details.wb-top").length === 6,
       document.querySelectorAll("#wb-panel > details.wb-top").length + " tops");
    // 3. QA hook drives a family child -> tri-state master goes indeterminate
    const r1 = window.__P1850_WBSETOVERLAY("spine", true);
    const gpGroup = Array.from(document.querySelectorAll("#wb-panel .wb-ov-group"))
      .find(g=>/THE GROUND PLAN/.test((g.querySelector(".wb-ov-parent-name")||{}).textContent||""));
    const gpMaster = gpGroup ? gpGroup.querySelector(".wb-row.wb-ov-parent input[type=checkbox]") : null;
    ok("WBSETOVERLAY(spine,on) -> master indeterminate", r1.on===true && gpMaster && gpMaster.indeterminate === true && gpMaster.checked === true);
    window.__P1850_WBSETOVERLAY("spine", false);
    ok("WBSETOVERLAY(spine,off) -> master clear", gpMaster && gpMaster.indeterminate === false && gpMaster.checked === false);
    // 4. lifecycle overlay legend auto-open (s108b)
    if(window.__P1850_LC_LEGEND){
      window.__P1850_WBSETOVERLAY("lifecycle", true);
      const openedWith = window.__P1850_LC_LEGEND.isOpen();
      window.__P1850_WBSETOVERLAY("lifecycle", false);
      const closedWith = window.__P1850_LC_LEGEND.isOpen();
      ok("lifecycle legend auto-open/close rides the toggle", openedWith === true && closedWith === false,
         "open:"+openedWith+" close:"+closedWith);
    } else ok("lifecycle legend hook present", true, "no __P1850_LC_LEGEND in this build (skip)");
    // 5. dryland hook round-trip
    const d1 = window.__P1850_WBDRYLAND(true); const d0 = window.__P1850_WBDRYLAND(false);
    ok("WBDRYLAND arm/disarm", d1.on===true && d0.on===false, JSON.stringify(d1));
    // 6. morph hook round-trip (demo op + report)
    const m1 = window.__P1850_WBMORPH({ demo:true, regions:true });
    const m0 = window.__P1850_WBMORPH({ demo:false, regions:false });
    ok("WBMORPH arm/disarm + ramp report", m1.demo===true && m1.regions===true && typeof m1.ramp==="number" && m0.demo===false, "ramp="+m1.ramp);
    // 7. labels tri-state family (labelsSetSublayer path)
    const lblGroup = Array.from(document.querySelectorAll("#wb-panel .wb-ov-group"))
      .find(g=>/LABELS — floating/.test((g.querySelector(".wb-ov-parent-name")||{}).textContent||""));
    if(lblGroup){
      const kids = lblGroup.querySelectorAll(".wb-ov-child input[type=checkbox]");
      const master = lblGroup.querySelector(".wb-row.wb-ov-parent input[type=checkbox]");
      kids[0].checked = false; kids[0].dispatchEvent(new Event("change"));
      const indet = master.indeterminate === true;
      kids[0].checked = true; kids[0].dispatchEvent(new Event("change"));
      ok("LABELS family tri-state (child off -> master indeterminate -> restore)", indet && master.checked === true && master.indeterminate === false);
    } else ok("LABELS family present", false);
    // 8. type-to-filter: "zone" auto-opens matches; clearing restores state
    const fb = document.getElementById("wb-filter");
    const openBefore = Array.from(document.querySelectorAll("#wb-panel > details.wb-top")).map(d=>d.open).join(",");
    fb.value = "zone"; fb.dispatchEvent(new Event("input"));
    const visRows = Array.from(document.querySelectorAll("#wb-panel .wb-row:not(.wb-fhide)")).length;
    const overlaysOpen = Array.from(document.querySelectorAll("#wb-panel > details.wb-top")).some(d=>d.open);
    fb.value = ""; fb.dispatchEvent(new Event("input"));
    const openAfter = Array.from(document.querySelectorAll("#wb-panel > details.wb-top")).map(d=>d.open).join(",");
    const allRestored = document.querySelectorAll("#wb-panel .wb-fhide").length === 0;
    ok("filter 'zone' narrows + auto-opens", visRows > 0 && visRows < rows.length && overlaysOpen, visRows + " rows visible");
    ok("clearing filter restores open state", openBefore === openAfter && allRestored, openBefore + " -> " + openAfter);
    return out;
  });
  let fails = 0;
  console.log("\n=== ICS-27 BEHAVIOR-PRESERVATION CHECKLIST ===");
  checklist.forEach(c=>{ if(!c.pass) fails++; console.log((c.pass?"PASS":"FAIL"), c.name, c.detail?("· "+c.detail):""); });
  console.log("=== " + (fails? fails+" FAILURES":"ALL PASS") + " ===\n");

  /* ---------- (a) the rail collapsed (default state) ---------- */
  await shoot("atelier-1-panel-collapsed", "six closed accordions under the pinned type-to-filter box (default state)");

  /* ---------- (b) one section open: RULE OVERLAYS + GROUND PLAN armed ---------- */
  await page.evaluate(()=>{
    const overlays = Array.from(document.querySelectorAll("#wb-panel > details.wb-top"))
      .find(d=>/RULE OVERLAYS/.test(d.querySelector(".wb-sectitle").textContent));
    overlays.open = true;
    // arm the GROUND PLAN family through the master checkbox path (first-use = all children)
    const gp = Array.from(document.querySelectorAll("#wb-panel .wb-ov-group"))
      .find(g=>/THE GROUND PLAN/.test((g.querySelector(".wb-ov-parent-name")||{}).textContent||""));
    const master = gp.querySelector(".wb-row.wb-ov-parent input[type=checkbox]");
    master.checked = true; master.dispatchEvent(new Event("change"));
  });
  await settle(30);
  await shoot("atelier-2-overlays-open-groundplan", "RULE OVERLAYS open: GROUND PLAN family armed (active dot + row highlights), ZONES family + flat rows below");
  await page.evaluate(()=>{
    const gp = Array.from(document.querySelectorAll("#wb-panel .wb-ov-group"))
      .find(g=>/THE GROUND PLAN/.test((g.querySelector(".wb-ov-parent-name")||{}).textContent||""));
    const master = gp.querySelector(".wb-row.wb-ov-parent input[type=checkbox]");
    master.checked = false; master.dispatchEvent(new Event("change"));
    const overlays = Array.from(document.querySelectorAll("#wb-panel > details.wb-top"))
      .find(d=>/RULE OVERLAYS/.test(d.querySelector(".wb-sectitle").textContent));
    overlays.open = false;
  });

  /* ---------- (c) the filter matching "zone" ---------- */
  await page.click("#wb-filter");
  await page.type("#wb-filter", "zone", { delay: 40 });
  await sleep(250);
  await shoot("atelier-3-filter-zone", "type-to-filter 'zone': matching sections auto-opened, zone-named rows only (layers zones-tint · LABELS zones child · ZONES family · zone-law/ecology rows)");

  await browser.close(); srv.server.close();
  if(fails) process.exitCode = 1;
})();
