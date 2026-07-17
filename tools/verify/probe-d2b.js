#!/usr/bin/env node
/* D2b ICS-30 probe — radio map modes + legend-as-control + world dimming +
   the extended (dimmed-host) contrast audit. Dev-only. */
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
  page.on("console", m=>{ if(m.type()==="error") console.log("CONSOLE.ERROR", m.text()); });
  const settle = async(n=40)=>{ await page.evaluate(k=>{ for(let i=0;i<k;i++) window.__P1850.tick&&window.__P1850.tick(0.1); }, n); await sleep(160); };
  await page.goto(`http://127.0.0.1:${srv.port}/atelier.html`, { waitUntil:"load", timeout:90000 });
  await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v&&getComputedStyle(v).display==="none"&&window.__P1850; },{timeout:90000});
  await page.evaluate(iso=>window.__P1850.jump(iso), "1849-12-20"); await settle(40);

  // (1) CONTRAST AUDIT — dimmed-host extension
  const con = await page.evaluate(()=>{ const e = window.__P1850.audits.runAll().results.find(a=>a.layer==="labels"&&a.audit==="contrast"); const r = e.detail; return { pass:r.pass, gate:r.gate, worst:r.worstCase, dimWorst:r.dimmedWorstCase, dim:r.modeDim, nBg:r.styles[0].perBg.length, sampleDim:r.styles.find(s=>s.style==="street").perBg.filter(p=>p.dimmed).map(p=>({bg:p.bg,score:p.score})) }; });
  console.log("\n=== CONTRAST AUDIT (dimmed-host extension) ===");
  console.log("pass:", con.pass, "| gate:", con.gate, "| bg entries/voice:", con.nBg, "(was 15 → now doubled)");
  console.log("modeDim:", JSON.stringify(con.dim));
  console.log("overall worst (all hosts):", JSON.stringify(con.worst));
  console.log("worst DIMMED host:", JSON.stringify(con.dimWorst));
  console.log("street voice on dimmed hosts:", JSON.stringify(con.sampleDim));

  // (2) MODE MACHINERY
  const modes = await page.evaluate(async ()=>{
    const out = {};
    const snap = ()=>({ mode:window.__P1850_WBMODE().mode, name:window.__P1850_WBMODE().name,
      overlaysOn: ["spine","row","lots","parcels","reservations","zonelaw","encamp","zones","lifecycle","dryland","wharf","audits","keepout"].filter(k=>{
        // read WB.overlays via the checkbox reflection
        return false; }) });
    out.initial = window.__P1850_WBMODE();
    // arm mode 1 (zones)
    out.m1 = window.__P1850_WBMODE(1);
    // switch to mode 2 (ground plan) — mode 1 overlays must disarm
    out.m2 = window.__P1850_WBMODE(2);
    out.zonesOffAfterM2 = window.__P1850_WBSETOVERLAY ? undefined : undefined;
    // add a pin (audits) then switch mode — pin must persist
    window.__P1850_WBSETOVERLAY("audits", true);
    out.m3 = window.__P1850_WBMODE(3);
    out.pinsAfterM3 = window.__P1850_WBMODE().pins;
    // re-press mode 3 clears
    out.clear = window.__P1850_WBMODE(3);
    out.pinsAfterClear = window.__P1850_WBMODE().pins;
    window.__P1850_WBSETOVERLAY("audits", false);
    // legend panel visibility + button state
    window.__P1850_WBMODE(2);
    await new Promise(r=>setTimeout(r,60));
    out.legendShown = document.getElementById("wb-mlegend").classList.contains("show");
    out.legendRows = document.querySelectorAll("#wb-mlegend .wb-ml-row").length;
    out.bar2on = document.querySelectorAll("#wb-panel .wb-modebtn")[1].classList.contains("on");
    out.topAccordions = document.querySelectorAll("#wb-panel > details.wb-top").length;
    window.__P1850_WBMODE(0);
    out.legendHiddenAfterClear = !document.getElementById("wb-mlegend").classList.contains("show");
    return out;
  });
  console.log("\n=== MODE MACHINERY ===");
  console.log("initial:", JSON.stringify(modes.initial));
  console.log("mode1 armed:", JSON.stringify(modes.m1));
  console.log("mode2 armed (mode1 disarmed):", JSON.stringify(modes.m2));
  console.log("mode3 + audit pin:", JSON.stringify(modes.m3), "| pins after M3:", JSON.stringify(modes.pinsAfterM3));
  console.log("clear (re-press 3):", JSON.stringify(modes.clear), "| pins after clear:", JSON.stringify(modes.pinsAfterClear));
  console.log("legend shown:", modes.legendShown, "| rows:", modes.legendRows, "| bar#2 on:", modes.bar2on, "| top accordions:", modes.topAccordions);
  console.log("legend hidden after clear:", modes.legendHiddenAfterClear);

  // (3) WORLD DIM — value drives toward 1 with a mode, back to 0 on clear
  const dim = await page.evaluate(async ()=>{
    window.__P1850_WBMODE(1);
    await new Promise(r=>setTimeout(r,320));
    for(let i=0;i<10;i++) window.__P1850.render && window.__P1850.render();
    const on = window.__P1850_WBMODE().dim;
    window.__P1850_WBMODE(0);
    await new Promise(r=>setTimeout(r,320));
    for(let i=0;i<10;i++) window.__P1850.render && window.__P1850.render();
    const off = window.__P1850_WBMODE().dim;
    return { on, off };
  });
  console.log("\n=== WORLD DIM ===");
  console.log("dim value with mode active:", dim.on, "| after clear (must be exactly 0):", dim.off);

  await browser.close(); srv.server.close();
})();
