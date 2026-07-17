#!/usr/bin/env node
/* D3b screenshots — DIEGETIC / PERIOD-UI pass (research/design-diegetic-period-ui.md).
   Captures the operator-facing evidence for ER1–ER5:
     1  paper BROADSHEET, fat-face masthead (DEFAULT/committed) — decks, dateline,
        agate markets board, dinkus breaks, closing ornament;
     1b paper BROADSHEET at a Yerba-Buena-era date (era-correct dateline city +
        The Californian masthead);
     2  paper BROADSHEET, BLACKLETTER masthead OPTION (behind the flag) — the
        second treatment for the operator to choose between;
     3  paper PLAIN-PRINT toggle ON (ER5 escape hatch — period grammar stripped);
     4  paper FEED view (the modern list in period dress, single column);
     5  map ITALIC WATER voice — the Bay name leaning (Coast Survey canon, ER2);
     6  map ITALIC WATER voice — Yerba Buena Cove leaning (close band);
     7  HUD beat-card PERIOD DOUBLE-RULE furniture (ER3);
     8  timeline SURVEY-CHART SCALE-BAR ticks (ER4).
   Writes into <APP_ROOT>/screenings/2026-07-17-d3b/. DEV-ONLY (never shipped). */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "screenings", "2026-07-17-d3b");
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
  const settle = async(n=45)=>{ await page.evaluate(k=>{ for(let i=0;i<k;i++) window.__P1850.tick&&window.__P1850.tick(0.1); }, n); await sleep(160); };
  const renderN = async(n=10)=>{ for(let i=0;i<n;i++){ await page.evaluate(()=>window.__P1850.render&&window.__P1850.render()); } };
  const shootEl = async(sel,id,note)=>{ const dest=path.join(OUT,`${id}.png`); await sleep(200);
    let ok=false; try{ await page.locator(sel).screenshot({ path:dest }); ok=true; }catch(e){ console.log("shot error", e.message); }
    console.log(ok?"ok  ":"FAIL", `${id}.png -`, note); };
  const shootPage = async(id,note)=>{ const dest=path.join(OUT,`${id}.png`); await sleep(200); await renderN(8); await sleep(120);
    let ok=false; try{ await page.screenshot({ path:dest }); ok=true; }catch(e){ console.log("shot error", e.message); }
    console.log(ok?"ok  ":"FAIL", `${id}.png -`, note); };

  await page.goto(`http://127.0.0.1:${srv.port}/index.html`, { waitUntil:"load", timeout:90000 });
  await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v&&getComputedStyle(v).display==="none"&&window.__P1850; },{timeout:90000});
  await sleep(600);   // let embedded fonts (Fraunces/Playfair/blackletter/italic) resolve

  // ---------- ER1 — the deepened paper pane ----------
  await page.evaluate(iso=>window.__P1850.jump(iso), "1849-09-15"); await settle(30);
  await page.evaluate(()=>{ window.__P1850.paperMasthead("fatface"); window.__P1850.paperPlainPrint(false); window.__P1850.paperOpen(true); });
  await sleep(500);
  await shootEl("#paper-pane", "d3b-1-paper-broadsheet-fatface", "ER1 broadsheet — FAT-FACE masthead (DEFAULT): decks (kicker+head), Vol./No. dateline (San Francisco), agate PRICES CURRENT board, dinkus item breaks + closing ornament");

  // 1b — Yerba-Buena-era dateline (pre-1847 renaming) + The Californian masthead
  await page.evaluate(iso=>window.__P1850.jump(iso), "1846-09-05"); await settle(30);
  await page.evaluate(()=>{ window.__P1850.paperOpen(true); }); await sleep(400);
  await shootEl("#paper-pane", "d3b-1b-paper-yerbabuena-era", "ER1 dateline is era-correct: 'Yerba Buena, Alta California' before the Jan-1847 renaming; masthead THE CALIFORNIAN");

  // ---------- masthead OPTION B — blackletter (behind the flag) ----------
  await page.evaluate(iso=>window.__P1850.jump(iso), "1849-09-15"); await settle(30);
  await page.evaluate(()=>{ window.__P1850.paperMasthead("blackletter"); window.__P1850.paperOpen(true); });
  await sleep(500);
  await shootEl("#paper-pane", "d3b-2-paper-broadsheet-blackletter", "MASTHEAD OPTION B — BLACKLETTER (UnifrakturMaguntia, behind the flag; operator's choice). Same body/structure as the default.");

  // ---------- ER5 — plain-print escape hatch ON ----------
  await page.evaluate(()=>{ window.__P1850.paperMasthead("fatface"); window.__P1850.paperPlainPrint(true); });
  await sleep(400);
  await shootEl("#paper-pane", "d3b-3-paper-plainprint-on", "ER5 PLAIN-PRINT ON — period grammar stripped (plain HUD sans, no decks/dinkus/drop-cap/columns); body size unchanged (audited floor)");

  // ---------- FEED view (modern list in period dress) ----------
  await page.evaluate(()=>{ window.__P1850.paperPlainPrint(false); document.getElementById("pp-tab-feed").click(); });
  await sleep(400);
  await shootEl("#paper-pane", "d3b-4-paper-feed", "FEED tab — the modern single-column list stays legible (period dress, no two-column broadsheet grammar)");
  await page.evaluate(()=>{ document.getElementById("pp-tab-broadsheet").click(); window.__P1850.paperOpen(false); });

  // ---------- ER2 — italic water voice on the map ----------
  // 1848 (the cove is full open water): the leaning 'Yerba Buena Cove' water
  // label beside the UPRIGHT streets — the Coast Survey vertical-vs-leaning
  // contrast in one frame. Heavy settle so the water band opacity reaches full.
  await page.evaluate(iso=>window.__P1850.jump(iso), "1848-04-01"); await settle(60);
  await page.evaluate(()=>window.__P1850.camSet({ alt:520, x:430, z:150, snap:true })); await settle(60); await renderN(60);
  await shootEl("#c", "d3b-5-water-italic-cove-vs-streets", "ER2 — the WATER voice LEANS: 'Yerba Buena Cove' in embedded Roboto-Italic (Coast Survey vertical-vs-leaning canon) beside UPRIGHT street names; contrast gate ≥3.0 held");
  await page.evaluate(()=>window.__P1850.camSet({ alt:330, x:820, z:150, snap:true })); await settle(60); await renderN(60);
  await shootEl("#c", "d3b-6-water-italic-cove-close", "ER2 — 'Yerba Buena Cove' leaning, closer band (the italic water voice, same blue-tint ink as the upright voice → contrast unchanged)");

  // ---------- ER3 — beat-card period double-rule furniture ----------
  // collapse the scrubber so the card (bottom-centre) is unoccluded, then
  // crop the card itself for the furniture detail.
  await page.evaluate(()=>{ var t=document.getElementById("scr-tab"); if(t && !document.getElementById("hud-scrubber").classList.contains("collapsed")) t.click(); });
  await page.evaluate(()=>{
    var bc=document.getElementById("beat-card");
    document.getElementById("bc-class").textContent="THE GOLD RUSH";
    document.getElementById("bc-quote").textContent="“Gold! Gold from the American River!”";
    document.getElementById("bc-date").textContent="May 12, 1848";
    bc.classList.add("on");
  });
  await page.evaluate(()=>window.__P1850.camSet({ alt:520, x:120, z:60, snap:true })); await settle(40); await renderN(12);
  await shootPage("d3b-7-hud-beatcard-doublerule", "ER3 — the beat card's rules take a PERIOD DOUBLE RULE (thick-thin), small-caps standing head; fonts untouched (Roboto). Scrubber collapsed so the card is unoccluded.");
  await shootEl("#beat-card", "d3b-7b-beatcard-crop", "ER3 detail (crop) — thick-thin double rule top & bottom, small-caps standing head");

  // ---------- ER4 — timeline survey-chart scale-bar ticks ----------
  await page.evaluate(()=>{ document.getElementById("beat-card").classList.remove("on"); var t=document.getElementById("scr-tab"); if(document.getElementById("hud-scrubber").classList.contains("collapsed")) t.click(); });
  await sleep(300); await renderN(6);
  await shootEl("#hud-scrubber", "d3b-8-scrubber-scalebar", "ER4 — the timeline reads as a survey-chart scale bar: graduated month ticks hanging from the ruled baseline, year graduations stepped taller");

  await browser.close(); srv.server.close();
})();
