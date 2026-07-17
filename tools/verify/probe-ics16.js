#!/usr/bin/env node
/* ICS-16 probe — subtitle CONTENT ENRICHMENT (dev-only, not part of the gate).
   Loads index.html, settles the plaza closeup (150 m — inside the ≤200 m
   reveal band), and prints the labels.poiSubtitle audit verdict + every
   live subtitle string at 1849-09-15 (owner enrichment) and 1849-12-26
   (post-fire burned segments must be present). Exit 1 if the audit is red,
   the reveal is off, no enrichment shows, or 12-26 has no burned segment. */
"use strict";
const path=require("path"), http=require("http"), fs=require("fs");
const { chromium }=require("playwright");
const ROOT=path.resolve(__dirname,"..","..");
function startServer(root){
  const MIME={".html":"text/html",".js":"text/javascript",".json":"application/json",".png":"image/png"};
  const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split("?")[0]); if(p==="/")p="/index.html"; const fp=path.join(root,p); if(!fp.startsWith(root)){res.writeHead(403);return res.end();} fs.readFile(fp,(e,b)=>{ if(e){res.writeHead(404);return res.end();} res.writeHead(200,{"Content-Type":MIME[path.extname(fp).toLowerCase()]||"application/octet-stream"}); res.end(b);});});
  return new Promise(r=>server.listen(0,"127.0.0.1",()=>r({server,port:server.address().port})));
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const srv=await startServer(ROOT);
  const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--ignore-gpu-blocklist","--enable-webgl","--enable-unsafe-swiftshader","--disable-dev-shm-usage"]});
  const page=await (await browser.newContext({viewport:{width:1600,height:1000}})).newPage();
  page.on("pageerror",e=>console.log("PAGEERROR",e.message));
  const settle=async(n=60)=>{ await page.evaluate(k=>{for(let i=0;i<k;i++)window.__P1850.tick&&window.__P1850.tick(0.1);},n); await sleep(140); };
  await page.goto(`http://127.0.0.1:${srv.port}/index.html`,{waitUntil:"load",timeout:120000});
  await page.waitForFunction(()=>{const v=document.getElementById("hud-loading");return v&&getComputedStyle(v).display==="none"&&window.__P1850&&window.__P1850.labelsSubtitles;},{timeout:120000});
  let red=false, burnedSeen=false, enrichedSeen=false;
  for(const date of ["1849-09-15","1849-12-26"]){
    await page.evaluate(iso=>window.__P1850.jump(iso),date); await settle(60);
    await page.evaluate(()=>{ const p=window.__P1850.plazaCenter; window.__P1850.camSet({alt:150,x:p.x,z:p.z,snap:true}); }); await settle(80);
    // updateLabels rides renderer.render — drive real frames so the rebuild,
    // the settle pass (band + subtitle reveal) and the declutter all land.
    await page.evaluate(()=>{ for(let i=0;i<3;i++) window.__P1850.render(); }); await sleep(150);
    const out=await page.evaluate(()=>{
      const a=window.__P1850.audits.labels.poiSubtitle();
      return { audit:{ pass:a.pass, expectOn:a.expectOn, namesChecked:a.namesChecked,
                       withSubtitle:a.withSubtitle, enriched:a.enriched, settleAlt:a.settleAlt, bad:a.bad },
               subs: window.__P1850.labelsSubtitles() };
    });
    console.log("== "+date+" ==");
    console.log("poiSubtitle:", JSON.stringify(out.audit));
    out.subs.filter(s=>s.enriched||/burned/.test(s.sub)).forEach(s=>console.log("   ", s.name, "->", JSON.stringify(s.sub), s.placed?"[placed]":"[suppressed]"));
    out.subs.forEach(s=>{ if(/burned /.test(s.sub) && date==="1849-12-26") burnedSeen=true; if(s.enriched) enrichedSeen=true; });
    if(!out.audit.pass || !out.audit.expectOn) red=true;
  }
  await browser.close(); srv.server.close();
  if(red || !enrichedSeen || !burnedSeen){ console.log("PROBE RED", {red, enrichedSeen, burnedSeen}); process.exit(1); }
  console.log("PROBE GREEN");
})().catch(e=>{console.error("PROBE CRASH:",e);process.exit(2);});
