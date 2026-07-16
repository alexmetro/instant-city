#!/usr/bin/env node
/* s110a overlay screenshots — loads atelier.html, arms the DRY-LAND EDGE +
   FLOATING ROADS overlay, jumps to dates + framings, captures the WebGL canvas.
   DEV-ONLY. Writes into app/screenings/2026-07-16-s110a/. */
"use strict";
const path=require("path"), http=require("http"), fs=require("fs");
const { chromium }=require("playwright");
const APP_ROOT=path.resolve(__dirname,"..","..");
const OUT=path.join(APP_ROOT,"screenings","2026-07-16-s110a");

const FRAMINGS=[
  { id:"town-1849-12-20",       date:"1849-12-20", alt:1000, x:260, z:120, note:"town+cove overview — dry-land edge + floating road grid" },
  { id:"waterfront-1849-12-20", date:"1849-12-20", alt:520,  x:260, z:-40, note:"north cove — Jackson/Washington/Clay overhang + wharf feet" },
  { id:"soma-1849-12-20",       date:"1849-12-20", alt:1200, x:520, z:1500,note:"SoMa / Mission Bay — numbered streets over water" },
  { id:"town-1848-04-01",       date:"1848-04-01", alt:1000, x:260, z:120, note:"earlier date — same scope, pre-Central-Wharf" }
];

function startServer(root){
  const MIME={".html":"text/html",".js":"text/javascript",".json":"application/json",".css":"text/css",".png":"image/png",".ico":"image/x-icon",".webmanifest":"application/manifest+json"};
  const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split("?")[0]); if(p==="/")p="/index.html"; const fp=path.join(root,p); if(!fp.startsWith(root)){res.writeHead(403);return res.end();} fs.readFile(fp,(e,b)=>{ if(e){res.writeHead(404);return res.end();} res.writeHead(200,{"Content-Type":MIME[path.extname(fp).toLowerCase()]||"application/octet-stream"}); res.end(b);});});
  return new Promise(r=>server.listen(0,"127.0.0.1",()=>r({server,port:server.address().port})));
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

(async ()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const srv=await startServer(APP_ROOT);
  const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--ignore-gpu-blocklist","--enable-webgl","--enable-unsafe-swiftshader","--disable-dev-shm-usage"]});
  const ctx=await browser.newContext({viewport:{width:1600,height:1000}});
  const page=await ctx.newPage();
  page.on("pageerror",e=>console.log("PAGEERROR",e.message));
  await page.goto(`http://127.0.0.1:${srv.port}/atelier.html`,{waitUntil:"load",timeout:60000});
  await page.waitForFunction(()=>{const v=document.getElementById("hud-loading");return v&&getComputedStyle(v).display==="none"&&window.__P1850&&window.__P1850_WBDRYLAND;},{timeout:45000});
  const settle=async(n=40)=>{await page.evaluate(k=>{for(let i=0;i<k;i++)window.__P1850.tick&&window.__P1850.tick(0.1);},n);await sleep(150);};
  // arm the overlay once
  const armed=await page.evaluate(()=>window.__P1850_WBDRYLAND(true));
  console.log("overlay armed:",JSON.stringify(armed));
  for(const f of FRAMINGS){
    await page.evaluate(iso=>window.__P1850.jump(iso),f.date);
    await settle(40);
    await page.evaluate(o=>{window.__P1850.camSet({alt:o.alt,x:o.x,z:o.z,snap:true});},f);
    await settle(40);
    await page.evaluate(()=>window.__P1850.render&&window.__P1850.render());
    await sleep(120);
    const dest=path.join(OUT,f.id+".png");
    let ok=false;
    try{ const c=await page.$("canvas"); if(c){ await c.screenshot({path:dest}); ok=true; } }catch(e){}
    console.log("SHOT",f.id,ok?"captured":"FAILED",dest);
  }
  await browser.close(); srv.server.close();
})();
