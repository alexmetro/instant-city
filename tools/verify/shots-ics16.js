#!/usr/bin/env node
/* ICS-16 screenshots — subtitle CONTENT ENRICHMENT (release index.html):
     (1) plaza closeup @ 1849-09-15 — the enriched OWNER subtitles among the
         bare-kind lines ("Store — Howard & Mellus", "Store — Dring", ...);
     (2) the SAME plaza framing @ 1849-12-26 — the POST-FIRE date-aware
         subtitles ("Hotel — burned Dec 1849" on the Parker House, "Saloon —
         burned Dec 1849" on El Dorado / Dennison's / Bella Union): the
         burned landmarks KEEP their names as annotated ground;
     (3) Clay/Montgomery store corridor @ 1849-09-15 — the owner-segment
         cluster read close up.
   FULL-PAGE captures. DEV-ONLY. Writes <APP_ROOT>/screenings/2026-07-17-ics16/. */
"use strict";
const path=require("path"), http=require("http"), fs=require("fs");
const { chromium }=require("playwright");
const ROOT=path.resolve(__dirname,"..","..");
const OUT=path.join(ROOT,"screenings","2026-07-17-ics16");
function startServer(root){
  const MIME={".html":"text/html",".js":"text/javascript",".json":"application/json",".png":"image/png"};
  const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split("?")[0]); if(p==="/")p="/index.html"; const fp=path.join(root,p); if(!fp.startsWith(root)){res.writeHead(403);return res.end();} fs.readFile(fp,(e,b)=>{ if(e){res.writeHead(404);return res.end();} res.writeHead(200,{"Content-Type":MIME[path.extname(fp).toLowerCase()]||"application/octet-stream"}); res.end(b);});});
  return new Promise(r=>server.listen(0,"127.0.0.1",()=>r({server,port:server.address().port})));
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const srv=await startServer(ROOT);
  const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--ignore-gpu-blocklist","--enable-webgl","--enable-unsafe-swiftshader","--disable-dev-shm-usage"]});
  const page=await (await browser.newContext({viewport:{width:1600,height:1000}})).newPage();
  page.on("pageerror",e=>console.log("PAGEERROR",e.message));
  const settle=async(n=60)=>{ await page.evaluate(k=>{for(let i=0;i<k;i++)window.__P1850.tick&&window.__P1850.tick(0.1);},n); await sleep(140); };
  await page.goto(`http://127.0.0.1:${srv.port}/index.html`,{waitUntil:"load",timeout:120000});
  await page.waitForFunction(()=>{const v=document.getElementById("hud-loading");return v&&getComputedStyle(v).display==="none"&&window.__P1850&&window.__P1850.labelsSubtitles;},{timeout:120000});
  const A=await page.evaluate(()=>{ const p=window.__P1850.plazaCenter; return { plaza:{x:p.x,z:p.z} }; });
  // Howard & Mellus / Davis / Dring cluster: Clay & Montgomery, one block east
  // of the plaza — offset the plaza framing eastward along the grid.
  const SHOTS=[
    { id:"1-plaza-owner-subtitles-1849-09-15", date:"1849-09-15", alt:150, x:A.plaza.x+70, z:A.plaza.z+20,
      note:"plaza closeup Sept 1849 — enriched owner subtitles among the bare kinds" },
    { id:"2-plaza-postfire-subtitles-1849-12-26", date:"1849-12-26", alt:150, x:A.plaza.x+70, z:A.plaza.z+20,
      note:"SAME framing Dec 26 1849 — burned landmarks keep their names: 'Hotel — burned Dec 1849' / 'Saloon — burned Dec 1849'" },
    { id:"3-clay-montgomery-stores-1849-09-15", date:"1849-09-15", alt:130, x:A.plaza.x+160, z:A.plaza.z+60,
      note:"Clay/Montgomery store corridor Sept 1849 — the owner-segment cluster (Howard & Mellus, W. H. Davis, Dring)" }
  ];
  for(const s of SHOTS){
    await page.evaluate(iso=>window.__P1850.jump(iso),s.date); await settle(60);
    await page.evaluate(o=>window.__P1850.camSet({alt:o.alt,x:o.x,z:o.z,snap:true}),s); await settle(60);
    await page.evaluate(()=>{ for(let i=0;i<4;i++) window.__P1850.render(); }); await sleep(200);
    const subs=await page.evaluate(()=>window.__P1850.labelsSubtitles().filter(x=>x.active&&x.placed&&x.enriched).map(x=>x.name+" | "+x.sub));
    const dest=path.join(OUT,`${s.id}.png`);
    let ok=false; try{ await page.screenshot({path:dest}); ok=true; }catch(e){ console.log("shot error",e.message); }
    console.log(ok?"ok  ":"FAIL", path.basename(dest), "-", s.note);
    console.log("     placed enriched:", JSON.stringify(subs));
  }
  await browser.close(); srv.server.close();
})().catch(e=>{console.error("SHOTS CRASH:",e);process.exit(2);});
