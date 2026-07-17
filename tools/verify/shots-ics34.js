#!/usr/bin/env node
/* ICS-34 screenshots — PAPER-PANE CONTENT DENSITY pass.
   Captures the operator-facing before/after evidence that the newspaper pane
   shows MORE actual newspaper CONTENT at the same window size, without shrinking
   body type below the audited floor.
     1  paper BROADSHEET, fat-face masthead (DEFAULT) — the dense two-column run.
     2  paper FEED view — the modern list, denser stack.
     3  paper PLAIN-PRINT ON — the escape hatch still legible (period grammar off).
   Pass a label as argv[2] ("before" | "after"); writes into
   <APP_ROOT>/screenings/2026-07-17-ics34/<label>-*.png. Also prints a density
   probe: pane height, first-item top, last-content bottom, item count, and how
   many .fi-text lines are visible in the pane viewport. DEV-ONLY. */
"use strict";
const path = require("path"), http = require("http"), fs = require("fs");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "screenings", "2026-07-17-ics34");
const LABEL = (process.argv[2] || "after").replace(/[^a-z0-9-]/gi, "");
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
  const shootEl = async(sel,id,note)=>{ const dest=path.join(OUT,`${id}.png`); await sleep(200);
    let ok=false; try{ await page.locator(sel).screenshot({ path:dest }); ok=true; }catch(e){ console.log("shot error", e.message); }
    console.log(ok?"ok  ":"FAIL", `${id}.png -`, note); };

  await page.goto(`http://127.0.0.1:${srv.port}/index.html`, { waitUntil:"load", timeout:90000 });
  await page.waitForFunction(()=>{ const v=document.getElementById("hud-loading"); return v&&getComputedStyle(v).display==="none"&&window.__P1850; },{timeout:90000});
  await sleep(600);

  // ---- BROADSHEET (fat-face default) at a dense issue ----
  await page.evaluate(iso=>window.__P1850.jump(iso), "1849-09-15"); await settle(30);
  await page.evaluate(()=>{ window.__P1850.paperMasthead("fatface"); window.__P1850.paperPlainPrint(false); window.__P1850.paperOpen(true); });
  await sleep(500);
  await shootEl("#paper-pane", `${LABEL}-1-broadsheet-fatface`, "broadsheet fat-face — content density");

  // density probe (broadsheet)
  const probe = await page.evaluate(()=>{
    const pane = document.getElementById("paper-pane");
    const body = document.getElementById("pp-body");
    const paneRect = pane.getBoundingClientRect();
    const bodyRect = body.getBoundingClientRect();
    const items = body.querySelectorAll(".bs-item, .feed-item");
    // count .fi-text lines visible within the body viewport
    let visibleLines = 0;
    body.querySelectorAll(".fi-text").forEach(p=>{
      const cs = getComputedStyle(p);
      const lh = parseFloat(cs.lineHeight) || (parseFloat(cs.fontSize)*1.2);
      const r = p.getBoundingClientRect();
      const top = Math.max(r.top, bodyRect.top);
      const bot = Math.min(r.bottom, bodyRect.bottom);
      if(bot>top) visibleLines += Math.round((bot-top)/lh);
    });
    const fiText = body.querySelector(".fi-text");
    const bodyPx = fiText ? parseFloat(getComputedStyle(fiText).fontSize) : null;
    // how much of the last item is within the viewport (content that fits)
    let itemsFullyVisible = 0;
    items.forEach(it=>{ const r=it.getBoundingClientRect(); if(r.bottom<=bodyRect.bottom+1 && r.top>=bodyRect.top-1) itemsFullyVisible++; });
    return {
      paneW: Math.round(paneRect.width), paneH: Math.round(paneRect.height),
      bodyH: Math.round(bodyRect.height), bodyScrollH: Math.round(body.scrollHeight),
      itemCount: items.length, itemsFullyVisible, visibleFiTextLines: visibleLines,
      bodyPx: bodyPx ? +bodyPx.toFixed(2) : null,
      columnCount: getComputedStyle(body.querySelector(".bs-columns")||body).columnCount
    };
  });
  console.log(`DENSITY[${LABEL}] broadsheet`, JSON.stringify(probe));

  // ---- FEED view ----
  await page.evaluate(()=>{ document.getElementById("pp-tab-feed").click(); });
  await sleep(400);
  await shootEl("#paper-pane", `${LABEL}-2-feed`, "feed list — content density");

  // ---- PLAIN-PRINT ON ----
  await page.evaluate(()=>{ document.getElementById("pp-tab-broadsheet").click(); window.__P1850.paperPlainPrint(true); });
  await sleep(400);
  await shootEl("#paper-pane", `${LABEL}-3-plainprint-on`, "plain-print ON — legible, period grammar off");

  await browser.close(); srv.server.close();
})();
