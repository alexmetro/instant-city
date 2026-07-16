#!/usr/bin/env node
/* s110a SCOPE MAP extractor — loads atelier.html, jumps to each canonical date,
   runs the three report-only edge-grounding audits, prints their real detail.
   DEV-ONLY, not shipped. */
"use strict";
const path = require("path");
const http = require("http");
const fs = require("fs");
const { chromium } = require("playwright");
const APP_ROOT = path.resolve(__dirname, "..", "..");
const DATES = ["1846-07-01", "1848-04-01", "1849-09-15", "1849-12-20"];

function startServer(root){
  const MIME={".html":"text/html",".js":"text/javascript",".json":"application/json",".css":"text/css",".png":"image/png",".ico":"image/x-icon",".webmanifest":"application/manifest+json"};
  const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split("?")[0]); if(p==="/")p="/index.html"; const fp=path.join(root,p); if(!fp.startsWith(root)){res.writeHead(403);return res.end();} fs.readFile(fp,(e,b)=>{ if(e){res.writeHead(404);return res.end();} res.writeHead(200,{"Content-Type":MIME[path.extname(fp).toLowerCase()]||"application/octet-stream"}); res.end(b);});});
  return new Promise(r=>server.listen(0,"127.0.0.1",()=>r({server,port:server.address().port})));
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

(async ()=>{
  const srv=await startServer(APP_ROOT);
  const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--ignore-gpu-blocklist","--enable-webgl","--enable-unsafe-swiftshader","--disable-dev-shm-usage"]});
  const ctx=await browser.newContext({viewport:{width:1600,height:1000}});
  const page=await ctx.newPage();
  page.on("pageerror",e=>console.log("PAGEERROR",e.message));
  await page.goto(`http://127.0.0.1:${srv.port}/atelier.html`,{waitUntil:"load",timeout:60000});
  await page.waitForFunction(()=>{const v=document.getElementById("hud-loading");return v&&getComputedStyle(v).display==="none"&&window.__P1850;},{timeout:45000});
  const settle=async(n=40)=>{await page.evaluate(k=>{for(let i=0;i<k;i++)window.__P1850.tick&&window.__P1850.tick(0.1);},n);await sleep(120);};
  for(const d of DATES){
    await page.evaluate(iso=>window.__P1850.jump(iso),d);
    await settle(20);
    const r=await page.evaluate(()=>{
      const A=window.__P1850.audits;
      return { rg:A.spine.roadGrounded(), gr:A.spine.roadGrade(), wf:A.spine.wharfFootDryInland() };
    });
    console.log("\n===== "+d+" =====");
    console.log("roadGrounded:", JSON.stringify({floatingRoads:r.rg.floatingRoads, roadsChecked:r.rg.roadsChecked, floatingSamples:r.rg.floatingSamples, ids:r.rg.floatingRoadIds}, null, 0));
    r.rg.detail.forEach(x=>console.log("   FLOAT", x.name||x.id, "samples="+x.floatingSamples, "rawEnd="+JSON.stringify(x.rawEnd), "trimAt="+JSON.stringify(x.trimAt)));
    console.log("roadGrade:", JSON.stringify({failSegments:r.gr.failSegments, suspectSegments:r.gr.suspectSegments, worstGradePct:r.gr.worstGradePct, roadsChecked:r.gr.roadsChecked}, null, 0));
    r.gr.detail.forEach(x=>console.log("   GRADE", x.name||x.id, "fail="+x.fail, "suspect="+x.suspect, "worst%="+x.worstGradePct));
    console.log("wharfFootDryInland:", JSON.stringify({misAnchored:r.wf.misAnchored, wharvesChecked:r.wf.wharvesChecked, ids:r.wf.misAnchoredIds}, null, 0));
    r.wf.detail.forEach(x=>console.log("   FOOT", x.name||x.id, "dry="+x.footDry, "setbackM="+x.setbackM, "ok="+x.ok, "foot="+JSON.stringify(x.foot)));
  }
  await browser.close(); srv.server.close();
})();
